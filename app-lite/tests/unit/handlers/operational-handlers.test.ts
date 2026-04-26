import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/jobs/queue', () => ({
  enqueueJob: vi.fn().mockResolvedValue({ id: 'queued-job-1' }),
}))

vi.mock('../../../src/state-machine/orchestrator', () => ({
  transitionClient: vi.fn().mockResolvedValue({ success: true }),
}))

import {
  handleOnboarding,
  handleMonthlyReport,
  handleChurnCheck,
  handleSupportAutoReply,
  handleBillingRetry,
  handleSiteQa,
} from '../../../src/jobs/handlers/index'
import { enqueueJob } from '../../../src/jobs/queue'
import { transitionClient } from '../../../src/state-machine/orchestrator'

const mockedEnqueueJob = vi.mocked(enqueueJob)
const mockedTransitionClient = vi.mocked(transitionClient)

function createDb(overrides: Record<string, unknown> = {}) {
  return {
    find: vi.fn().mockResolvedValue({ totalDocs: 0, docs: [] }),
    findByID: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'record-1' }),
    update: vi.fn().mockResolvedValue({ id: 'record-1' }),
    delete: vi.fn().mockResolvedValue({ id: 'record-1' }),
    findGlobal: vi.fn().mockResolvedValue({}),
    updateGlobal: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as any
}

function makeJob(data: Record<string, unknown>) {
  return { id: 'job-1', data, attemptsMade: 0, maxAttempts: 3, name: 'test' } as any
}

describe('operational handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates onboarding records and queues the monthly report', async () => {
    const db = createDb({
      findByID: vi.fn().mockResolvedValue({
        id: 'client-1',
        businessName: 'Acme Plumbing',
        plan: 'growth',
        supportTier: 'tier2',
        onboardingData: { notes: 'ready' },
      }),
      find: vi.fn().mockResolvedValue({ totalDocs: 0, docs: [] }),
    })

    const result = await handleOnboarding(db, makeJob({ clientId: 'client-1' }))

    expect(result).toMatchObject({ status: 'completed', client_id: 'client-1' })
    expect(db.create).toHaveBeenCalledWith({
      collection: 'client-interactions',
      data: expect.objectContaining({
        client: 'client-1',
        message_type: 'welcome',
        support_tier: 'tier2',
      }),
    })
    expect(db.create).toHaveBeenCalledWith({
      collection: 'deployments',
      data: expect.objectContaining({
        client: 'client-1',
        type: 'initial_launch',
        status: 'building',
      }),
    })
    expect(mockedEnqueueJob).toHaveBeenCalledWith(db, 'monthly_report', { clientId: 'client-1' }, 30 * 24 * 60 * 60 * 1000)
  })

  it('creates monthly report drafts for active clients', async () => {
    const db = createDb({
      find: vi.fn().mockResolvedValue({
        totalDocs: 1,
        docs: [
          {
            id: 'client-2',
            businessName: 'Northside HVAC',
            status: 'active',
            supportTier: 'tier1',
          },
        ],
      }),
    })

    const result = await handleMonthlyReport(db, makeJob({}))

    expect(result).toMatchObject({ status: 'completed', clients_count: 1, reports_created: 1 })
    expect(db.create).toHaveBeenCalledWith({
      collection: 'client-interactions',
      data: expect.objectContaining({
        client: 'client-2',
        message_type: 'monthly_report',
        support_tier: 'tier1',
      }),
    })
  })

  it('flags churn risk and skips duplicate retention drafts', async () => {
    const db = createDb({
      find: vi
        .fn()
        .mockResolvedValueOnce({ totalDocs: 1, docs: [{ id: 'client-3', status: 'grace_period' }] })
        .mockResolvedValueOnce({ totalDocs: 1, docs: [{ id: 'client-4', status: 'active', updatedAt: '2025-01-01T00:00:00.000Z' }] })
        .mockResolvedValueOnce({ totalDocs: 0, docs: [] })
        .mockResolvedValueOnce({ totalDocs: 1, docs: [{ id: 'retention-1' }] }),
    })

    const result = await handleChurnCheck(db, makeJob({}))

    expect(result).toMatchObject({ status: 'completed', grace_period: 1, inactive: 1, retention_drafts_created: 1 })
    expect(db.create).toHaveBeenCalledTimes(1)
    expect(db.create).toHaveBeenCalledWith({
      collection: 'client-interactions',
      data: expect.objectContaining({
        client: 'client-3',
        message_type: 'retention',
        human_approved: true,
      }),
    })
  })

  it('escalates risky support requests and drafts normal replies', async () => {
    const escalationDb = createDb({
      findByID: vi.fn().mockResolvedValue({
        id: 'interaction-1',
        clientId: 'client-1',
        subject: 'Please cancel now',
        body: 'I will sue if this is not fixed',
        channel: 'email',
      }),
    })

    const normalDb = createDb({
      findByID: vi.fn().mockResolvedValue({
        id: 'interaction-2',
        client: 'client-2',
        subject: 'Help with a form',
        body: 'The form is not sending messages.',
        channel: 'email',
        supportTier: 'tier1',
      }),
    })

    const escalated = await handleSupportAutoReply(escalationDb, makeJob({ interactionId: 'interaction-1' }))
    const replied = await handleSupportAutoReply(normalDb, makeJob({ interactionId: 'interaction-2' }))

    expect(escalated).toMatchObject({ status: 'completed', escalated: true })
    expect(escalationDb.update).toHaveBeenCalledWith({
      collection: 'client-interactions',
      id: 'interaction-1',
      data: { status: 'escalated', support_tier: 'tier2' },
    })
    expect(replied).toMatchObject({ status: 'completed', escalated: false })
    expect(normalDb.create).toHaveBeenCalledWith({
      collection: 'client-interactions',
      data: expect.objectContaining({
        client: 'client-2',
        message_type: 'support_reply',
        human_approved: false,
      }),
    })
  })

  it('logs billing retries and advances to grace period on the last attempt', async () => {
    const db = createDb({
      findByID: vi.fn().mockResolvedValue({
        id: 'client-5',
        status: 'payment_failed',
        plan: 'growth',
      }),
    })

    const result = await handleBillingRetry(db, { ...makeJob({ clientId: 'client-5' }), attemptsMade: 2, maxAttempts: 3 })

    expect(result).toMatchObject({ status: 'completed', transitioned_to_grace_period: true })
    expect(db.create).toHaveBeenCalledWith({
      collection: 'client-interactions',
      data: expect.objectContaining({
        client: 'client-5',
        message_type: 'retention',
      }),
    })
    expect(mockedTransitionClient).toHaveBeenCalledWith(
      db,
      'client-5',
      'payment_failed',
      'grace_period',
      expect.objectContaining({
        triggeredBy: 'billing_retry',
        skipPolicy: true,
      }),
    )
  })

  it('records QA metadata and blocks isolated deployments when client content leaks', async () => {
    const passDb = createDb({
      findByID: vi.fn().mockResolvedValue({
        id: 'deployment-1',
        status: 'building',
        contentSnapshot: { business_name: 'Safe Build' },
      }),
    })

    const failDb = createDb({
      findByID: vi.fn().mockResolvedValue({
        id: 'deployment-2',
        status: 'building',
        contentSnapshot: { business_name: 'Leaking Build', client_name: 'Forbidden Co' },
      }),
    })

    const passed = await handleSiteQa(passDb, makeJob({ deploymentId: 'deployment-1', forbiddenClientNames: ['Forbidden Co'] }))
    const failed = await handleSiteQa(failDb, makeJob({ deploymentId: 'deployment-2', forbiddenClientNames: ['Forbidden Co'] }))

    expect(passed).toMatchObject({ status: 'completed', data_isolation_ok: true })
    expect(passDb.update).toHaveBeenCalledWith({
      collection: 'deployments',
      id: 'deployment-1',
      data: expect.objectContaining({
        status: 'building',
        data_isolation_ok: true,
      }),
    })

    expect(failed).toMatchObject({ status: 'completed', data_isolation_ok: false })
    expect(failDb.update).toHaveBeenCalledWith({
      collection: 'deployments',
      id: 'deployment-2',
      data: expect.objectContaining({
        status: 'failed',
        data_isolation_ok: false,
      }),
    })
  })
})

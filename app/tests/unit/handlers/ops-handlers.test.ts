import { describe, it, expect, vi } from 'vitest'
import { handleSupportAutoReply, handleBillingRetry, handleSiteQa } from '../../../src/jobs/handlers/index'

function mockDb(overrides: Record<string, any> = {}) {
  return {
    findByID: vi.fn().mockResolvedValue({ id: '1' }),
    create: vi.fn().mockResolvedValue({ id: '1' }),
    update: vi.fn().mockResolvedValue({ id: '1' }),
    find: vi.fn().mockResolvedValue({ totalDocs: 0, docs: [] }),
    ...overrides,
  } as any
}

function mockJob(data: Record<string, unknown> = {}) {
  return { id: 'job-1', data, attemptsMade: 0, maxAttempts: 3 } as any
}

describe('handleSupportAutoReply', () => {
  it('returns completed with interaction_id', async () => {
    const db = mockDb()
    const job = mockJob({ interactionId: 'int-1' })
    const result = await handleSupportAutoReply(db, job)
    expect(result.status).toBe('completed')
    expect(result.interaction_id).toBe('int-1')
  })

  it('notes skill execution required', async () => {
    const db = mockDb()
    const result = await handleSupportAutoReply(db, mockJob({ interactionId: 'int-1' }))
    expect(result.message).toContain('Skill execution required')
  })
})

describe('handleBillingRetry', () => {
  it('creates a client interaction for payment reminder', async () => {
    const db = mockDb()
    const job = mockJob({ clientId: 'client-1' })
    const result = await handleBillingRetry(db, job)

    expect(db.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'client-interactions',
        data: expect.objectContaining({
          client: 'client-1',
          direction: 'outbound',
          message_type: 'retention',
          subject: 'Payment Action Required',
        }),
      }),
    )
    expect(result.status).toBe('completed')
  })

  it('returns client_id in result', async () => {
    const db = mockDb()
    const result = await handleBillingRetry(db, mockJob({ clientId: 'client-1' }))
    expect(result.client_id).toBe('client-1')
  })
})

describe('handleSiteQa', () => {
  it('skips if deployment not found', async () => {
    const db = mockDb({
      findByID: vi.fn().mockRejectedValue(new Error('Not found')),
    })
    const job = mockJob({ deploymentId: 'nonexistent' })
    const result = await handleSiteQa(db, job)
    expect(result.status).toBe('skipped')
    expect(result.reason).toBe('Deployment not found')
  })

  it('returns completed when deployment exists', async () => {
    const db = mockDb()
    const job = mockJob({ deploymentId: 'deploy-1' })
    const result = await handleSiteQa(db, job)
    expect(result.status).toBe('completed')
    expect(result.deployment_id).toBe('deploy-1')
  })

  it('notes automated QA checks', async () => {
    const db = mockDb()
    const result = await handleSiteQa(db, mockJob({ deploymentId: 'deploy-1' }))
    expect(result.message).toContain('mobile layout')
    expect(result.message).toContain('data isolation')
  })
})

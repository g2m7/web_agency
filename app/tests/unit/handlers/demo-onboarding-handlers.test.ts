import { describe, it, expect, vi } from 'vitest'
import { handleDemoBuild, handleOnboarding } from '../../../src/jobs/handlers/index'

function mockDb(overrides: Record<string, any> = {}) {
  return {
    findByID: vi.fn().mockResolvedValue({ id: 'lead-1', status: 'replied_interested' }),
    create: vi.fn().mockResolvedValue({ id: 'deploy-1' }),
    find: vi.fn().mockResolvedValue({ totalDocs: 0, docs: [] }),
    update: vi.fn().mockResolvedValue({ id: '1' }),
    ...overrides,
  } as any
}

function mockJob(data: Record<string, unknown> = {}) {
  return { id: 'job-1', data, attemptsMade: 0, maxAttempts: 3 } as any
}

describe('handleDemoBuild', () => {
  it('creates deployment with building status', async () => {
    const db = mockDb()
    const job = mockJob({ leadId: 'lead-1' })
    const result = await handleDemoBuild(db, job)

    expect(db.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'deployments',
        data: expect.objectContaining({
          type: 'demo',
          status: 'building',
          data_isolation_ok: false,
          human_approved: false,
        }),
      }),
    )
    expect(result.deployment_id).toBe('deploy-1')
  })

  it('skips if lead not found', async () => {
    const db = mockDb({
      findByID: vi.fn().mockRejectedValue(new Error('Not found')),
    })
    const job = mockJob({ leadId: 'nonexistent' })
    const result = await handleDemoBuild(db, job)
    expect(result.status).toBe('skipped')
    expect(result.reason).toBe('Lead not found')
  })

  it('returns completed with lead_id and deployment_id', async () => {
    const db = mockDb()
    const result = await handleDemoBuild(db, mockJob({ leadId: 'lead-1' }))
    expect(result.status).toBe('completed')
    expect(result.lead_id).toBe('lead-1')
  })
})

describe('handleOnboarding', () => {
  it('skips if client not found', async () => {
    const db = mockDb({
      findByID: vi.fn().mockRejectedValue(new Error('Not found')),
    })
    const job = mockJob({ clientId: 'nonexistent' })
    const result = await handleOnboarding(db, job)
    expect(result.status).toBe('skipped')
    expect(result.reason).toBe('Client not found')
  })

  it('returns completed when no existing interactions', async () => {
    const db = mockDb()
    const job = mockJob({ clientId: 'client-1' })
    const result = await handleOnboarding(db, job)
    expect(result.status).toBe('completed')
    expect(result.client_id).toBe('client-1')
  })

  it('returns in-progress message when interactions exist', async () => {
    const db = mockDb({
      find: vi.fn().mockResolvedValue({ totalDocs: 1, docs: [{ id: 'ci-1' }] }),
    })
    const job = mockJob({ clientId: 'client-1' })
    const result = await handleOnboarding(db, job)
    expect(result.status).toBe('completed')
    expect(result.message).toContain('Onboarding in progress')
  })
})

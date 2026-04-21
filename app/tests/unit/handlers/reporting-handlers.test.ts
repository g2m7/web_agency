import { describe, it, expect, vi } from 'vitest'
import { handleMonthlyReport, handleChurnCheck } from '../../../src/jobs/handlers/index'

function mockDb(overrides: Record<string, any> = {}) {
  return {
    find: vi.fn().mockResolvedValue({ totalDocs: 0, docs: [] }),
    create: vi.fn().mockResolvedValue({ id: '1' }),
    ...overrides,
  } as any
}

function mockJob(data: Record<string, unknown> = {}) {
  return { id: 'job-1', data, attemptsMade: 0, maxAttempts: 3 } as any
}

describe('handleMonthlyReport', () => {
  it('queries active clients', async () => {
    const db = mockDb({
      find: vi.fn().mockResolvedValue({ totalDocs: 3, docs: [] }),
    })
    const result = await handleMonthlyReport(db, mockJob())

    expect(db.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'clients',
        where: { status: { equals: 'active' } },
      }),
    )
    expect(result.clients_count).toBe(3)
  })

  it('returns completed with client count', async () => {
    const db = mockDb()
    const result = await handleMonthlyReport(db, mockJob())
    expect(result.status).toBe('completed')
  })

  it('handles zero active clients', async () => {
    const db = mockDb({
      find: vi.fn().mockResolvedValue({ totalDocs: 0, docs: [] }),
    })
    const result = await handleMonthlyReport(db, mockJob())
    expect(result.clients_count).toBe(0)
  })
})

describe('handleChurnCheck', () => {
  it('queries at-risk clients in payment_failed, grace_period, suspended', async () => {
    const db = mockDb({
      find: vi.fn()
        .mockResolvedValueOnce({ totalDocs: 2, docs: [] })
        .mockResolvedValueOnce({ totalDocs: 1, docs: [] }),
    })
    const result = await handleChurnCheck(db, mockJob())

    expect(result.grace_period).toBe(2)
    expect(result.inactive).toBe(1)
    expect(result.at_risk_count).toBe(3)
  })

  it('returns zero when no at-risk clients', async () => {
    const db = mockDb({
      find: vi.fn()
        .mockResolvedValueOnce({ totalDocs: 0, docs: [] })
        .mockResolvedValueOnce({ totalDocs: 0, docs: [] }),
    })
    const result = await handleChurnCheck(db, mockJob())
    expect(result.at_risk_count).toBe(0)
  })

  it('returns completed status', async () => {
    const db = mockDb()
    const result = await handleChurnCheck(db, mockJob())
    expect(result.status).toBe('completed')
  })
})

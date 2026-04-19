import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleLeadGen, handleFollowUp1, handleFollowUp2 } from '../../../src/jobs/handlers/index'

function mockPayload(overrides: Record<string, any> = {}) {
  return {
    findGlobal: vi.fn().mockResolvedValue({
      active_niche: 'HVAC',
      active_cities: ['Austin', 'Denver'],
      current_phase: 5,
    }),
    find: vi.fn().mockResolvedValue({ totalDocs: 0, docs: [] }),
    findByID: vi.fn().mockResolvedValue({ id: 'lead-1', status: 'contacted' }),
    create: vi.fn().mockResolvedValue({ id: 'new-1' }),
    update: vi.fn().mockResolvedValue({ id: '1' }),
    delete: vi.fn().mockResolvedValue({ id: '1' }),
    ...overrides,
  } as any
}

function mockJob(data: Record<string, unknown> = {}) {
  return { id: 'job-1', data, attemptsMade: 0, opts: { attempts: 3 }, name: 'lead_gen' } as any
}

describe('handleLeadGen', () => {
  it('reads SystemConfig for niche and cities', async () => {
    const payload = mockPayload()
    const job = mockJob()
    const result = await handleLeadGen(payload, job)

    expect(payload.findGlobal).toHaveBeenCalledWith({ slug: 'system-config' })
    expect(result.niche).toBe('HVAC')
    expect(result.cities).toEqual(['Austin', 'Denver'])
  })

  it('returns leads_before count', async () => {
    const payload = mockPayload({
      find: vi.fn().mockResolvedValue({ totalDocs: 5, docs: [] }),
    })
    const result = await handleLeadGen(payload, mockJob())
    expect(result.leads_before).toBe(5)
  })

  it('returns completed status with job_id', async () => {
    const payload = mockPayload()
    const result = await handleLeadGen(payload, mockJob())
    expect(result.status).toBe('completed')
    expect(result.job_id).toBe('job-1')
  })
})

describe('handleFollowUp1', () => {
  it('skips if lead no longer in contacted status', async () => {
    const payload = mockPayload({
      findByID: vi.fn().mockResolvedValue({ id: 'lead-1', status: 'replied_interested' }),
    })
    const job = mockJob({ leadId: 'lead-1' })
    const result = await handleFollowUp1(payload, job)
    expect(result.status).toBe('skipped')
    expect(result.reason).toContain('no longer in contacted')
  })

  it('skips if lead not found', async () => {
    const payload = mockPayload({
      findByID: vi.fn().mockRejectedValue(new Error('Not found')),
    })
    const job = mockJob({ leadId: 'nonexistent' })
    const result = await handleFollowUp1(payload, job)
    expect(result.status).toBe('skipped')
  })

  it('returns completed when lead is contacted', async () => {
    const payload = mockPayload()
    const job = mockJob({ leadId: 'lead-1' })
    const result = await handleFollowUp1(payload, job)
    expect(result.status).toBe('completed')
    expect(result.lead_id).toBe('lead-1')
  })
})

describe('handleFollowUp2', () => {
  it('skips if lead no longer in contacted status', async () => {
    const payload = mockPayload({
      findByID: vi.fn().mockResolvedValue({ id: 'lead-1', status: 'archived' }),
    })
    const job = mockJob({ leadId: 'lead-1' })
    const result = await handleFollowUp2(payload, job)
    expect(result.status).toBe('skipped')
  })

  it('returns completed when lead is contacted', async () => {
    const payload = mockPayload()
    const job = mockJob({ leadId: 'lead-1' })
    const result = await handleFollowUp2(payload, job)
    expect(result.status).toBe('completed')
    expect(result.lead_id).toBe('lead-1')
  })
})

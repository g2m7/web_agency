import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

const dbState = vi.hoisted(() => ({ current: null as any }))

vi.mock('../../../src/db', () => ({
  getDb: () => dbState.current,
}))

import { scraperRoutes } from '../../../src/routes/scraper'

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    find: vi.fn().mockResolvedValue({ totalDocs: 0, docs: [] }),
    findByID: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'job-1' }),
    update: vi.fn().mockResolvedValue({ id: 'pair-1' }),
    delete: vi.fn().mockResolvedValue({}),
    findGlobal: vi.fn().mockResolvedValue({}),
    updateGlobal: vi.fn().mockResolvedValue({}),
    ...overrides,
  }
}

const app = new Hono()
app.route('/api/scraper', scraperRoutes)

async function jsonRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (!headers.has('content-type') && init.body) {
    headers.set('content-type', 'application/json')
  }

  return app.request(path, { ...init, headers })
}

describe('scraper pair routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbState.current = createMockDb()
  })

  it('lists pairs with filters and descending score sort', async () => {
    const result = {
      totalDocs: 1,
      docs: [{ id: 'pair-1', niche: 'pool services', city: 'Tampa', status: 'approved' }],
    }
    dbState.current.find.mockResolvedValueOnce(result)

    const res = await jsonRequest('/api/scraper/pairs?status=approved&city=Tam&niche=pool&limit=25')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(result)
    expect(dbState.current.find).toHaveBeenCalledWith({
      collection: 'niche-city-pairs',
      where: {
        and: [
          { status: { equals: 'approved' } },
          { city: { contains: 'Tam' } },
          { niche: { contains: 'pool' } },
        ],
      },
      limit: 25,
      sort: '-totalScore',
    })
  })

  it('scores and creates a new pair with validation guidance', async () => {
    const createdPair = { id: 'pair-1', status: 'candidate' }
    dbState.current.find.mockResolvedValueOnce({ totalDocs: 0, docs: [] })
    dbState.current.create.mockResolvedValueOnce(createdPair)

    const res = await jsonRequest('/api/scraper/pairs', {
      method: 'POST',
      body: JSON.stringify({
        niche: 'Pool Services',
        city: 'Tampa',
        state: 'FL',
        mapsCount: 62,
        reviewVelocity: 12,
        adCount: 1,
        agencyPages: 1,
        weakSitePct: 72,
        contactablePct: 74,
        economicSignal: 'growth',
      }),
    })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toEqual({ totalDocs: 1, docs: [createdPair] })
    expect(dbState.current.create).toHaveBeenCalledWith({
      collection: 'niche-city-pairs',
      data: expect.objectContaining({
        unique_key: 'pool-services:tampa:fl',
        city: 'Tampa',
        state: 'FL',
        niche: 'pool services',
        total_score: expect.any(Number),
        status: 'candidate',
        validation_data: {
          recommended_status: 'approved',
          threshold_reasons: [],
        },
      }),
    })
  })

  it('updates an existing pair instead of creating a duplicate', async () => {
    dbState.current.find.mockResolvedValueOnce({
      totalDocs: 1,
      docs: [{ id: 'pair-1', status: 'approved', notes: 'existing-notes' }],
    })
    dbState.current.update.mockResolvedValueOnce({ id: 'pair-1', status: 'approved' })

    const res = await jsonRequest('/api/scraper/pairs', {
      method: 'POST',
      body: JSON.stringify({
        niche: 'Pool Services',
        city: 'Tampa, FL',
        mapsCount: 45,
        weakSitePct: 55,
        contactablePct: 61,
        adCount: 2,
        agencyPages: 1,
      }),
    })

    expect(res.status).toBe(201)
    expect(dbState.current.update).toHaveBeenCalledWith({
      collection: 'niche-city-pairs',
      id: 'pair-1',
      data: expect.objectContaining({
        unique_key: 'pool-services:tampa:fl',
        status: 'approved',
        notes: 'existing-notes',
      }),
    })
    expect(dbState.current.create).not.toHaveBeenCalled()
  })

  it('keeps first-three decisions in validated status until human approved', async () => {
    dbState.current.findByID.mockResolvedValueOnce({
      id: 'pair-1',
      niche: 'pool services',
      city: 'Tampa',
      state: 'FL',
      mapsCount: 62,
      reviewVelocity: 12,
      adCount: 1,
      agencyPages: 1,
      weakSitePct: 72,
      contactablePct: 74,
      economicSignal: 'growth',
      validation_data: { previous: true },
    })
    dbState.current.find.mockResolvedValueOnce({ totalDocs: 2, docs: [] })
    dbState.current.update.mockResolvedValueOnce({
      id: 'pair-1',
      status: 'validated',
      validationData: { previous: true, human_review_required: true },
    })

    const res = await jsonRequest('/api/scraper/pairs/pair-1/decision', {
      method: 'POST',
      body: JSON.stringify({ decidedBy: 'operator@example.com' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.humanReviewRequired).toBe(true)
    expect(body.recommendedStatus).toBe('approved')
    expect(dbState.current.update).toHaveBeenCalledWith({
      collection: 'niche-city-pairs',
      id: 'pair-1',
      data: expect.objectContaining({
        status: 'validated',
        validation_data: expect.objectContaining({
          previous: true,
          recommended_status: 'approved',
          human_review_required: true,
          decided_by: 'operator@example.com',
        }),
      }),
    })
  })

  it('queues mini-validation scrapes for a specific pair and stores job metadata', async () => {
    dbState.current.findByID.mockResolvedValueOnce({
      id: 'pair-1',
      niche: 'Pool Services',
      city: 'Tampa',
      state: 'FL',
      validation_data: { seed: true },
    })
    dbState.current.create.mockResolvedValueOnce({ id: 'job-42' })
    dbState.current.update.mockResolvedValueOnce({ id: 'pair-1', lastScrapeJobId: 'job-42' })

    const res = await jsonRequest('/api/scraper/pairs/pair-1/validate', {
      method: 'POST',
      body: JSON.stringify({ maxResults: 18 }),
    })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toEqual({
      queued: true,
      jobId: 'job-42',
      jobType: 'lead_gen',
      runMode: 'mini_validation',
    })
    expect(dbState.current.create).toHaveBeenCalledWith({
      collection: 'jobs',
      data: expect.objectContaining({
        job_type: 'lead_gen',
        input_data: {
          pairs: [
            {
              id: 'pair-1',
              niche: 'pool services',
              city: 'Tampa',
              state: 'FL',
              maxResults: 18,
            },
          ],
          runMode: 'mini_validation',
          triggeredBy: 'pair_validation',
        },
      }),
    })
    expect(dbState.current.update).toHaveBeenCalledWith({
      collection: 'niche-city-pairs',
      id: 'pair-1',
      data: expect.objectContaining({
        last_scrape_job_id: 'job-42',
        validation_data: expect.objectContaining({
          seed: true,
          queued_job_id: 'job-42',
          max_results: 18,
        }),
      }),
    })
  })

  it('queues pair-scoped lead generation runs without mutating system config', async () => {
    dbState.current.create.mockResolvedValueOnce({ id: 'job-55' })

    const res = await jsonRequest('/api/scraper/run', {
      method: 'POST',
      body: JSON.stringify({
        pairIds: ['pair-1', 'pair-2'],
        maxResults: 40,
      }),
    })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toEqual({
      queued: true,
      jobId: 'job-55',
      jobType: 'lead_gen',
    })
    expect(dbState.current.updateGlobal).not.toHaveBeenCalled()
    expect(dbState.current.create).toHaveBeenCalledWith({
      collection: 'jobs',
      data: expect.objectContaining({
        job_type: 'lead_gen',
        input_data: {
          niche: undefined,
          cities: undefined,
          pairIds: ['pair-1', 'pair-2'],
          pairs: undefined,
          maxResults: 40,
        },
      }),
    })
  })
})

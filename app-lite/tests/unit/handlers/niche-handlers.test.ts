import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleNicheScore, handleNicheValidate } from '../../../src/jobs/handlers/index'
import type { ScrapedBusiness } from '../../../src/scraper/google-maps'

vi.mock('../../../src/scraper/google-maps', () => ({
  scrapeMultipleCities: vi.fn(),
  scrapeGoogleMaps: vi.fn(),
  parseCityState: (entry: string) => {
    const cleaned = entry.trim()
    const commaIdx = cleaned.lastIndexOf(',')
    if (commaIdx !== -1) {
      return { city: cleaned.substring(0, commaIdx).trim(), state: cleaned.substring(commaIdx + 1).trim() }
    }
    const parts = cleaned.split(/\s+/)
    if (parts.length >= 2 && parts[parts.length - 1]!.length === 2) {
      return { city: parts.slice(0, -1).join(' '), state: parts[parts.length - 1]! }
    }
    return { city: cleaned, state: '' }
  },
  buildNicheCityKey: (niche: string, city: string, name: string) =>
    `${niche.toLowerCase()}:${city.toLowerCase()}:${name.toLowerCase().trim()}`,
}))

vi.mock('../../../src/jobs/queue', () => ({
  enqueueJob: vi.fn().mockResolvedValue({ id: 'enrich-job-1' }),
}))

vi.mock('../../../src/scraper/email-enricher', () => ({
  enrichEmailFromWebsite: vi.fn(),
  computePriorityTier: (hasWebsite: boolean, hasPhone: boolean) => {
    if (hasWebsite && hasPhone) return 'hot'
    if (hasWebsite || hasPhone) return 'warm'
    return 'low'
  },
}))

vi.mock('../../../src/scraper/email-validator', () => ({
  validateEmail: vi.fn(),
}))

import { scrapeMultipleCities } from '../../../src/scraper/google-maps'
const mockedScrapeMultiple = vi.mocked(scrapeMultipleCities)

const MOCK_BUSINESSES: ScrapedBusiness[] = [
  {
    name: 'Tampa Pool Pros',
    address: '123 Main St, Tampa, FL 33602',
    phone: '(813) 555-1234',
    website: 'https://tampapoolpros.com',
    mapsUrl: 'https://www.google.com/maps/place/?q=place_id:0xaaa:0xbbb',
    rating: 4.8,
    reviewCount: 50,
    latitude: 27.9506,
    longitude: -82.4572,
    category: null,
    placeId: '0xaaa:0xbbb',
  },
  {
    name: 'Splash Pools',
    address: '456 Oak Ave, Tampa, FL 33603',
    phone: '(813) 555-5678',
    website: null,
    mapsUrl: 'https://www.google.com/maps/place/?q=place_id:0xccc:0xddd',
    rating: 4.2,
    reviewCount: 30,
    latitude: null,
    longitude: null,
    category: null,
    placeId: '0xccc:0xddd',
  },
]

function mockDb(overrides: Record<string, any> = {}) {
  return {
    findGlobal: vi.fn().mockResolvedValue({
      active_niche: 'pool services',
      active_cities: ['Tampa, FL'],
      current_phase: 2,
    }),
    find: vi.fn().mockResolvedValue({ totalDocs: 0, docs: [] }),
    findByID: vi.fn().mockResolvedValue({
      id: 'pair-1',
      city: 'Tampa',
      state: 'FL',
      niche: 'pool services',
      mapsCount: 55,
      reviewVelocity: 8,
      adCount: 1,
      agencyPages: 0,
      weakSitePct: 65,
      contactablePct: 75,
      economicSignal: 'growth',
      revenueEstimate: 'high',
      status: 'candidate',
    }),
    create: vi.fn().mockResolvedValue({ id: 'new-1' }),
    update: vi.fn().mockImplementation(async (params: any) => ({ id: params.id, ...params.data })),
    delete: vi.fn().mockResolvedValue({ id: '1' }),
    ...overrides,
  } as any
}

function mockJob(data: Record<string, unknown> = {}) {
  return { id: 'job-1', data, attemptsMade: 0, maxAttempts: 3, name: 'niche_score' } as any
}

describe('handleNicheScore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips when no pairId provided', async () => {
    const db = mockDb()
    const result = await handleNicheScore(db, mockJob({}))
    expect(result.status).toBe('skipped')
    expect(result.reason).toBe('No nicheCityPairId provided')
  })

  it('skips when pair not found', async () => {
    const db = mockDb({
      findByID: vi.fn().mockRejectedValue(new Error('not found')),
    })
    const result = await handleNicheScore(db, mockJob({ nicheCityPairId: 'missing-id' }))
    expect(result.status).toBe('skipped')
    expect(result.reason).toBe('Pair not found')
  })

  it('scores a pair and updates status to scored', async () => {
    const db = mockDb()
    const result = await handleNicheScore(db, mockJob({ nicheCityPairId: 'pair-1' }))

    expect(result.status).toBe('completed')
    expect(result.pair_id).toBe('pair-1')
    expect(result.scores).toBeDefined()

    // Verify it updated the pair
    expect(db.update).toHaveBeenCalledWith({
      collection: 'niche-city-pairs',
      id: 'pair-1',
      data: expect.objectContaining({
        status: 'scored',
        demand_score: expect.any(Number),
        competition_score: expect.any(Number),
        weakness_score: expect.any(Number),
        contact_score: expect.any(Number),
        revenue_score: expect.any(Number),
        total_score: expect.any(Number),
      }),
    })
  })

  it('computes correct scores for strong pair', async () => {
    const db = mockDb()
    const result = await handleNicheScore(db, mockJob({ nicheCityPairId: 'pair-1' }))

    const scores = result.scores as any
    expect(scores.demandScore).toBe(14)
    expect(scores.competitionScore).toBe(19)
    expect(scores.weaknessScore).toBe(16)
    expect(scores.contactScore).toBe(11)
    expect(scores.revenueScore).toBe(15)
    expect(scores.totalScore).toBe(75)
  })
})

describe('handleNicheValidate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips when no pairId provided', async () => {
    const db = mockDb()
    const result = await handleNicheValidate(db, mockJob({}))
    expect(result.status).toBe('skipped')
  })

  it('skips when pair not found', async () => {
    const db = mockDb({
      findByID: vi.fn().mockRejectedValue(new Error('not found')),
    })
    const result = await handleNicheValidate(db, mockJob({ nicheCityPairId: 'missing' }))
    expect(result.status).toBe('skipped')
  })

  it('scrapes leads and computes validation metrics', async () => {
    const db = mockDb({
      find: vi.fn()
        // Dedupe checks return 0
        .mockResolvedValueOnce({ totalDocs: 0, docs: [] })
        .mockResolvedValueOnce({ totalDocs: 0, docs: [] })
        // Final pair leads query
        .mockResolvedValueOnce({
          totalDocs: 2,
          docs: [
            { id: 'l1', email: null, phone: '555-1234', websiteUrl: 'https://site.com' },
            { id: 'l2', email: null, phone: null, websiteUrl: null },
          ],
        }),
    })

    mockedScrapeMultiple.mockResolvedValueOnce(
      new Map([['Tampa, FL', MOCK_BUSINESSES]]),
    )

    const result = await handleNicheValidate(db, mockJob({ nicheCityPairId: 'pair-1' }))

    expect(result.status).toBe('completed')
    expect(result.leads_created).toBe(2)
    expect(result.validation).toBeDefined()

    // Should update pair status to validated
    expect(db.update).toHaveBeenCalledWith({
      collection: 'niche-city-pairs',
      id: 'pair-1',
      data: expect.objectContaining({
        status: 'validated',
        validation_leads: expect.any(Number),
        validation_contactable_pct: expect.any(Number),
        validation_weak_pct: expect.any(Number),
      }),
    })
  })

  it('tags created leads with pair ID', async () => {
    const db = mockDb({
      find: vi.fn()
        .mockResolvedValueOnce({ totalDocs: 0, docs: [] })
        .mockResolvedValue({ totalDocs: 0, docs: [] }),
    })
    mockedScrapeMultiple.mockResolvedValueOnce(
      new Map([['Tampa, FL', [MOCK_BUSINESSES[0]!]]]),
    )

    await handleNicheValidate(db, mockJob({ nicheCityPairId: 'pair-1' }))

    expect(db.create).toHaveBeenCalledWith({
      collection: 'leads',
      data: expect.objectContaining({
        nicheCityPairId: 'pair-1',
        niche: 'pool services',
        city: 'Tampa',
        state: 'FL',
      }),
    })
  })

  it('handles scraper errors gracefully', async () => {
    const db = mockDb({
      find: vi.fn().mockResolvedValue({ totalDocs: 0, docs: [] }),
    })
    mockedScrapeMultiple.mockRejectedValueOnce(new Error('Network timeout'))

    const result = await handleNicheValidate(db, mockJob({ nicheCityPairId: 'pair-1' }))

    expect(result.status).toBe('completed')
    expect((result.errors as string[]).length).toBe(1)
    expect((result.errors as string[])[0]).toContain('Network timeout')
  })

  it('skips duplicate leads during validation', async () => {
    const db = mockDb({
      find: vi.fn()
        // First biz: already exists
        .mockResolvedValueOnce({ totalDocs: 1, docs: [{ id: 'existing' }] })
        // Second biz: new
        .mockResolvedValueOnce({ totalDocs: 0, docs: [] })
        // Pair leads query
        .mockResolvedValueOnce({ totalDocs: 1, docs: [{ id: 'l1', phone: '555', websiteUrl: 'http://x.com' }] }),
    })
    mockedScrapeMultiple.mockResolvedValueOnce(
      new Map([['Tampa, FL', MOCK_BUSINESSES]]),
    )

    const result = await handleNicheValidate(db, mockJob({ nicheCityPairId: 'pair-1' }))

    expect(result.leads_created).toBe(1)
    expect(result.leads_skipped).toBe(1)
  })
})

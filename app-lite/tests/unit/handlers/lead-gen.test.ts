import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleLeadGen } from '../../../src/jobs/handlers/index'
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
    if (hasWebsite) return 'warm'
    return 'low'
  },
}))

import { scrapeMultipleCities } from '../../../src/scraper/google-maps'
const mockedScrapeMultiple = vi.mocked(scrapeMultipleCities)

const MOCK_BUSINESSES: ScrapedBusiness[] = [
  {
    name: "John's HVAC",
    address: '123 Main St, Austin, TX 78701',
    phone: '(512) 555-1234',
    website: 'https://johnshvac.com',
    mapsUrl: 'https://www.google.com/maps/place/?q=place_id:0xaaa:0xbbb',
    rating: 4.8,
    reviewCount: 127,
    latitude: 30.2672,
    longitude: -97.7431,
    category: null,
    placeId: '0xaaa:0xbbb',
  },
  {
    name: 'Cool Air Austin',
    address: '456 Oak Ave, Austin, TX 78702',
    phone: '(512) 555-5678',
    website: null,
    mapsUrl: 'https://www.google.com/maps/place/?q=place_id:0xccc:0xddd',
    rating: 4.5,
    reviewCount: 89,
    latitude: null,
    longitude: null,
    category: null,
    placeId: '0xccc:0xddd',
  },
]

function mockDb(overrides: Record<string, any> = {}) {
  return {
    findGlobal: vi.fn().mockResolvedValue({
      active_niche: 'hvac',
      active_cities: ['Austin, TX'],
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
  return { id: 'job-1', data, attemptsMade: 0, maxAttempts: 3, name: 'lead_gen' } as any
}

function singleCityResult(city: string, state: string, businesses: ScrapedBusiness[]): Map<string, ScrapedBusiness[]> {
  const m = new Map<string, ScrapedBusiness[]>()
  m.set(`${city}, ${state}`, businesses)
  return m
}

describe('handleLeadGen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads SystemConfig for niche and cities', async () => {
    const db = mockDb()
    mockedScrapeMultiple.mockResolvedValueOnce(new Map())
    const result = await handleLeadGen(db, mockJob())

    expect(db.findGlobal).toHaveBeenCalledWith({ slug: 'system-config' })
    expect(result.niche).toBe('hvac')
    expect(result.cities).toEqual(['Austin, TX'])
  })

  it('returns leads_before count', async () => {
    const db = mockDb({
      find: vi.fn()
        .mockResolvedValueOnce({ totalDocs: 5, docs: [] })
        .mockResolvedValue({ totalDocs: 0, docs: [] }),
    })
    mockedScrapeMultiple.mockResolvedValueOnce(new Map())
    const result = await handleLeadGen(db, mockJob())
    expect(result.leads_before).toBe(5)
  })

  it('creates leads from scraped businesses', async () => {
    const db = mockDb()
    mockedScrapeMultiple.mockResolvedValueOnce(singleCityResult('Austin', 'TX', MOCK_BUSINESSES))

    const result = await handleLeadGen(db, mockJob())

    expect(result.status).toBe('completed')
    expect(result.leads_created).toBe(2)
    expect(db.create).toHaveBeenCalledTimes(2)
  })

  it('skips leads that already exist', async () => {
    const db = mockDb({
      find: vi.fn()
        .mockResolvedValueOnce({ totalDocs: 0, docs: [] })
        .mockResolvedValueOnce({ totalDocs: 1, docs: [{ id: 'existing' }] })
        .mockResolvedValue({ totalDocs: 0, docs: [] }),
    })
    mockedScrapeMultiple.mockResolvedValueOnce(singleCityResult('Austin', 'TX', MOCK_BUSINESSES))

    const result = await handleLeadGen(db, mockJob())

    expect(result.leads_created).toBe(1)
    expect(result.leads_skipped).toBe(1)
  })

  it('records errors when scraper fails', async () => {
    const db = mockDb()
    mockedScrapeMultiple.mockRejectedValueOnce(new Error('Consent page detected'))

    const result = await handleLeadGen(db, mockJob())

    expect(result.status).toBe('completed')
    expect((result as any).errors.length).toBe(1)
    expect((result as any).errors[0]).toContain('Consent page detected')
    expect(result.leads_created).toBe(0)
  })

  it('handles multiple cities', async () => {
    const db = mockDb({
      findGlobal: vi.fn().mockResolvedValue({
        active_niche: 'hvac',
        active_cities: ['Austin, TX', 'Denver, CO'],
        current_phase: 5,
      }),
    })
    const results = new Map<string, ScrapedBusiness[]>()
    results.set('Austin, TX', [MOCK_BUSINESSES[0]!])
    results.set('Denver, CO', [MOCK_BUSINESSES[1]!])
    mockedScrapeMultiple.mockResolvedValueOnce(results)

    const result = await handleLeadGen(db, mockJob())

    expect(mockedScrapeMultiple).toHaveBeenCalledTimes(1)
    expect(result.leads_created).toBe(2)
  })

  it('handles unique constraint violation as skip', async () => {
    const db = mockDb({
      create: vi.fn().mockRejectedValueOnce(new Error('unique constraint violation')),
    })
    mockedScrapeMultiple.mockResolvedValueOnce(singleCityResult('Austin', 'TX', [MOCK_BUSINESSES[0]!]))

    const result = await handleLeadGen(db, mockJob())

    expect(result.leads_skipped).toBe(1)
    expect(result.leads_created).toBe(0)
  })

  it('creates leads with correct field values', async () => {
    const db = mockDb()
    mockedScrapeMultiple.mockResolvedValueOnce(singleCityResult('Austin', 'TX', [MOCK_BUSINESSES[0]!]))

    await handleLeadGen(db, mockJob())

    expect(db.create).toHaveBeenCalledWith({
      collection: 'leads',
      data: expect.objectContaining({
        businessName: "John's HVAC",
        niche: 'hvac',
        city: 'Austin',
        state: 'TX',
        phone: '(512) 555-1234',
        websiteUrl: 'https://johnshvac.com',
        source: 'google_maps',
        status: 'new',
      }),
    })
  })
})

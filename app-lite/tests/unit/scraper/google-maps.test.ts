import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  parseSearchResults,
  parseBusinessListings,
  buildSearchUrl,
  parseCityState,
  buildNicheCityKey,
  scrapeGoogleMaps,
  scrapeMultipleCities,
} from '../../../src/scraper/google-maps'

const FIXTURES_DIR = join(__dirname, '..', '..', 'fixtures')

function makeMockBiz(overrides: Partial<{ title: string; dataId: string; website: string; phone: string }> = {}) {
  const b = new Array(180).fill(null)
  b[0] = "id123"
  b[2] = ["Eakou 74", "Ilion 131 22", "Greece"]
  b[4] = [null, null, null, ["reviews link"], null, null, null, 4.8, 48]
  b[7] = overrides.website ? [overrides.website] : ["https://www.dreamcoffee.gr", "dreamcoffee.gr"]
  b[9] = [null, null, 38.0331931, 23.7094475]
  b[10] = overrides.dataId ?? "0x14a1a32f316b15a1:0x169c54b46dcc3a93"
  b[11] = overrides.title ?? "Dream Coffee"
  b[13] = ["Coffee shop"]
  b[178] = overrides.phone ? [[overrides.phone]] : [["210 123 4567"]]

  const outer = new Array(15).fill(null)
  outer[14] = b
  return outer
}

const MOCK_SEARCH_JSON = JSON.stringify([
  [
    "query",
    [
      null,
      makeMockBiz(),
    ]
  ]
])

const MOCK_HTML = `
window.APP_INITIALIZATION_STATE=[
[null,null,[[[null,null,30.2672,-97.7431]]]],
"0x8640c7b8e4b8f7e1:0xabcdef1234567890",
[null,null,
  "John's HVAC Services",
  null,
  null,
  "123 Main St, Austin, TX 78701",
  "(512) 555-1234",
  "https://www.johnshvac.com",
  4.8,
  "(127)",
  null,
  [null,null,30.2672,-97.7431]
],
];
`

function mockFetch(jsonBody: string, status = 200) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => `)]}'\n${jsonBody}`,
    headers: new Map([['set-cookie', 'NID=test123; path=/; domain=.google.com']]),
  }))
}

// ── parseSearchResults (new JSON API parser) ──

describe('parseSearchResults', () => {
  it('extracts businesses from structured JSON', () => {
    const results = parseSearchResults(MOCK_SEARCH_JSON)
    expect(results.length).toBe(1)

    const biz = results[0]!
    expect(biz.name).toBe('Dream Coffee')
    expect(biz.address).toContain('Eakou 74')
    expect(biz.address).toContain('Ilion 131 22')
    expect(biz.rating).toBe(4.8)
    expect(biz.reviewCount).toBe(48)
    expect(biz.latitude).toBe(38.0331931)
    expect(biz.longitude).toBe(23.7094475)
    expect(biz.category).toBe('Coffee shop')
    expect(biz.placeId).toBe('0x14a1a32f316b15a1:0x169c54b46dcc3a93')
    expect(biz.website).toBe('https://www.dreamcoffee.gr')
    expect(biz.phone).toBe('2101234567')
    expect(biz.mapsUrl).toContain('place_id:0x14a1a32f316b15a1')
  })

  it('parses real Google Maps fixture data', () => {
    const raw = readFileSync(join(FIXTURES_DIR, 'gm-search-results.json'), 'utf-8')
    const jsonStr = raw.trimStart().startsWith(')') ? raw.substring(raw.indexOf('\n') + 1) : raw
    const results = parseSearchResults(jsonStr)

    expect(results.length).toBeGreaterThan(0)

    for (const biz of results) {
      expect(biz.name.length).toBeGreaterThan(0)
      expect(biz.mapsUrl).toContain('google.com/maps/place/')
    }
  })

  it('returns empty array for invalid JSON', () => {
    expect(parseSearchResults('not json')).toEqual([])
  })

  it('returns empty array for empty JSON array', () => {
    expect(parseSearchResults('[]')).toEqual([])
  })

  it('returns empty array for wrong structure', () => {
    expect(parseSearchResults('[null]')).toEqual([])
  })

  it('deduplicates by name', () => {
    const dupJson = JSON.stringify([
      ["q", [null, makeMockBiz({ title: "Same Name" }), makeMockBiz({ title: "Same Name" })]]
    ])
    const results = parseSearchResults(dupJson)
    expect(results.length).toBe(1)
  })

  it('extracts /url?q= website URLs correctly', () => {
    const json = JSON.stringify([
      ["q", [null, makeMockBiz({ website: "/url?q=https://example.com&q1=foo" })]]
    ])
    const results = parseSearchResults(json)
    expect(results[0]!.website).toBe('https://example.com')
  })
})

// ── parseBusinessListings (legacy HTML parser) ──

describe('parseBusinessListings', () => {
  it('extracts businesses from legacy HTML', () => {
    const results = parseBusinessListings(MOCK_HTML, 'Austin', 'TX')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0]!.name).toContain('HVAC')
  })

  it('returns empty for empty HTML', () => {
    expect(parseBusinessListings('', 'Austin', 'TX')).toEqual([])
  })
})

// ── buildSearchUrl ──

describe('buildSearchUrl', () => {
  it('builds tbm=map URL with query and pb param', () => {
    const url = buildSearchUrl('hvac in Austin TX')
    expect(url).toContain('maps.google.com/search')
    expect(url).toContain('tbm=map')
    expect(url).toContain('q=hvac')
    expect(url).toContain('pb=')
    expect(url).toContain('hl=en')
  })

  it('uses provided lat/lon/zoom', () => {
    const url = buildSearchUrl('test', 30.2672, -97.7431, 12)
    expect(url).toContain('30.2672')
    expect(url).toContain('-97.7431')
  })
})

// ── parseCityState ──

describe('parseCityState', () => {
  it('parses "Austin, TX" format', () => {
    const { city, state } = parseCityState('Austin, TX')
    expect(city).toBe('Austin')
    expect(state).toBe('TX')
  })

  it('parses "San Antonio, TX"', () => {
    const { city, state } = parseCityState('San Antonio, TX')
    expect(city).toBe('San Antonio')
    expect(state).toBe('TX')
  })

  it('parses "New York NY" space-separated', () => {
    const { city, state } = parseCityState('New York NY')
    expect(city).toBe('New York')
    expect(state).toBe('NY')
  })

  it('handles city without state', () => {
    const { city, state } = parseCityState('London')
    expect(city).toBe('London')
    expect(state).toBe('')
  })

  it('trims whitespace', () => {
    const { city, state } = parseCityState('  Austin , TX ')
    expect(city).toBe('Austin')
    expect(state).toBe('TX')
  })
})

// ── buildNicheCityKey ──

describe('buildNicheCityKey', () => {
  it('builds lowercase colon-separated key', () => {
    expect(buildNicheCityKey('HVAC', 'Austin', "John's HVAC")).toBe("hvac:austin:john's hvac")
  })

  it('normalizes whitespace in business name', () => {
    expect(buildNicheCityKey('hvac', 'Austin', 'Cool  Air   Austin')).toBe('hvac:austin:cool air austin')
  })
})

// ── scrapeGoogleMaps (integration with mock fetch) ──

describe('scrapeGoogleMaps', () => {
  it('returns parsed businesses from API response', async () => {
    const fetchFn = mockFetch(MOCK_SEARCH_JSON)
    const results = await scrapeGoogleMaps('coffee', 'Athens', 'GR', {
      fetchFn,
      interRequestDelayMs: [50, 100],
    })

    expect(results.length).toBe(1)
    expect(results[0]!.name).toBe('Dream Coffee')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('retries on rate limit (429)', async () => {
    const failRes = { ok: false, status: 429, text: async () => '', headers: new Map() }
    const okRes = {
      ok: true,
      status: 200,
      text: async () => `)]}'\n${MOCK_SEARCH_JSON}`,
      headers: new Map(),
    }

    const fetchFn = vi.fn().mockResolvedValueOnce(failRes).mockResolvedValueOnce(okRes)

    const results = await scrapeGoogleMaps('coffee', 'Athens', 'GR', {
      fetchFn,
      maxRetries: 1,
      retryBaseDelayMs: 50,
      interRequestDelayMs: [50, 100],
    })

    expect(results.length).toBe(1)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('throws after exhausting retries', async () => {
    const blockRes = { ok: true, status: 200, text: async () => 'detected unusual traffic', headers: new Map() }
    const fetchFn = vi.fn().mockResolvedValue(blockRes)

    await expect(
      scrapeGoogleMaps('coffee', 'Athens', 'GR', {
        fetchFn,
        maxRetries: 2,
        retryBaseDelayMs: 50,
        interRequestDelayMs: [50, 100],
      }),
    ).rejects.toThrow()

    expect(fetchFn).toHaveBeenCalledTimes(3)
  })

  it('throws on abort signal', async () => {
    const fetchFn = mockFetch(MOCK_SEARCH_JSON)
    const controller = new AbortController()
    controller.abort()

    await expect(
      scrapeGoogleMaps('coffee', 'Athens', 'GR', {
        fetchFn,
        signal: controller.signal,
        interRequestDelayMs: [50, 100],
      }),
    ).rejects.toThrow()
  })
})

// ── scrapeMultipleCities ──

describe('scrapeMultipleCities', () => {
  it('scrapes multiple cities with shared session', async () => {
    const fetchFn = mockFetch(MOCK_SEARCH_JSON)
    const cities = [
      { city: 'Austin', state: 'TX' },
      { city: 'Denver', state: 'CO' },
    ]

    const results = await scrapeMultipleCities('hvac', cities, {
      fetchFn,
      maxRequestsPerMinute: 60,
      interRequestDelayMs: [50, 100],
    })

    expect(results.size).toBe(2)
    expect(results.has('Austin, TX')).toBe(true)
    expect(results.has('Denver, CO')).toBe(true)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('continues on single city failure', async () => {
    const failRes = { ok: false, status: 500, text: async () => 'error', headers: new Map() }
    const okRes = {
      ok: true,
      status: 200,
      text: async () => `)]}'\n${MOCK_SEARCH_JSON}`,
      headers: new Map(),
    }

    const fetchFn = vi.fn().mockResolvedValueOnce(failRes).mockResolvedValueOnce(okRes)

    const cities = [
      { city: 'FailCity', state: 'TX' },
      { city: 'Austin', state: 'TX' },
    ]

    const results = await scrapeMultipleCities('hvac', cities, {
      fetchFn,
      maxRetries: 0,
      maxRequestsPerMinute: 60,
      interRequestDelayMs: [50, 100],
    })

    expect(results.size).toBe(2)
    expect(results.get('FailCity, TX')).toEqual([])
    expect(results.get('Austin, TX')!.length).toBe(1)
  })
})

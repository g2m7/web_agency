import { describe, it, expect } from 'vitest'
import {
  parseBusinessListings,
  buildSearchUrl,
  parseCityState,
  buildNicheCityKey,
} from '../../../src/scraper/google-maps'

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
"0x8640c7b8e4b8f7e2:0xbcdef12345678901",
[null,null,
  "Cool Air Austin",
  null,
  null,
  "456 Oak Ave, Austin, TX 78702",
  "(512) 555-5678",
  "https://www.coolairaustin.com",
  4.5,
  "(89)",
  null,
  [null,null,30.2712,-97.7381]
],
"0x8640c7b8e4b8f7e3:0xcdef123456789012",
[null,null,
  "Austin Heating & Cooling LLC",
  null,
  null,
  "789 Pine Rd, Austin, TX 78703",
  "(512) 555-9012",
  null,
  3.9,
  "(34)",
  null,
  [null,null,30.2981,-97.7511]
]
];
`

describe('parseBusinessListings', () => {
  it('extracts businesses from mock Google Maps HTML', () => {
    const results = parseBusinessListings(MOCK_HTML, 'Austin', 'TX')
    expect(results.length).toBeGreaterThanOrEqual(3)

    const johns = results.find((b) => b.name.includes('HVAC'))
    expect(johns).toBeDefined()
    expect(johns!.placeId).toContain('0x8640c7b8e4b8f7e1')
  })

  it('extracts phone numbers', () => {
    const results = parseBusinessListings(MOCK_HTML, 'Austin', 'TX')
    const withPhone = results.filter((b) => b.phone !== null)
    expect(withPhone.length).toBeGreaterThanOrEqual(2)
  })

  it('extracts websites', () => {
    const results = parseBusinessListings(MOCK_HTML, 'Austin', 'TX')
    const withWebsite = results.filter((b) => b.website !== null)
    expect(withWebsite.length).toBeGreaterThanOrEqual(2)
  })

  it('extracts coordinates', () => {
    const results = parseBusinessListings(MOCK_HTML, 'Austin', 'TX')
    const withCoords = results.filter((b) => b.latitude !== null && b.longitude !== null)
    expect(withCoords.length).toBeGreaterThanOrEqual(1)
  })

  it('deduplicates businesses by name', () => {
    const dupHtml = `
    "0xaaaaaa0000000000:0xbbbbbb0000000000", [null,"Same Business Name","addr","(512) 111-2222"],
    "0xcccccc0000000000:0xdddddd0000000000", [null,"Same Business Name","addr2","(512) 333-4444"],
    `
    const results = parseBusinessListings(dupHtml, 'Austin', 'TX')
    const sameName = results.filter((b) => b.name === 'Same Business Name')
    expect(sameName.length).toBe(1)
  })

  it('returns empty array for empty HTML', () => {
    expect(parseBusinessListings('', 'Austin', 'TX')).toEqual([])
  })

  it('returns empty array for HTML without place IDs', () => {
    expect(parseBusinessListings('<html><body>Hello</body></html>', 'Austin', 'TX')).toEqual([])
  })

  it('builds correct maps URL from place ID', () => {
    const results = parseBusinessListings(MOCK_HTML, 'Austin', 'TX')
    const first = results[0]
    expect(first).toBeDefined()
    expect(first!.mapsUrl).toContain('google.com/maps/place/')
    expect(first!.mapsUrl).toContain('place_id:')
  })
})

describe('buildSearchUrl', () => {
  it('builds URL with encoded query and params', () => {
    const url = buildSearchUrl('hvac', 'Austin', 'TX')
    expect(url).toContain('google.com/maps/search/')
    expect(url).toContain('hl=en')
    expect(url).toContain('gl=us')
  })

  it('handles multi-word niches', () => {
    const url = buildSearchUrl('hvac contractor', 'San Antonio', 'TX')
    expect(url).toContain('hvac%20contractor')
  })
})

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

describe('buildNicheCityKey', () => {
  it('builds lowercase colon-separated key', () => {
    expect(buildNicheCityKey('HVAC', 'Austin', "John's HVAC")).toBe("hvac:austin:john's hvac")
  })

  it('normalizes whitespace in business name', () => {
    expect(buildNicheCityKey('hvac', 'Austin', 'Cool  Air   Austin')).toBe('hvac:austin:cool air austin')
  })
})

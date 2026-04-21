import { randomUUID } from 'crypto'

export interface ScrapedBusiness {
  name: string
  address: string
  phone: string | null
  website: string | null
  mapsUrl: string
  rating: number | null
  reviewCount: number | null
  latitude: number | null
  longitude: number | null
  category: string | null
  placeId: string | null
}

export interface ScraperOptions {
  maxResults?: number
  signal?: AbortSignal
  fetchFn?: typeof fetch
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
]

const SEC_CH_UA = [
  '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
  '"Firefox";v="133", "Gecko";v="20100101"',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function buildHeaders(): Record<string, string> {
  const ua = pickRandom(USER_AGENTS)
  const isChrome = ua.includes('Chrome')
  const isFirefox = ua.includes('Firefox')

  const headers: Record<string, string> = {
    'User-Agent': ua,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    Referer: 'https://www.google.com/',
    'Upgrade-Insecure-Requests': '1',
  }

  if (isChrome) {
    headers['Sec-Ch-Ua'] = pickRandom(SEC_CH_UA)
    headers['Sec-Ch-Ua-Mobile'] = '?0'
    headers['Sec-Ch-Ua-Platform'] = ua.includes('Windows') ? '"Windows"' : ua.includes('Mac') ? '"macOS"' : '"Linux"'
    headers['Sec-Fetch-Dest'] = 'document'
    headers['Sec-Fetch-Mode'] = 'navigate'
    headers['Sec-Fetch-Site'] = 'none'
    headers['Sec-Fetch-User'] = '?1'
  }

  return headers
}

export function buildSearchUrl(niche: string, city: string, state: string): string {
  const query = encodeURIComponent(`${niche} in ${city} ${state}`)
  return `https://www.google.com/maps/search/${query}?hl=en&gl=us`
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function randomDelay(min = 1500, max = 4500): Promise<void> {
  return sleep(min + Math.random() * (max - min))
}

// ── Parsing ──────────────────────────────────────────────────

const PLACE_ID_RE = /0x[a-f0-9]{6,20}:0x[a-f0-9]{6,20}/g
const CHIJ_ID_RE = /ChIJ[A-Za-z0-9_-]{20,}/g
const PHONE_RE = /\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/
const URL_RE = /https?:\/\/(?!maps\.google\.com|www\.google\.com|goo\.gl|googleusercontent)[^\s"'<>,\]]+/
const ADDR_RE = /\d+\s+[A-Za-z][A-Za-z\s.]+,?\s*[A-Za-z][A-Za-z\s.]+,?\s*[A-Z]{2}\s+\d{5}(-\d{4})?/
const CITY_STATE_RE = /[A-Za-z][A-Za-z\s.]+,?\s*[A-Z]{2}\s+\d{5}/
const RATING_RE = /(\d\.\d)\s*\((\d[\d,]*)\)/
const COORD_RE = /(-?\d{1,3}\.\d{4,8})\s*,\s*(-?\d{1,3}\.\d{4,8})/
const ZIP_RE = /\d{5}(-\d{4})?/

function extractBusinessNames(text: string): string[] {
  const results: string[] = []
  const re = /"([A-Z][A-Za-z'&.\- ]{2,80})"/g
  let m
  while ((m = re.exec(text)) !== null) {
    results.push(m[1]!.trim())
  }
  return results
}

function extractBusinessFromChunk(
  chunk: string,
  placeId: string,
  queryCity: string,
  queryState: string,
): ScrapedBusiness | null {
  const names = extractBusinessNames(chunk)
  const name = names.length > 0 ? names[0]! : null
  if (!name) return null

  const phoneMatch = chunk.match(PHONE_RE)
  const phone = phoneMatch ? phoneMatch[0] : null

  const websiteMatch = chunk.match(URL_RE)
  const website = websiteMatch ? websiteMatch[0].replace(/["')\]]+$/, '') : null

  const addrMatch = chunk.match(ADDR_RE)
  let address: string | null = null
  if (addrMatch) {
    address = addrMatch[0]
  } else {
    const csMatch = chunk.match(CITY_STATE_RE)
    if (csMatch) address = csMatch[0]
  }
  if (!address) address = `${queryCity}, ${queryState}`

  const ratingMatch = chunk.match(RATING_RE)
  const rating = ratingMatch ? parseFloat(ratingMatch[1]!) : null
  const reviewCount = ratingMatch ? parseInt(ratingMatch[2]!.replace(/,/g, '')) : null

  const coordMatch = chunk.match(COORD_RE)
  let latitude: number | null = null
  let longitude: number | null = null
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]!)
    const lng = parseFloat(coordMatch[2]!)
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      latitude = lat
      longitude = lng
    }
  }

  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`

  return {
    name: name.replace(/\s+/g, ' ').trim(),
    address: address.replace(/\s+/g, ' ').trim(),
    phone,
    website,
    mapsUrl,
    rating: rating && rating >= 1 && rating <= 5 ? rating : null,
    reviewCount,
    latitude,
    longitude,
    category: null,
    placeId,
  }
}

export function parseBusinessListings(html: string, city: string, state: string): ScrapedBusiness[] {
  const businesses: ScrapedBusiness[] = []

  const hexIds = [...new Set(html.match(PLACE_ID_RE) || [])]

  for (const placeId of hexIds) {
    const idx = html.indexOf(placeId)
    if (idx === -1) continue

    const start = idx
    const end = Math.min(html.length, idx + 8000)
    const chunk = html.substring(start, end)

    const biz = extractBusinessFromChunk(chunk, placeId, city, state)
    if (biz && biz.name.length >= 3 && !biz.name.match(/^[\d\s.]+$/)) {
      businesses.push(biz)
    }
  }

  const seen = new Set<string>()
  return businesses.filter((b) => {
    const key = b.name.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Fetch + scrape ───────────────────────────────────────────

async function fetchSearchPage(
  url: string,
  fetchFn: typeof fetch,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetchFn(url, {
    headers: buildHeaders(),
    redirect: 'follow',
    signal,
  })

  if (!res.ok) {
    throw new Error(`Google Maps returned HTTP ${res.status} for ${url}`)
  }

  const html = await res.text()

  if (html.includes('consent.google.com') || html.includes('detected unusual traffic')) {
    throw new Error('Google Maps returned consent/block page — request was detected')
  }

  if (html.includes('cf-browser-verification') || html.includes('Enable JavaScript')) {
    throw new Error('Google Maps returned challenge page — request was blocked')
  }

  return html
}

export function parseCityState(cityEntry: string): { city: string; state: string } {
  const cleaned = cityEntry.trim()
  const commaIdx = cleaned.lastIndexOf(',')
  if (commaIdx !== -1) {
    const city = cleaned.substring(0, commaIdx).trim()
    const state = cleaned.substring(commaIdx + 1).trim()
    return { city, state }
  }
  const parts = cleaned.split(/\s+/)
  if (parts.length >= 2 && parts[parts.length - 1].length === 2) {
    return { city: parts.slice(0, -1).join(' '), state: parts[parts.length - 1] }
  }
  return { city: cleaned, state: '' }
}

export async function scrapeGoogleMaps(
  niche: string,
  city: string,
  state: string,
  options: ScraperOptions = {},
): Promise<ScrapedBusiness[]> {
  const { signal, fetchFn = fetch } = options
  const allBusinesses: ScrapedBusiness[] = []

  const url = buildSearchUrl(niche, city, state)

  try {
    await randomDelay(800, 2000)
    const html = await fetchSearchPage(url, fetchFn, signal)
    const businesses = parseBusinessListings(html, city, state)
    allBusinesses.push(...businesses)
  } catch (err: any) {
    if (err.name === 'AbortError') throw err
    if (allBusinesses.length === 0) throw err
  }

  return allBusinesses
}

export function buildNicheCityKey(niche: string, city: string, businessName: string): string {
  return `${niche.toLowerCase()}:${city.toLowerCase()}:${businessName.toLowerCase().replace(/\s+/g, ' ').trim()}`
}

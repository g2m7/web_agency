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

export interface ProxyConfig {
  url: string
  username?: string
  password?: string
}

export interface ScraperOptions {
  maxResults?: number
  signal?: AbortSignal
  fetchFn?: typeof fetch
  proxies?: ProxyConfig[]
  maxRequestsPerMinute?: number
  maxRetries?: number
  retryBaseDelayMs?: number
  interRequestDelayMs?: [number, number]
}

interface ScraperSession {
  cookies: Map<string, string>
  lastRequestTime: number
  requestTimestamps: number[]
  activeProxy: ProxyConfig | null
  proxyIndex: number
  retryCount: number
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
]

const SEC_CH_UA_LIST = [
  '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
  '"Google Chrome";v="130", "Chromium";v="130", "Not_A Brand";v="99"',
]

const REFERER_CHAIN = [
  'https://www.google.com/',
  'https://www.google.com/search?q=',
  'https://maps.google.com/',
  'https://www.google.com/maps',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function randomDelay(min = 1500, max = 4500): Promise<void> {
  return sleep(min + Math.random() * (max - min))
}

function jitter(base: number, factor = 0.3): number {
  return base * (1 + (Math.random() * 2 - 1) * factor)
}

function createSession(proxies?: ProxyConfig[]): ScraperSession {
  return {
    cookies: new Map(),
    lastRequestTime: 0,
    requestTimestamps: [],
    activeProxy: proxies && proxies.length > 0 ? proxies[0]! : null,
    proxyIndex: 0,
    retryCount: 0,
  }
}

function rotateProxy(session: ScraperSession, proxies?: ProxyConfig[]): void {
  if (!proxies || proxies.length <= 1) return
  session.proxyIndex = (session.proxyIndex + 1) % proxies.length
  session.activeProxy = proxies[session.proxyIndex]!
}

function parseSetCookies(setCookieHeaders: string | string[] | null, cookies: Map<string, string>): void {
  if (!setCookieHeaders) return
  const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders]
  for (const header of headers) {
    const parts = header.split(';')[0]!.split('=')
    if (parts.length >= 2) {
      cookies.set(parts[0]!.trim(), parts.slice(1).join('=').trim())
    }
  }
}

function serializeCookies(cookies: Map<string, string>): string {
  return Array.from(cookies.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

async function enforceRateLimit(session: ScraperSession, maxPerMinute: number): Promise<void> {
  const now = Date.now()
  const windowMs = 60_000

  session.requestTimestamps = session.requestTimestamps.filter((t) => now - t < windowMs)

  if (session.requestTimestamps.length >= maxPerMinute) {
    const oldestInWindow = session.requestTimestamps[0]!
    const waitMs = windowMs - (now - oldestInWindow) + jitter(500, 0.2)
    await sleep(Math.max(waitMs, 1000))
  }

  const elapsed = now - session.lastRequestTime
  const minGap = 2000 + Math.random() * 1000
  if (elapsed < minGap) {
    await sleep(minGap - elapsed)
  }
}

function buildHeaders(session: ScraperSession): Record<string, string> {
  const ua = pickRandom(USER_AGENTS)
  const isChrome = ua.includes('Chrome')
  const isEdge = ua.includes('Edg')

  const headers: Record<string, string> = {
    'User-Agent': ua,
    Accept: '*/*',
    'Accept-Language': pickRandom(['en-US,en;q=0.9', 'en-US,en;q=0.8', 'en,en-US;q=0.9']),
    'Accept-Encoding': 'gzip, deflate, br',
    Referer: pickRandom(REFERER_CHAIN),
  }

  if (session.cookies.size > 0) {
    headers['Cookie'] = serializeCookies(session.cookies)
  }

  if (isChrome && !isEdge) {
    headers['Sec-Ch-Ua'] = pickRandom(SEC_CH_UA_LIST)
    headers['Sec-Ch-Ua-Mobile'] = '?0'
    headers['Sec-Ch-Ua-Platform'] = ua.includes('Windows') ? '"Windows"' : ua.includes('Mac') ? '"macOS"' : '"Linux"'
    headers['Sec-Fetch-Dest'] = 'empty'
    headers['Sec-Fetch-Mode'] = 'cors'
    headers['Sec-Fetch-Site'] = 'same-site'
  }

  return headers
}

export function buildSearchUrl(query: string, lat = 39.8283, lon = -98.5795, zoom = 4): string {
  const params = new URLSearchParams({
    tbm: 'map',
    authuser: '0',
    hl: 'en',
    q: query,
    pb: `!4m12!1m3!1d3826.902183192154!2d${lon.toFixed(4)}!3d${lat.toFixed(4)}!2m3!1f0!2f0!3f0!3m2!1i600!2i800!4f${zoom.toFixed(1)}!7i20!8i0!10b1!12m22!1m3!18b1!30b1!34e1!2m3!5m1!6e2!20e3!4b0!10b1!12b1!13b1!16b1!17m1!3e1!20m3!5e2!6b1!14b1!46m1!1b0!96b1!19m4!2m3!1i360!2i120!4i8`,
  })
  return `https://maps.google.com/search?${params.toString()}`
}

async function fetchWithProxy(
  url: string,
  options: RequestInit,
  proxy: ProxyConfig | null,
  fetchFn: typeof fetch,
): Promise<Response> {
  if (!proxy) {
    return fetchFn(url, options)
  }

  if (proxy.username && proxy.password) {
    const auth = Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64')
    options.headers = {
      ...(options.headers as Record<string, string>),
      'Proxy-Authorization': `Basic ${auth}`,
    }
  }

  return fetchFn(url, options)
}

async function fetchSearchJSON(
  url: string,
  fetchFn: typeof fetch,
  session: ScraperSession,
  proxy: ProxyConfig | null,
  signal?: AbortSignal,
): Promise<string> {
  const headers = buildHeaders(session)

  const res = await fetchWithProxy(
    url,
    { headers, redirect: 'follow', signal },
    proxy,
    fetchFn,
  )

  const setCookie = res.headers.get('set-cookie')
  if (setCookie) {
    parseSetCookies(setCookie.split(',').filter(Boolean), session.cookies)
  }

  if (res.status === 429) {
    throw new Error('RATE_LIMITED')
  }

  if (!res.ok) {
    throw new Error(`Google Maps API returned HTTP ${res.status}`)
  }

  const text = await res.text()

  if (text.includes('consent.google.com') || text.includes('detected unusual traffic')) {
    throw new Error('DETECTED_BLOCK')
  }

  if (text.length < 50) {
    throw new Error('SUSPICIOUS_RESPONSE')
  }

  const firstNewline = text.indexOf('\n')
  if (firstNewline === -1) {
    throw new Error('INVALID_RESPONSE_FORMAT')
  }

  return text.substring(firstNewline + 1)
}

async function fetchWithRetry(
  url: string,
  fetchFn: typeof fetch,
  session: ScraperSession,
  options: ScraperOptions,
): Promise<string> {
  const maxRetries = options.maxRetries ?? 3
  const retryBaseDelay = options.retryBaseDelayMs ?? 4000

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    try {
      const json = await fetchSearchJSON(url, fetchFn, session, session.activeProxy, options.signal)
      session.retryCount = 0
      return json
    } catch (err: any) {
      const msg = err.message ?? ''

      if (err.name === 'AbortError') throw err

      const isRecoverable =
        msg === 'RATE_LIMITED' ||
        msg === 'DETECTED_BLOCK' ||
        msg === 'SUSPICIOUS_RESPONSE' ||
        msg === 'INVALID_RESPONSE_FORMAT' ||
        msg.includes('ECONNRESET') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('socket hang up') ||
        msg.includes('fetch failed')

      if (!isRecoverable || attempt === maxRetries) {
        throw err
      }

      rotateProxy(session, options.proxies)

      const cooldown = jitter(retryBaseDelay * Math.pow(2, attempt))
      await sleep(cooldown)
    }
  }

  throw new Error('Max retries exceeded')
}

// ── JSON path accessor (same as Go getNthElementAndCast) ──────

type Val = any

function getVal(data: Val, ...indexes: number[]): Val {
  if (data == null || !Array.isArray(data)) return null
  let current: Val = data
  for (const idx of indexes) {
    if (current == null || !Array.isArray(current) || idx >= current.length || idx < 0) return null
    current = current[idx]
  }
  return current
}

function getString(data: Val, ...indexes: number[]): string | null {
  const v = getVal(data, ...indexes)
  return typeof v === 'string' ? v : null
}

function getNumber(data: Val, ...indexes: number[]): number | null {
  const v = getVal(data, ...indexes)
  return typeof v === 'number' ? v : null
}

function getArray(data: Val, ...indexes: number[]): Val[] | null {
  const v = getVal(data, ...indexes)
  return Array.isArray(v) ? v : null
}

// ── Parse search results (mirrors Go ParseSearchResults) ──────

export function parseSearchResults(jsonStr: string): ScrapedBusiness[] {
  let data: Val[]
  try {
    data = JSON.parse(jsonStr)
  } catch {
    return []
  }

  if (!Array.isArray(data) || data.length === 0) return []

  const container = data[0]
  if (!Array.isArray(container)) return []

  const items = getVal(container, 1)
  if (!Array.isArray(items) || items.length < 2) return []

  const businesses: ScrapedBusiness[] = []

  for (let i = 1; i < items.length; i++) {
    const arr = items[i]
    if (!Array.isArray(arr)) continue

    const biz = getVal(arr, 14)
    if (!Array.isArray(biz)) continue

    const title = getString(biz, 11)
    if (!title || title.length < 2) continue

    const addressParts = getArray(biz, 2)
    const address = addressParts
      ? addressParts.map((p: Val) => String(p ?? '')).join(', ')
      : ''

    const rating = getNumber(biz, 4, 7)
    const reviewCount = getNumber(biz, 4, 8)

    const lat = getNumber(biz, 9, 2)
    const lng = getNumber(biz, 9, 3)

    const dataId = getString(biz, 10)

    const categoriesArr = getArray(biz, 13)
    const category = categoriesArr && categoriesArr.length > 0
      ? String(categoriesArr[0])
      : null

    const websiteRaw = getString(biz, 7, 0)
    const website = extractActualUrl(websiteRaw)

    const phoneRaw = getString(biz, 178, 0, 0)
    const phone = phoneRaw ? phoneRaw.replace(/\s+/g, '') : null

    const mapsUrl = dataId
      ? `https://www.google.com/maps/place/?q=place_id:${dataId}`
      : ''

    businesses.push({
      name: title.trim(),
      address: address.trim(),
      phone,
      website,
      mapsUrl,
      rating: rating != null && rating >= 1 && rating <= 5 ? rating : null,
      reviewCount: reviewCount != null ? Math.round(reviewCount) : null,
      latitude: lat,
      longitude: lng,
      category,
      placeId: dataId,
    })
  }

  const seen = new Set<string>()
  return businesses.filter((b) => {
    const key = b.name.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function extractActualUrl(raw: string | null): string | null {
  if (!raw) return null
  if (raw.startsWith('/url?q=')) {
    try {
      const u = new URL(raw, 'https://www.google.com')
      const actual = u.searchParams.get('q')
      if (actual) return actual
    } catch {}
  }
  return raw
}

// ── Legacy HTML parser (kept for backwards compat, unused by default) ──

const PLACE_ID_RE = /0x[a-f0-9]{6,20}:0x[a-f0-9]{6,20}/g
const PHONE_RE = /\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/
const URL_RE = /https?:\/\/(?!maps\.google\.com|www\.google\.com|goo\.gl|googleusercontent)[^\s"'<>,\]]+/
const ADDR_RE = /\d+\s+[A-Za-z][A-Za-z\s.]+,?\s*[A-Za-z][A-Za-z\s.]+,?\s*[A-Z]{2}\s+\d{5}(-\d{4})?/
const CITY_STATE_RE = /[A-Za-z][A-Za-z\s.]+,?\s*[A-Z]{2}\s+\d{5}/
const RATING_RE = /(\d\.\d)\s*\((\d[\d,]*)\)/
const COORD_RE = /(-?\d{1,3}\.\d{4,8})\s*,\s*(-?\d{1,3}\.\d{4,8})/

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
    rating: rating !== null && rating >= 1 && rating <= 5 ? rating : null,
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
    const chunk = html.substring(idx, Math.min(html.length, idx + 8000))
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

// ── Main entry ───────────────────────────────────────────────

export function parseCityState(cityEntry: string): { city: string; state: string } {
  const cleaned = cityEntry.trim()
  const commaIdx = cleaned.lastIndexOf(',')
  if (commaIdx !== -1) {
    const city = cleaned.substring(0, commaIdx).trim()
    const state = cleaned.substring(commaIdx + 1).trim()
    return { city, state }
  }
  const parts = cleaned.split(/\s+/)
  if (parts.length >= 2 && parts[parts.length - 1]!.length === 2) {
    return { city: parts.slice(0, -1).join(' '), state: parts[parts.length - 1]! }
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
  const maxRpm = options.maxRequestsPerMinute ?? 8
  const interDelay = options.interRequestDelayMs ?? [3000, 6000]

  const session = createSession(options.proxies)

  const query = `${niche} in ${city} ${state}`
  const url = buildSearchUrl(query)

  try {
    await enforceRateLimit(session, maxRpm)
    await randomDelay(interDelay[0], interDelay[1])

    session.lastRequestTime = Date.now()
    session.requestTimestamps.push(session.lastRequestTime)

    const jsonStr = await fetchWithRetry(url, fetchFn, session, options)
    const businesses = parseSearchResults(jsonStr)
    return typeof options.maxResults === 'number' ? businesses.slice(0, options.maxResults) : businesses
  } catch (err: any) {
    if (err.name === 'AbortError') throw err
    throw err
  }
}

export async function scrapeMultipleCities(
  niche: string,
  cityStates: Array<{ city: string; state: string }>,
  options: ScraperOptions = {},
): Promise<Map<string, ScrapedBusiness[]>> {
  const results = new Map<string, ScrapedBusiness[]>()
  const session = createSession(options.proxies)
  const { fetchFn = fetch, signal } = options
  const maxRpm = options.maxRequestsPerMinute ?? 8
  const interDelay = options.interRequestDelayMs ?? [5000, 12000]

  for (const { city, state } of cityStates) {
    if (signal?.aborted) break

    const query = `${niche} in ${city} ${state}`
    const url = buildSearchUrl(query)

    try {
      await enforceRateLimit(session, maxRpm)
      await randomDelay(interDelay[0], interDelay[1])

      session.lastRequestTime = Date.now()
      session.requestTimestamps.push(session.lastRequestTime)

      const jsonStr = await fetchWithRetry(url, fetchFn, session, options)
      const businesses = parseSearchResults(jsonStr)
      results.set(
        `${city}, ${state}`,
        typeof options.maxResults === 'number' ? businesses.slice(0, options.maxResults) : businesses,
      )
    } catch (err: any) {
      if (err.name === 'AbortError') throw err
      results.set(`${city}, ${state}`, [])
    }
  }

  return results
}

export function buildNicheCityKey(niche: string, city: string, businessName: string): string {
  return `${niche.toLowerCase()}:${city.toLowerCase()}:${businessName.toLowerCase().replace(/\s+/g, ' ').trim()}`
}

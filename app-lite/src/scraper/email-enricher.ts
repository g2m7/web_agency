import type { EnrichmentResult, EmailSource, EmailConfidence } from '../types'

// ── Types ──────────────────────────────────────────────────────

export interface ExtractedEmail {
  email: string
  source: EmailSource
  confidence: EmailConfidence
}

export interface EnrichOptions {
  fetchFn?: typeof fetch
  signal?: AbortSignal
  timeoutMs?: number
  maxPages?: number
}

// ── User agents (reuse pattern from google-maps.ts) ────────────

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function randomDelay(min = 2000, max = 5000): Promise<void> {
  return sleep(min + Math.random() * (max - min))
}

// ── Email regex ────────────────────────────────────────────────

// Matches most standard email addresses
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

// Junk domains to ignore (tracking pixels, assets, examples)
const JUNK_DOMAINS = new Set([
  'example.com', 'example.org', 'example.net',
  'sentry.io', 'wixpress.com', 'googleusercontent.com',
  'gravatar.com', 'wp.com', 'wordpress.com',
  'squarespace.com', 'shopify.com',
  'placeholder.com', 'your-domain.com', 'yourdomain.com',
  'email.com', 'test.com', 'domain.com',
])

// Junk email patterns (images, files, not real emails)
const JUNK_PATTERNS = [
  /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i,
  /^[0-9a-f]{8,}@/i, // hex hashes
  /^(noreply|no-reply|donotreply|do-not-reply|mailer-daemon|postmaster)@/i,
]

function isJunkEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return true
  if (JUNK_DOMAINS.has(domain)) return true
  return JUNK_PATTERNS.some((re) => re.test(email))
}

// ── Contact page discovery ─────────────────────────────────────

const CONTACT_PATH_PATTERNS = [
  /\/contact\/?$/i,
  /\/contact-us\/?$/i,
  /\/get-in-touch\/?$/i,
  /\/about\/?$/i,
  /\/about-us\/?$/i,
  /\/reach-us\/?$/i,
]

const CONTACT_LINK_TEXT = /\b(contact|about|get in touch|reach us)\b/i

export function findContactPages(html: string, baseUrl: string): string[] {
  const pages: string[] = []
  const seen = new Set<string>()

  // Extract <a> href attributes
  const linkRe = /<a\s[^>]*?href=["']([^"'#]+?)["'][^>]*?>([\s\S]*?)<\/a>/gi
  let match
  while ((match = linkRe.exec(html)) !== null) {
    const href = match[1]!
    const text = match[2]?.replace(/<[^>]+>/g, '').trim() ?? ''

    let url: URL
    try {
      url = new URL(href, baseUrl)
    } catch {
      continue
    }

    // Only same-origin links
    const base = new URL(baseUrl)
    if (url.hostname !== base.hostname) continue

    const path = url.pathname
    const isContactPath = CONTACT_PATH_PATTERNS.some((re) => re.test(path))
    const isContactText = CONTACT_LINK_TEXT.test(text)

    if ((isContactPath || isContactText) && !seen.has(url.href)) {
      seen.add(url.href)
      pages.push(url.href)
    }

    if (pages.length >= 4) break
  }

  // If no links found, try common paths directly
  if (pages.length === 0) {
    const base = new URL(baseUrl)
    const commonPaths = ['/contact', '/about', '/contact-us', '/about-us']
    for (const p of commonPaths) {
      const candidate = `${base.origin}${p}`
      if (!seen.has(candidate)) {
        pages.push(candidate)
        seen.add(candidate)
      }
      if (pages.length >= 3) break
    }
  }

  return pages
}

// ── Email extraction from HTML ──────────────────────────────────

export function extractEmailsFromHtml(html: string): ExtractedEmail[] {
  const results: ExtractedEmail[] = []
  const seen = new Set<string>()

  function addEmail(email: string, source: EmailSource, confidence: EmailConfidence) {
    const normalized = email.toLowerCase().trim()
    if (seen.has(normalized) || isJunkEmail(normalized)) return
    seen.add(normalized)
    results.push({ email: normalized, source, confidence })
  }

  // 1. mailto: links (highest confidence)
  const mailtoRe = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi
  let m
  while ((m = mailtoRe.exec(html)) !== null) {
    addEmail(m[1]!, 'mailto', 'high')
  }

  // 2. JSON-LD / schema.org (high confidence)
  const jsonLdRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  while ((m = jsonLdRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]!)
      const objects = Array.isArray(data) ? data : [data]
      for (const obj of objects) {
        if (obj.email) addEmail(String(obj.email), 'schema_org', 'high')
        if (obj.contactPoint) {
          const points = Array.isArray(obj.contactPoint) ? obj.contactPoint : [obj.contactPoint]
          for (const cp of points) {
            if (cp.email) addEmail(String(cp.email), 'schema_org', 'high')
          }
        }
      }
    } catch {
      // Invalid JSON-LD — ignore
    }
  }

  // 3. Contact page body text (medium confidence)
  // Strip HTML tags for plain text scanning
  const textContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')

  const bodyEmails = textContent.match(EMAIL_RE) || []
  for (const email of bodyEmails) {
    addEmail(email, 'contact_page', 'medium')
  }

  // 4. Footer region (lower confidence — look in last 20% of HTML)
  const footerStart = Math.floor(html.length * 0.8)
  const footerHtml = html.substring(footerStart)
  const footerText = footerHtml.replace(/<[^>]+>/g, ' ')
  const footerEmails = footerText.match(EMAIL_RE) || []
  for (const email of footerEmails) {
    // Only add as footer source if not already found with higher confidence
    if (!seen.has(email.toLowerCase().trim())) {
      addEmail(email, 'footer', 'low')
    }
  }

  return results
}

// ── Confidence scoring ──────────────────────────────────────────

export function scoreEmail(email: string, source: EmailSource): EmailConfidence {
  // Generic prefixes get downgraded
  const prefix = email.split('@')[0]?.toLowerCase() ?? ''
  const genericPrefixes = ['info', 'admin', 'contact', 'office', 'hello', 'mail', 'general', 'enquiries', 'inquiries']

  if (source === 'mailto' || source === 'schema_org') {
    return genericPrefixes.includes(prefix) ? 'medium' : 'high'
  }
  if (source === 'contact_page') {
    return genericPrefixes.includes(prefix) ? 'low' : 'medium'
  }
  return 'low'
}

// ── Main enrichment function ────────────────────────────────────

async function fetchPage(url: string, options: EnrichOptions): Promise<string | null> {
  const fetchFn = options.fetchFn ?? fetch
  const timeout = options.timeoutMs ?? 10_000

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    // Combine with external signal
    if (options.signal?.aborted) return null

    const res = await fetchFn(url, {
      headers: {
        'User-Agent': pickRandom(USER_AGENTS),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      redirect: 'follow',
      signal: controller.signal,
    })

    clearTimeout(timer)

    if (!res.ok) return null

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return null
    }

    return await res.text()
  } catch {
    return null
  }
}

export async function enrichEmailFromWebsite(
  websiteUrl: string,
  options: EnrichOptions = {},
): Promise<EnrichmentResult> {
  const maxPages = options.maxPages ?? 4
  let pagesChecked = 0
  let bestResult: ExtractedEmail | null = null

  // Normalize URL
  let normalizedUrl = websiteUrl
  if (!normalizedUrl.startsWith('http')) {
    normalizedUrl = `https://${normalizedUrl}`
  }

  try {
    // 1. Fetch homepage
    const homepage = await fetchPage(normalizedUrl, options)
    pagesChecked++

    if (!homepage) {
      return { email: null, source: null, confidence: null, pagesChecked, error: 'Failed to fetch homepage' }
    }

    // Extract emails from homepage
    let emails = extractEmailsFromHtml(homepage)
    if (emails.length > 0) {
      bestResult = pickBestEmail(emails)
    }

    // 2. If no email found, try contact/about pages
    if (!bestResult && pagesChecked < maxPages) {
      const contactPages = findContactPages(homepage, normalizedUrl)

      for (const pageUrl of contactPages) {
        if (pagesChecked >= maxPages) break
        if (options.signal?.aborted) break

        await randomDelay(2000, 4000)

        const pageHtml = await fetchPage(pageUrl, options)
        pagesChecked++

        if (pageHtml) {
          const pageEmails = extractEmailsFromHtml(pageHtml)
          emails = [...emails, ...pageEmails]

          if (pageEmails.length > 0 && !bestResult) {
            bestResult = pickBestEmail(pageEmails)
          }
        }
      }
    }

    // 3. If still no result, pick best from all collected
    if (!bestResult && emails.length > 0) {
      bestResult = pickBestEmail(emails)
    }

    if (bestResult) {
      // Re-score with final source
      const confidence = scoreEmail(bestResult.email, bestResult.source)
      return {
        email: bestResult.email,
        source: bestResult.source,
        confidence,
        pagesChecked,
      }
    }

    return { email: null, source: null, confidence: null, pagesChecked }
  } catch (err: any) {
    return {
      email: null,
      source: null,
      confidence: null,
      pagesChecked,
      error: err.message ?? 'Unknown enrichment error',
    }
  }
}

function pickBestEmail(emails: ExtractedEmail[]): ExtractedEmail | null {
  if (emails.length === 0) return null

  // Priority: high > medium > low confidence
  // Within same confidence: mailto > schema_org > contact_page > footer
  const sourceOrder: Record<EmailSource, number> = {
    mailto: 0,
    schema_org: 1,
    contact_page: 2,
    footer: 3,
    manual: 4,
  }

  const confOrder: Record<EmailConfidence, number> = {
    high: 0,
    medium: 1,
    low: 2,
  }

  const sorted = [...emails].sort((a, b) => {
    const confDiff = confOrder[a.confidence] - confOrder[b.confidence]
    if (confDiff !== 0) return confDiff
    return sourceOrder[a.source] - sourceOrder[b.source]
  })

  return sorted[0]!
}

// ── Priority tier assignment ────────────────────────────────────

export function computePriorityTier(hasWebsite: boolean, hasPhone: boolean): 'hot' | 'warm' | 'low' {
  if (hasWebsite && hasPhone) return 'hot'
  if (hasWebsite || hasPhone) return 'warm'
  return 'low'
}

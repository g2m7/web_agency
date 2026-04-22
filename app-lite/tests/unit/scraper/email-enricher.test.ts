import { describe, test, expect } from 'vitest'
import {
  extractEmailsFromHtml,
  findContactPages,
  scoreEmail,
  computePriorityTier,
} from '../../../src/scraper/email-enricher'

describe('extractEmailsFromHtml', () => {
  test('extracts mailto links as high confidence', () => {
    const html = '<a href="mailto:john@example-biz.com">Email us</a>'
    const results = extractEmailsFromHtml(html)
    expect(results.length).toBeGreaterThanOrEqual(1)
    const mailto = results.find(r => r.source === 'mailto')
    expect(mailto).toBeDefined()
    expect(mailto!.email).toBe('john@example-biz.com')
    expect(mailto!.confidence).toBe('high')
  })

  test('extracts emails from schema.org JSON-LD', () => {
    const html = `
      <script type="application/ld+json">
        {"@type":"LocalBusiness","email":"info@mybiz.com","contactPoint":{"email":"contact@mybiz.com"}}
      </script>
    `
    const results = extractEmailsFromHtml(html)
    const schemaEmails = results.filter(r => r.source === 'schema_org')
    expect(schemaEmails.length).toBeGreaterThanOrEqual(1)
    expect(schemaEmails.some(e => e.email === 'info@mybiz.com')).toBe(true)
  })

  test('extracts emails from body text', () => {
    const html = '<p>Contact us at support@realbusiness.com for inquiries</p>'
    const results = extractEmailsFromHtml(html)
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results.some(e => e.email === 'support@realbusiness.com')).toBe(true)
  })

  test('filters out junk domains', () => {
    const html = '<a href="mailto:test@example.com">test</a><p>real@legit-biz.com</p>'
    const results = extractEmailsFromHtml(html)
    expect(results.every(r => !r.email.includes('example.com'))).toBe(true)
  })

  test('filters out image file emails', () => {
    const html = '<p>icon@company.png and real@company.com</p>'
    const results = extractEmailsFromHtml(html)
    expect(results.every(r => !r.email.endsWith('.png'))).toBe(true)
  })

  test('deduplicates emails', () => {
    const html = `
      <a href="mailto:info@test-biz.com">Email</a>
      <p>info@test-biz.com</p>
      <footer>info@test-biz.com</footer>
    `
    const results = extractEmailsFromHtml(html)
    const emails = results.map(r => r.email)
    expect(new Set(emails).size).toBe(emails.length)
  })

  test('returns empty array for no emails', () => {
    const html = '<p>No email addresses here</p>'
    const results = extractEmailsFromHtml(html)
    expect(results.length).toBe(0)
  })
})

describe('findContactPages', () => {
  test('discovers /contact link', () => {
    const html = '<a href="/contact">Contact Us</a><a href="/about">About</a>'
    const pages = findContactPages(html, 'https://example-biz.com')
    expect(pages.length).toBeGreaterThanOrEqual(1)
    expect(pages.some(p => p.includes('/contact'))).toBe(true)
  })

  test('discovers links by text content', () => {
    const html = '<a href="/reach-out">Get In Touch</a>'
    const pages = findContactPages(html, 'https://example-biz.com')
    expect(pages.length).toBeGreaterThanOrEqual(1)
  })

  test('falls back to common paths when no links found', () => {
    const html = '<p>No navigation links</p>'
    const pages = findContactPages(html, 'https://example-biz.com')
    expect(pages.length).toBeGreaterThanOrEqual(1)
    expect(pages.some(p => p.includes('/contact') || p.includes('/about'))).toBe(true)
  })

  test('limits to max 4 pages', () => {
    const html = `
      <a href="/contact">Contact</a>
      <a href="/about">About</a>
      <a href="/about-us">About Us</a>
      <a href="/contact-us">Contact Us</a>
      <a href="/reach-us">Reach Us</a>
      <a href="/get-in-touch">Get In Touch</a>
    `
    const pages = findContactPages(html, 'https://example-biz.com')
    expect(pages.length).toBeLessThanOrEqual(4)
  })

  test('ignores cross-origin links', () => {
    const html = '<a href="https://other-site.com/contact">Contact</a>'
    const pages = findContactPages(html, 'https://example-biz.com')
    // Should only have fallback paths, not cross-origin
    expect(pages.every(p => p.includes('example-biz.com'))).toBe(true)
  })
})

describe('scoreEmail', () => {
  test('mailto source gets high confidence', () => {
    expect(scoreEmail('john@biz.com', 'mailto')).toBe('high')
  })

  test('schema_org source gets high confidence', () => {
    expect(scoreEmail('john@biz.com', 'schema_org')).toBe('high')
  })

  test('generic prefix downgrades mailto to medium', () => {
    expect(scoreEmail('info@biz.com', 'mailto')).toBe('medium')
  })

  test('contact_page gets medium for specific emails', () => {
    expect(scoreEmail('john.doe@biz.com', 'contact_page')).toBe('medium')
  })

  test('contact_page gets low for generic prefixes', () => {
    expect(scoreEmail('info@biz.com', 'contact_page')).toBe('low')
  })

  test('footer source always gets low', () => {
    expect(scoreEmail('john@biz.com', 'footer')).toBe('low')
  })
})

describe('computePriorityTier', () => {
  test('website + phone = hot', () => {
    expect(computePriorityTier(true, true)).toBe('hot')
  })

  test('website only = warm', () => {
    expect(computePriorityTier(true, false)).toBe('warm')
  })

  test('no website = low', () => {
    expect(computePriorityTier(false, false)).toBe('low')
  })

  test('phone only, no website = low', () => {
    expect(computePriorityTier(false, true)).toBe('low')
  })
})

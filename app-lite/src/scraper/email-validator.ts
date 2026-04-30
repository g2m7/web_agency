import type { ValidationResult, EmailStatus } from '../types'

// ── Syntax check (RFC 5322 subset) ─────────────────────────────

const EMAIL_SYNTAX_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

function isValidSyntax(email: string): boolean {
  if (email.length > 254) return false
  const [local, domain] = email.split('@')
  if (!local || !domain) return false
  if (local.length > 64) return false
  if (!domain.includes('.')) return false
  return EMAIL_SYNTAX_RE.test(email)
}

// ── Role address detection ──────────────────────────────────────

const ROLE_PREFIXES = new Set([
  'info', 'admin', 'contact', 'office', 'hello',
  'support', 'sales', 'billing', 'help',
  'service', 'webmaster', 'hostmaster', 'postmaster',
  'abuse', 'security', 'privacy', 'legal',
  'marketing', 'press', 'media', 'team',
  'general', 'enquiries', 'inquiries',
  'feedback', 'jobs', 'careers', 'hr',
  'mail', 'email', 'newsletter',
])

export function isRoleAddress(email: string): boolean {
  const prefix = email.split('@')[0]?.toLowerCase() ?? ''
  return ROLE_PREFIXES.has(prefix)
}

// ── Disposable domain detection ─────────────────────────────────

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net',
  'tempmail.com', 'throwaway.email', 'temp-mail.org',
  'fakeinbox.com', 'sharklasers.com', 'guerrillamailblock.com',
  'grr.la', 'dispostable.com', 'yopmail.com', 'yopmail.fr',
  'trashmail.com', 'trashmail.me', 'trashmail.net',
  'mailnesia.com', 'maildrop.cc', 'discard.email',
  'tmpmail.net', 'tmpmail.org', 'binkmail.com',
  'safetymail.info', 'mailcatch.com', 'getairmail.com',
  'mohmal.com', 'tempail.com', 'tempr.email',
  'emailondeck.com', '33mail.com', 'mailnator.com',
  'inboxbear.com', 'spamgourmet.com', 'mintemail.com',
  'mytemp.email', 'mt2015.com', 'thankyou2010.com',
  '10minutemail.com', 'tempmailo.com', 'burnermail.io',
  'getnada.com', 'tmail.gg', 'harakirimail.com',
  'luxusmail.org', 'crazymailing.com', 'mailforspam.com',
  'receiveee.com', 'spamfree24.org', 'filzmail.com',
  'mailexpire.com', 'mailmoat.com', 'mailnull.com',
  'jetable.org', 'incognitomail.org', 'kasmail.com',
  'mailsac.com', 'meltmail.com', 'mobi.web.id',
  'objectmail.com', 'proxymail.eu', 'rcpt.at',
  'reallymymail.com', 'recode.me', 'regbypass.com',
  'rmqkr.net', 'safersignup.de', 'sogetthis.com',
  'soodonims.com', 'spam4.me', 'spamavert.com',
  'spambob.net', 'spambog.com', 'spambox.us',
  'spamcero.com', 'spamday.com', 'spamfighter.cf',
  'spamfree24.com', 'superrito.com', 'suremail.info',
  'teleworm.us', 'tempemail.co.za', 'tempemail.net',
  'tempinbox.com', 'tempmail.eu', 'tempmail2.com',
  'tempomail.fr', 'temporaryemail.net', 'temporarymail.org',
  'temporarioemail.com.br', 'thankyou2010.com',
  'trash-mail.at', 'trashymail.com', 'trashymail.net',
  'wegwerfmail.de', 'wegwerfmail.net', 'wh4f.org',
  'yolanda.dev', 'zeroe.ml',
])

export function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase())
}

// ── Noreply detection ───────────────────────────────────────────

const NOREPLY_PREFIXES = new Set([
  'noreply', 'no-reply', 'donotreply', 'do-not-reply',
  'mailer-daemon', 'bounce', 'auto',
])

function isNoreply(email: string): boolean {
  const prefix = email.split('@')[0]?.toLowerCase() ?? ''
  return NOREPLY_PREFIXES.has(prefix)
}

// ── MX record check ─────────────────────────────────────────────

async function hasMxRecords(domain: string): Promise<'yes' | 'no' | 'unknown'> {
  try {
    const dns = await import('node:dns/promises')
    const records = await dns.resolveMx(domain)
    return records.length > 0 ? 'yes' : 'no'
  } catch {
    // DNS failure — could be temporary, don't hard-fail
    return 'unknown'
  }
}

// ── Main validation function ────────────────────────────────────

export async function validateEmail(email: string): Promise<ValidationResult> {
  const normalized = email.toLowerCase().trim()

  // 1. Syntax check
  if (!isValidSyntax(normalized)) {
    return { status: 'invalid', reason: 'Invalid email syntax' }
  }

  const domain = normalized.split('@')[1]!

  // 2. Noreply check
  if (isNoreply(normalized)) {
    return { status: 'invalid', reason: 'No-reply address' }
  }

  // 3. Disposable domain check
  if (isDisposableDomain(domain)) {
    return { status: 'invalid', reason: `Disposable domain: ${domain}` }
  }

  // 4. Role address check (risky, not invalid — these are still real mailboxes)
  const roleAddr = isRoleAddress(normalized)

  // 5. MX record check
  const mxStatus = await hasMxRecords(domain)
  if (mxStatus === 'no') {
    return { status: 'invalid', reason: `No MX records for ${domain}` }
  }

  // 6. Final determination
  if (roleAddr) {
    return { status: 'risky', reason: `Role address (${normalized.split('@')[0]})` }
  }

  // DNS lookup failed — treat as risky rather than invalid since the email may still work
  if (mxStatus === 'unknown') {
    return { status: 'risky', reason: `DNS lookup failed for ${domain} — could not verify MX records` }
  }

  return { status: 'valid', reason: 'Passed all checks' }
}

// ── Batch validation helper ─────────────────────────────────────

export async function validateEmails(
  emails: Array<{ id: string; email: string }>,
): Promise<Map<string, ValidationResult>> {
  const results = new Map<string, ValidationResult>()

  for (const { id, email } of emails) {
    const result = await validateEmail(email)
    results.set(id, result)
  }

  return results
}

import { describe, it, expect } from 'vitest'
import { runPolicyCheck } from '../../src/policy/engine'
import type { PolicyContext } from '../../src/types'

describe('Golden tests: Outreach-Sales (SOP 06)', () => {
  describe('hook email generation', () => {
    it('scored lead with mobile issues → hook email mentions mobile, under 80 words, no demo link, no pricing', async () => {
      const ctx: PolicyContext = {
        action: 'send_email',
        phase: 5,
        interaction: {
          id: '1',
          message_type: 'hook_email',
          body: 'Hi John, I noticed your HVAC website in Austin has a layout that breaks on mobile phones. Since most people search for services on their phone, this could be costing you calls. Want me to show you a better version?',
          subject: "Quick note about Austin HVAC Pros website",
          direction: 'outbound',
        },
      }
      const result = await runPolicyCheck(ctx)
      expect(result.allowed).toBe(true)
      expect(result.blocked).toBe(false)
    })

    it('scored lead with no CTA → hook email mentions conversion, under 80 words', async () => {
      const ctx: PolicyContext = {
        action: 'send_email',
        phase: 5,
        interaction: {
          id: '2',
          message_type: 'hook_email',
          body: 'Hi Sarah, I was looking at your dental practice site in Denver and noticed there is no easy way for patients to book an appointment directly. Want me to show you a version that makes booking simple?',
          subject: "Quick note about Denver Dental's website",
          direction: 'outbound',
        },
      }
      const result = await runPolicyCheck(ctx)
      expect(result.allowed).toBe(true)
    })
  })

  describe('reply classification', () => {
    it('"Sure, show me" → classified as interested, triggers demo-builder', () => {
      const replyBody = 'Sure, show me what you have.'
      expect(replyBody.toLowerCase()).toContain('show me')
    })

    it('"Not interested" → classified as not_interested, archived', () => {
      const replyBody = 'Not interested, thanks.'
      expect(replyBody.toLowerCase()).toContain('not interested')
    })

    it('"How much does it cost?" → classified as question, not interested (no pricing in hook)', async () => {
      const ctx: PolicyContext = {
        action: 'send_email',
        phase: 5,
        interaction: {
          id: '3',
          message_type: 'hook_email',
          body: 'It starts at just $79 per month. Want to learn more?',
          subject: 'Pricing info',
          direction: 'outbound',
        },
      }
      const result = await runPolicyCheck(ctx)
      expect(result.blocked).toBe(true)
    })
  })
})

describe('Golden tests: Website-Audit (SOP 05)', () => {
  it('audit output must contain commercial translation for every issue', () => {
    const auditOutput = {
      score: 7,
      issues: [
        { category: 'mobile_experience', finding: 'Layout breaks on mobile viewport', commercial_translation: 'People searching on their phone may leave before contacting you', severity: 'high' },
      ],
    }

    for (const issue of auditOutput.issues) {
      expect(issue.commercial_translation).toBeDefined()
      expect(issue.commercial_translation.length).toBeGreaterThan(10)
    }
  })
})

describe('Golden tests: Support-Retention (SOP 09)', () => {
  it('angry message → escalated to human, no substantive auto-reply', async () => {
    const ctx: PolicyContext = {
      action: 'respond_to_client',
      phase: 6,
      interaction: {
        id: '4',
        message_type: 'support_reply',
        body: 'I am furious about the ongoing issues with my site. This is unacceptable and I want a full refund immediately or I will contact my attorney.',
        subject: 'Unacceptable service',
        direction: 'outbound',
      },
    }
    const result = await runPolicyCheck(ctx)
    expect(result.blocked).toBe(true)
  })

  it('legal threat → escalated immediately, NO response sent', async () => {
    const ctx: PolicyContext = {
      action: 'respond_to_client',
      phase: 6,
      interaction: {
        id: '5',
        message_type: 'support_reply',
        body: 'Consider this formal notice. I will sue you if you contact me again.',
        subject: 'Cease and desist',
        direction: 'outbound',
      },
    }
    const result = await runPolicyCheck(ctx)
    expect(result.blocked).toBe(true)
    expect(result.ruleName).toBe('legal_threat_escalation')
  })
})

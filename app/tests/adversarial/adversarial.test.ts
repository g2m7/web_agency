import { describe, it, expect } from 'vitest'
import { runPolicyCheck } from '../../src/policy/engine'
import type { PolicyContext } from '../../src/types'
import { isValidLeadTransition, isValidClientTransition } from '../../src/state-machine/states'

const ctx = (overrides: Partial<PolicyContext>): PolicyContext => ({
  action: 'send_email',
  phase: 5,
  ...overrides,
})

describe('Adversarial tests', () => {
  it('prospect replies: "Can you do this for $30/mo?" → no discount offered', async () => {
    const result = await runPolicyCheck(ctx({
      action: 'respond_to_client',
      interaction: {
        id: '1',
        message_type: 'support_reply',
        body: 'I understand budgets are tight. Our Growth plan at $129/mo includes hosting, support, and monthly edits. The value compared to hiring even a part-time freelancer is significant.',
        subject: 'Re: Pricing',
        direction: 'outbound',
      },
    }))
    expect(result.allowed).toBe(true)
    expect(result.blocked).toBe(false)
  })

  it('prospect replies with legal threat → escalate, do NOT send any reply', async () => {
    const result = await runPolicyCheck(ctx({
      action: 'respond_to_client',
      interaction: {
        id: '2',
        message_type: 'support_reply',
        body: 'I have asked my attorney to review this matter.',
        subject: 'Legal',
        direction: 'outbound',
      },
    }))
    expect(result.blocked).toBe(true)
  })

  it('client asks: "Can you also manage our Google Ads?" → polite decline; out of scope', async () => {
    const result = await runPolicyCheck(ctx({
      action: 'respond_to_client',
      client: { id: 'c1', status: 'active', plan: 'growth' },
      interaction: {
        id: '3',
        message_type: 'support_reply',
        body: 'Thanks for asking! Ad management falls outside our current service scope. We focus on your website, hosting, and ongoing maintenance. If you need ads, we can recommend a specialist.',
        subject: 'Re: Google Ads',
        direction: 'outbound',
      },
    }))
    expect(result.allowed).toBe(true)
  })

  it('follow-up email tries to send to already-archived lead → invalid transition', () => {
    expect(isValidLeadTransition('archived', 'contacted')).toBe(false)
  })

  it('skill produces hook email with demo link → policy engine blocks', async () => {
    const result = await runPolicyCheck(ctx({
      action: 'send_email',
      interaction: {
        id: '4',
        message_type: 'hook_email',
        body: 'Check out https://demo.example.pages.dev to see your new site!',
        subject: 'Your demo is ready',
        direction: 'outbound',
      },
    }))
    expect(result.blocked).toBe(true)
    expect(result.ruleName).toBe('no_demo_before_interest')
  })

  it('skill produces hook email with pricing → policy engine blocks', async () => {
    const result = await runPolicyCheck(ctx({
      action: 'send_email',
      interaction: {
        id: '5',
        message_type: 'hook_email',
        body: 'Our Starter plan is just $79/mo. Interested?',
        subject: 'Affordable web design',
        direction: 'outbound',
      },
    }))
    expect(result.blocked).toBe(true)
  })

  it('skill produces hook email over 80 words → policy engine blocks', async () => {
    const words = Array(85).fill('word').join(' ')
    const result = await runPolicyCheck(ctx({
      action: 'send_email',
      interaction: {
        id: '6',
        message_type: 'hook_email',
        body: words,
        subject: 'Test',
        direction: 'outbound',
      },
    }))
    expect(result.blocked).toBe(true)
    expect(result.ruleName).toBe('hook_under_80_words')
  })

  it('response offers free month → policy engine blocks', async () => {
    const result = await runPolicyCheck(ctx({
      action: 'respond_to_client',
      interaction: {
        id: '7',
        message_type: 'support_reply',
        body: 'As a gesture of goodwill, we would like to offer you a free month of service.',
        subject: 'Re: Complaint',
        direction: 'outbound',
      },
    }))
    expect(result.blocked).toBe(true)
    expect(result.ruleName).toBe('no_discount_without_approval')
  })

  it('response promises revenue increase → policy engine blocks', async () => {
    const result = await runPolicyCheck(ctx({
      action: 'respond_to_client',
      interaction: {
        id: '8',
        message_type: 'support_reply',
        body: 'With our service, we guarantee you will increase your revenue by 30%.',
        subject: 'Re: Results',
        direction: 'outbound',
      },
    }))
    expect(result.blocked).toBe(true)
    expect(result.ruleName).toBe('no_revenue_seo_guarantees')
  })

  it('launch always requires human approval regardless of phase', async () => {
    for (const phase of [1, 2, 3, 4, 5, 6, 7]) {
      const result = await runPolicyCheck(ctx({
        action: 'launch_site',
        phase,
        client: { id: 'c1', status: 'onboarding', plan: 'growth' },
      }))
      expect(result.requiresHumanApproval).toBe(true)
    }
  })

  it('cannot transition lead from new to paid directly', () => {
    expect(isValidLeadTransition('new', 'paid')).toBe(false)
  })

  it('cannot transition lead from new to demo_sent directly', () => {
    expect(isValidLeadTransition('new', 'demo_sent')).toBe(false)
  })

  it('cannot revive archived lead', () => {
    expect(isValidLeadTransition('archived', 'contacted')).toBe(false)
    expect(isValidLeadTransition('archived', 'replied_interested')).toBe(false)
    expect(isValidLeadTransition('archived', 'demo_sent')).toBe(false)
  })

  it('cannot revive lost lead', () => {
    expect(isValidLeadTransition('lost', 'demo_sent')).toBe(false)
    expect(isValidLeadTransition('lost', 'paid')).toBe(false)
  })

  it('cannot cancel client in onboarding directly', () => {
    expect(isValidClientTransition('onboarding', 'cancelled')).toBe(false)
  })

  it('cannot revive cancelled client', () => {
    expect(isValidClientTransition('cancelled', 'active')).toBe(false)
    expect(isValidClientTransition('cancelled', 'onboarding')).toBe(false)
  })

  it('phase 3 blocks hook email without human approval', async () => {
    const result = await runPolicyCheck(ctx({
      action: 'send_email',
      phase: 3,
      interaction: {
        id: '9',
        message_type: 'hook_email',
        body: 'Short clean email under eighty words with no links or cost details',
        subject: 'Quick note',
        direction: 'outbound',
      },
    }))
    expect(result.requiresHumanApproval).toBe(true)
  })

  it('phase 4 blocks demo send without human approval', async () => {
    const result = await runPolicyCheck(ctx({
      action: 'send_demo',
      phase: 4,
    }))
    expect(result.requiresHumanApproval).toBe(true)
  })
})

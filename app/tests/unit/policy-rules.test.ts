import { describe, it, expect } from 'vitest'
import {
  noDemoBeforeInterest,
  noPricingInHook,
  hookUnder80Words,
  noDiscountWithoutApproval,
  noRevenueSeoGuarantees,
  legalThreatEscalation,
  humanGateEmailApproval,
  humanGateDemoApproval,
  humanGateLaunch,
  paymentBeforeLaunch,
  dataIsolationCheck,
  scopeBoundary,
} from '../../src/policy/rules/index'
import type { PolicyContext } from '../../src/types'

const passCtx = (overrides: Partial<PolicyContext> = {}): PolicyContext => ({
  action: 'send_email',
  phase: 5,
  ...overrides,
})

describe('Policy rules', () => {
  describe('no_demo_before_interest', () => {
    const rule = noDemoBeforeInterest

    it('blocks hook email with demo URL', () => {
      const ctx = passCtx({
        interaction: {
          id: '1',
          message_type: 'hook_email',
          body: 'Check out your demo preview at https://foo.pages.dev',
          subject: 'Test',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.blocked).toBe(true)
      expect(result.ruleName).toBe('no_demo_before_interest')
    })

    it('passes clean hook email', () => {
      const ctx = passCtx({
        interaction: {
          id: '1',
          message_type: 'hook_email',
          body: 'Hi, I noticed your mobile layout has issues. Want me to show you a better version?',
          subject: 'Quick note',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.allowed).toBe(true)
    })

    it('passes non-hook emails', () => {
      const ctx = passCtx({
        interaction: {
          id: '1',
          message_type: 'demo_email',
          body: 'Here is your demo: https://foo.pages.dev',
          subject: 'Demo',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.allowed).toBe(true)
    })
  })

  describe('no_pricing_in_hook', () => {
    const rule = noPricingInHook

    it('blocks hook email with $79/mo', () => {
      const ctx = passCtx({
        interaction: {
          id: '1',
          message_type: 'hook_email',
          body: 'Our plans start at $79/mo',
          subject: 'Test',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.blocked).toBe(true)
    })

    it('blocks hook email mentioning Starter plan', () => {
      const ctx = passCtx({
        interaction: {
          id: '1',
          message_type: 'hook_email',
          body: 'The Starter plan is great for you.',
          subject: 'Test',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.blocked).toBe(true)
    })

    it('passes hook email without pricing', () => {
      const ctx = passCtx({
        interaction: {
          id: '1',
          message_type: 'hook_email',
          body: 'I noticed your site has issues. Want to see a better version?',
          subject: 'Quick note',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.allowed).toBe(true)
    })
  })

  describe('hook_under_80_words', () => {
    const rule = hookUnder80Words

    it('blocks hook email over 80 words', () => {
      const longBody = Array(82).fill('word').join(' ')
      const ctx = passCtx({
        interaction: {
          id: '1',
          message_type: 'hook_email',
          body: longBody,
          subject: 'Test',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.blocked).toBe(true)
    })

    it('passes hook email at exactly 80 words', () => {
      const body80 = Array(80).fill('word').join(' ')
      const ctx = passCtx({
        interaction: {
          id: '1',
          message_type: 'hook_email',
          body: body80,
          subject: 'Test',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.allowed).toBe(true)
    })

    it('passes hook email under 80 words', () => {
      const ctx = passCtx({
        interaction: {
          id: '1',
          message_type: 'hook_email',
          body: 'Short email',
          subject: 'Test',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.allowed).toBe(true)
    })
  })

  describe('no_discount_without_approval', () => {
    const rule = noDiscountWithoutApproval

    it('blocks response offering discount', () => {
      const ctx = passCtx({
        action: 'respond_to_client',
        interaction: {
          id: '1',
          message_type: 'support_reply',
          body: 'I can offer you a discount on your next month.',
          subject: 'Re: Pricing',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.blocked).toBe(true)
    })

    it('blocks response offering free month', () => {
      const ctx = passCtx({
        action: 'respond_to_client',
        interaction: {
          id: '1',
          message_type: 'support_reply',
          body: 'We can give you a free month to make up for it.',
          subject: 'Re: Issue',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.blocked).toBe(true)
    })

    it('passes response without discount language', () => {
      const ctx = passCtx({
        action: 'respond_to_client',
        interaction: {
          id: '1',
          message_type: 'support_reply',
          body: 'Your edit request has been completed.',
          subject: 'Re: Edit',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.allowed).toBe(true)
    })
  })

  describe('no_revenue_seo_guarantees', () => {
    const rule = noRevenueSeoGuarantees

    it('blocks guarantee of more leads', () => {
      const ctx = passCtx({
        interaction: {
          id: '1',
          message_type: 'hook_email',
          body: 'We guarantee you will get more leads.',
          subject: 'Test',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.blocked).toBe(true)
    })

    it('blocks first page of Google promise', () => {
      const ctx = passCtx({
        interaction: {
          id: '1',
          message_type: 'demo_email',
          body: 'This will get you to the first page of Google.',
          subject: 'Demo',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.blocked).toBe(true)
    })

    it('passes email without guarantees', () => {
      const ctx = passCtx({
        interaction: {
          id: '1',
          message_type: 'hook_email',
          body: 'Your current site has issues that may affect credibility.',
          subject: 'Test',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.allowed).toBe(true)
    })
  })

  describe('legal_threat_escalation', () => {
    const rule = legalThreatEscalation

    it('blocks response to legal threat', () => {
      const ctx = passCtx({
        action: 'respond_to_client',
        interaction: {
          id: '1',
          message_type: 'support_reply',
          body: 'I understand your concern about the lawsuit.',
          subject: 'Legal',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.blocked).toBe(true)
    })

    it('blocks response to cease and desist', () => {
      const ctx = passCtx({
        action: 'respond_to_client',
        interaction: {
          id: '1',
          message_type: 'support_reply',
          body: 'This is a cease and desist.',
          subject: 'Stop',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.blocked).toBe(true)
    })

    it('passes normal support response', () => {
      const ctx = passCtx({
        action: 'respond_to_client',
        interaction: {
          id: '1',
          message_type: 'support_reply',
          body: 'Your edit has been applied successfully.',
          subject: 'Re: Edit',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.allowed).toBe(true)
    })
  })

  describe('human_gate_email_approval', () => {
    const rule = humanGateEmailApproval

    it('requires human approval in phase 3', () => {
      const ctx = passCtx({
        action: 'send_email',
        phase: 3,
        interaction: {
          id: '1',
          message_type: 'hook_email',
          body: 'Test',
          subject: 'Test',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.requiresHumanApproval).toBe(true)
    })

    it('passes in phase 4+', () => {
      const ctx = passCtx({
        action: 'send_email',
        phase: 5,
        interaction: {
          id: '1',
          message_type: 'hook_email',
          body: 'Test',
          subject: 'Test',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.allowed).toBe(true)
    })

    it('passes non-hook emails in phase 3', () => {
      const ctx = passCtx({
        action: 'send_email',
        phase: 3,
        interaction: {
          id: '1',
          message_type: 'demo_email',
          body: 'Test',
          subject: 'Test',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.allowed).toBe(true)
    })
  })

  describe('human_gate_demo_approval', () => {
    const rule = humanGateDemoApproval

    it('requires human approval in phase 4', () => {
      const ctx = passCtx({
        action: 'send_demo',
        phase: 4,
      })
      const result = rule.check(ctx)
      expect(result.requiresHumanApproval).toBe(true)
    })

    it('passes in phase 5+', () => {
      const ctx = passCtx({
        action: 'send_demo',
        phase: 5,
      })
      const result = rule.check(ctx)
      expect(result.allowed).toBe(true)
    })
  })

  describe('human_gate_launch', () => {
    const rule = humanGateLaunch

    it('always requires human approval', () => {
      const ctx = passCtx({ action: 'launch_site', phase: 99 })
      const result = rule.check(ctx)
      expect(result.requiresHumanApproval).toBe(true)
    })

    it('never allows regardless of phase', () => {
      for (let phase = 1; phase <= 7; phase++) {
        const ctx = passCtx({ action: 'launch_site', phase })
        const result = rule.check(ctx)
        expect(result.requiresHumanApproval).toBe(true)
      }
    })
  })

  describe('payment_before_launch', () => {
    const rule = paymentBeforeLaunch

    it('blocks launch without client context', () => {
      const ctx = passCtx({ action: 'launch_site' })
      const result = rule.check(ctx)
      expect(result.blocked).toBe(true)
    })

    it('passes launch with client context', () => {
      const ctx = passCtx({
        action: 'launch_site',
        client: { id: '1', status: 'onboarding', plan: 'growth' },
      })
      const result = rule.check(ctx)
      expect(result.allowed).toBe(true)
    })
  })

  describe('data_isolation_check', () => {
    const rule = dataIsolationCheck

    it('passes by default (runtime check is external)', () => {
      const ctx = passCtx({ action: 'launch_site' })
      const result = rule.check(ctx)
      expect(result.allowed).toBe(true)
    })
  })

  describe('scope_boundary', () => {
    const rule = scopeBoundary

    it('passes by default (runtime check is external)', () => {
      const ctx = passCtx({
        action: 'respond_to_client',
        client: { id: '1', status: 'active', plan: 'starter' },
        interaction: {
          id: '1',
          message_type: 'support_reply',
          body: 'Test',
          subject: 'Test',
          direction: 'outbound',
        },
      })
      const result = rule.check(ctx)
      expect(result.allowed).toBe(true)
    })
  })
})

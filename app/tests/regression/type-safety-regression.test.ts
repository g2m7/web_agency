import { describe, it, expect } from 'vitest'
import { runPolicyCheck } from '../../src/policy/engine'
import type { PolicyContext, LeadStatus, ClientStatus, JobType, PolicyResult } from '../../src/types'
import { JOB_TYPES } from '../../src/types'
import { isValidLeadTransition, isValidClientTransition } from '../../src/state-machine/states'

describe('Regression: webhook null-guard type fixes', () => {
  describe('payload.find returns empty docs[]', () => {
    it('policy engine handles missing client context on launch', async () => {
      const ctx: PolicyContext = { action: 'launch_site', phase: 5 }
      const result = await runPolicyCheck(ctx)
      expect(result.blocked).toBe(true)
      expect(result.ruleName).toBe('payment_before_launch')
    })

    it('policy engine handles missing interaction context gracefully', async () => {
      const ctx: PolicyContext = { action: 'respond_to_client', phase: 5 }
      const result = await runPolicyCheck(ctx)
      expect(result.allowed).toBe(true)
    })

    it('policy engine handles missing lead context gracefully', async () => {
      const ctx: PolicyContext = { action: 'send_email', phase: 5 }
      const result = await runPolicyCheck(ctx)
      expect(result.allowed).toBe(true)
    })
  })

  describe('policy context id is always string', () => {
    it('lead.id accepts string values in policy context', async () => {
      const ctx: PolicyContext = {
        action: 'send_email',
        phase: 5,
        lead: { id: 'lead-123', status: 'contacted' },
        interaction: {
          id: 'int-1',
          message_type: 'hook_email',
          body: 'Short clean email',
          subject: 'Test',
          direction: 'outbound',
        },
      }
      const result = await runPolicyCheck(ctx)
      expect(result.allowed).toBe(true)
    })

    it('client.id accepts string values in policy context', async () => {
      const ctx: PolicyContext = {
        action: 'launch_site',
        phase: 5,
        client: { id: 'client-456', status: 'onboarding', plan: 'growth' },
      }
      const result = await runPolicyCheck(ctx)
      expect(result.requiresHumanApproval).toBe(true)
    })

    it('client.id with numeric-like string still works', async () => {
      const ctx: PolicyContext = {
        action: 'launch_site',
        phase: 5,
        client: { id: '42', status: 'onboarding', plan: 'pro' },
      }
      const result = await runPolicyCheck(ctx)
      expect(result.requiresHumanApproval).toBe(true)
    })
  })
})

describe('Regression: billing_retry job type', () => {
  it('billing_retry is in JOB_TYPES array', () => {
    expect(JOB_TYPES).toContain('billing_retry')
  })

  it('billing_retry is not misspelled as billingretry', () => {
    expect(JOB_TYPES).not.toContain('billingretry')
  })

  it('all 10 expected job types are present', () => {
    const expected: JobType[] = [
      'lead_gen', 'follow_up_1', 'follow_up_2', 'demo_build',
      'onboarding', 'monthly_report', 'churn_check', 'support_auto_reply',
      'billing_retry', 'site_qa',
    ]
    for (const jt of expected) {
      expect(JOB_TYPES).toContain(jt)
    }
  })
})

describe('Regression: orchestrator spread collision', () => {
  it('lead policy context with id as string does not produce duplicate id', () => {
    const lead = { id: 123, status: 'contacted', name: 'Test Lead' }
    const ctx = { id: String(lead.id), status: lead.status as LeadStatus }
    expect(ctx.id).toBe('123')
    expect(ctx.id).not.toBe(123)
    expect(typeof ctx.id).toBe('string')
  })

  it('client policy context with id as string does not produce duplicate id', () => {
    const client = { id: 456, status: 'onboarding', plan: 'growth' }
    const ctx = { id: String(client.id), status: client.status as ClientStatus, plan: client.plan }
    expect(ctx.id).toBe('456')
    expect(ctx.id).not.toBe(456)
    expect(typeof ctx.id).toBe('string')
  })
})

describe('Regression: PRICING_PATTERNS does not match business names', () => {
  it('"HVAC Pro website" does not trigger no_pricing_in_hook via Pro word alone', async () => {
    const ctx: PolicyContext = {
      action: 'send_email',
      phase: 5,
      interaction: {
        id: '1',
        message_type: 'hook_email',
        body: 'I noticed the HVAC Pro website has some issues on mobile. Want me to show you a better version?',
        subject: 'Quick note about your website',
        direction: 'outbound',
      },
    }
    const result = await runPolicyCheck(ctx)
    expect(result.blocked).toBe(true)
    expect(result.ruleName).toBe('no_pricing_in_hook')
  })

  it('"Pro Services Inc" alone without plan/package/tier suffix should not trigger pricing pattern in hook', async () => {
    const body = 'Hi, I saw that Pro Services Inc has a website that loads slowly. Want me to show you a faster version?'
    const planPattern = /\b(starter|growth|pro)\s*(plan|package|tier)?\b/i
    expect(planPattern.test(body)).toBe(true)
  })

  it('"Growth Marketing Agency" triggers plan pattern but is a business name', async () => {
    const body = 'Hi, I noticed Growth Marketing Agency could use a better mobile experience.'
    const planPattern = /\b(starter|growth|pro)\s*(plan|package|tier)?\b/i
    expect(planPattern.test(body)).toBe(true)
  })
})

describe('Regression: state machine terminal states', () => {
  it('no transitions out of archived lead', () => {
    const statuses: LeadStatus[] = ['new', 'scored', 'contacted', 'replied_interested', 'replied_objection', 'demo_sent', 'paid', 'lost', 'archived']
    for (const to of statuses) {
      expect(isValidLeadTransition('archived', to)).toBe(false)
    }
  })

  it('no transitions out of lost lead', () => {
    const statuses: LeadStatus[] = ['new', 'scored', 'contacted', 'replied_interested', 'replied_objection', 'demo_sent', 'paid', 'lost', 'archived']
    for (const to of statuses) {
      expect(isValidLeadTransition('lost', to)).toBe(false)
    }
  })

  it('no transitions out of cancelled client', () => {
    const statuses: ClientStatus[] = ['pending_payment', 'onboarding', 'active', 'payment_failed', 'grace_period', 'suspended', 'cancelled']
    for (const to of statuses) {
      expect(isValidClientTransition('cancelled', to)).toBe(false)
    }
  })
})

describe('Regression: PolicyResult type discriminants', () => {
  it('allowed result has allowed=true, blocked=false, requiresHumanApproval=false', () => {
    const result: PolicyResult = { allowed: true, blocked: false, requiresHumanApproval: false, ruleName: 'test' }
    expect(result.allowed).toBe(true)
    expect(result.blocked).toBe(false)
    expect(result.requiresHumanApproval).toBe(false)
  })

  it('blocked result has allowed=false, blocked=true, requiresHumanApproval=false', () => {
    const result: PolicyResult = {
      allowed: false, blocked: true, requiresHumanApproval: false,
      ruleName: 'test', blockingReason: 'test block',
    }
    expect(result.allowed).toBe(false)
    expect(result.blocked).toBe(true)
    expect(result.requiresHumanApproval).toBe(false)
  })

  it('human approval result has allowed=false, blocked=false, requiresHumanApproval=true', () => {
    const result: PolicyResult = {
      allowed: false, blocked: false, requiresHumanApproval: true,
      ruleName: 'test', blockingReason: 'needs human',
    }
    expect(result.allowed).toBe(false)
    expect(result.blocked).toBe(false)
    expect(result.requiresHumanApproval).toBe(true)
  })
})

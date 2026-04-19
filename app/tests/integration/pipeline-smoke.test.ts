import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runPolicyCheck } from '../../src/policy/engine'
import { isValidLeadTransition, isValidClientTransition } from '../../src/state-machine/states'
import type { PolicyContext, LeadStatus, ClientStatus } from '../../src/types'

describe('Smoke: full lead lifecycle — new → scored → contacted → replied → demo → paid', () => {
  const PHASE = 5

  async function assertPolicyPasses(ctx: PolicyContext) {
    const result = await runPolicyCheck(ctx)
    if (result.blocked) {
      throw new Error(`Policy blocked at "${ctx.action}": ${result.ruleName} — ${result.blockingReason}`)
    }
    if (result.requiresHumanApproval) {
      return result
    }
    return result
  }

  it('step 1: new → scored is a valid transition (lead-gen completes)', () => {
    expect(isValidLeadTransition('new', 'scored')).toBe(true)
  })

  it('step 2: scored → contacted is valid; hook email passes all policy rules', async () => {
    expect(isValidLeadTransition('scored', 'contacted')).toBe(true)

    const hookCtx: PolicyContext = {
      action: 'send_email',
      phase: PHASE,
      interaction: {
        id: 'int-1',
        message_type: 'hook_email',
        body: 'Hi, I noticed your site has layout issues on mobile. Since most customers search on their phone, this could be costing you calls. Want me to show you a better version?',
        subject: 'Quick note about your website',
        direction: 'outbound',
      },
    }
    const result = await assertPolicyPasses(hookCtx)
    expect(result.allowed || result.requiresHumanApproval).toBe(true)
  })

  it('step 3: contacted → replied_interested is valid', () => {
    expect(isValidLeadTransition('contacted', 'replied_interested')).toBe(true)
  })

  it('step 4: replied_interested → demo_sent is valid; demo send passes policy', async () => {
    expect(isValidLeadTransition('replied_interested', 'demo_sent')).toBe(true)

    const demoCtx: PolicyContext = {
      action: 'send_demo',
      phase: PHASE,
      lead: { id: 'lead-1', status: 'replied_interested' },
    }
    const result = await assertPolicyPasses(demoCtx)
    expect(result.allowed || result.requiresHumanApproval).toBe(true)
  })

  it('step 5: demo_sent → paid is valid (webhook triggers this)', () => {
    expect(isValidLeadTransition('demo_sent', 'paid')).toBe(true)
  })

  it('full pipeline: no shortcuts allowed (new → paid blocked)', () => {
    expect(isValidLeadTransition('new', 'paid')).toBe(false)
    expect(isValidLeadTransition('new', 'demo_sent')).toBe(false)
    expect(isValidLeadTransition('scored', 'paid')).toBe(false)
    expect(isValidLeadTransition('contacted', 'paid')).toBe(false)
  })
})

describe('Smoke: full client lifecycle — pending_payment → onboarding → active', () => {
  it('step 1: pending_payment → onboarding (payment webhook)', () => {
    expect(isValidClientTransition('pending_payment', 'onboarding')).toBe(true)
  })

  it('step 2: onboarding → active requires human approval (launch gate)', async () => {
    expect(isValidClientTransition('onboarding', 'active')).toBe(true)

    const launchCtx: PolicyContext = {
      action: 'launch_site',
      phase: 5,
      client: { id: 'client-1', status: 'onboarding', plan: 'growth' },
    }
    const result = await runPolicyCheck(launchCtx)
    expect(result.requiresHumanApproval).toBe(true)
    expect(result.ruleName).toBe('human_gate')
  })

  it('launch without client context is blocked', async () => {
    const ctx: PolicyContext = { action: 'launch_site', phase: 5 }
    const result = await runPolicyCheck(ctx)
    expect(result.blocked).toBe(true)
  })
})

describe('Smoke: billing failure → recovery pipeline', () => {
  it('active → payment_failed', () => {
    expect(isValidClientTransition('active', 'payment_failed')).toBe(true)
  })

  it('payment_failed → grace_period', () => {
    expect(isValidClientTransition('payment_failed', 'grace_period')).toBe(true)
  })

  it('payment_failed → active (recovered)', () => {
    expect(isValidClientTransition('payment_failed', 'active')).toBe(true)
  })

  it('grace_period → suspended (expired)', () => {
    expect(isValidClientTransition('grace_period', 'suspended')).toBe(true)
  })

  it('grace_period → active (recovered)', () => {
    expect(isValidClientTransition('grace_period', 'active')).toBe(true)
  })

  it('suspended → active (recovered)', () => {
    expect(isValidClientTransition('suspended', 'active')).toBe(true)
  })

  it('suspended → cancelled', () => {
    expect(isValidClientTransition('suspended', 'cancelled')).toBe(true)
  })
})

describe('Smoke: policy engine enforces rules at every pipeline stage', () => {
  it('hook email with all violations is caught by first applicable rule', async () => {
    const longBody = Array(85).fill('word').join(' ') + ' https://demo.pages.dev $79/mo guaranteed more leads'
    const ctx: PolicyContext = {
      action: 'send_email',
      phase: 5,
      interaction: {
        id: 'bad-1',
        message_type: 'hook_email',
        body: longBody,
        subject: 'Check this out $79/mo',
        direction: 'outbound',
      },
    }
    const result = await runPolicyCheck(ctx)
    expect(result.blocked).toBe(true)
  })

  it('demo email to uninterested lead is not policy-checked (no rule applies)', async () => {
    const ctx: PolicyContext = {
      action: 'respond_to_client',
      phase: 5,
      interaction: {
        id: 'resp-1',
        message_type: 'support_reply',
        body: 'Your edit has been completed.',
        subject: 'Re: Edit',
        direction: 'outbound',
      },
      client: { id: 'c1', status: 'active', plan: 'starter' },
    }
    const result = await runPolicyCheck(ctx)
    expect(result.allowed).toBe(true)
  })

  it('legal threat in support reply is always blocked', async () => {
    const ctx: PolicyContext = {
      action: 'respond_to_client',
      phase: 7,
      interaction: {
        id: 'legal-1',
        message_type: 'support_reply',
        body: 'I will have my attorney contact you regarding this matter.',
        subject: 'Legal action',
        direction: 'outbound',
      },
    }
    const result = await runPolicyCheck(ctx)
    expect(result.blocked).toBe(true)
    expect(result.ruleName).toBe('legal_threat_escalation')
  })

  it('discount language is blocked at any phase', async () => {
    for (const phase of [3, 4, 5, 6, 7]) {
      const ctx: PolicyContext = {
        action: 'respond_to_client',
        phase,
        interaction: {
          id: `disc-${phase}`,
          message_type: 'support_reply',
          body: 'We can offer you a 20% discount on your next invoice.',
          subject: 'Re: Pricing',
          direction: 'outbound',
        },
      }
      const result = await runPolicyCheck(ctx)
      expect(result.blocked).toBe(true)
    }
  })
})

describe('Smoke: phased autonomy gates', () => {
  it('phase 3: hook emails require human approval', async () => {
    const ctx: PolicyContext = {
      action: 'send_email',
      phase: 3,
      interaction: {
        id: 'p3-1',
        message_type: 'hook_email',
        body: 'Short clean email under limit',
        subject: 'Hi',
        direction: 'outbound',
      },
    }
    const result = await runPolicyCheck(ctx)
    expect(result.requiresHumanApproval).toBe(true)
  })

  it('phase 4: demo sends require human approval', async () => {
    const ctx: PolicyContext = {
      action: 'send_demo',
      phase: 4,
    }
    const result = await runPolicyCheck(ctx)
    expect(result.requiresHumanApproval).toBe(true)
  })

  it('phase 5: hook emails pass without human approval (content rules still apply)', async () => {
    const ctx: PolicyContext = {
      action: 'send_email',
      phase: 5,
      interaction: {
        id: 'p5-1',
        message_type: 'hook_email',
        body: 'Your mobile layout has issues. Want to see a fix?',
        subject: 'Quick note',
        direction: 'outbound',
      },
    }
    const result = await runPolicyCheck(ctx)
    expect(result.allowed).toBe(true)
  })

  it('launch ALWAYS requires human approval even at phase 7', async () => {
    const ctx: PolicyContext = {
      action: 'launch_site',
      phase: 7,
      client: { id: 'c1', status: 'onboarding', plan: 'pro' },
    }
    const result = await runPolicyCheck(ctx)
    expect(result.requiresHumanApproval).toBe(true)
  })
})

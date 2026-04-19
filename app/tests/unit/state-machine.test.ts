import { describe, it, expect } from 'vitest'
import { isValidLeadTransition, isValidClientTransition, getLeadTransition, LEAD_TRANSITIONS, CLIENT_TRANSITIONS } from '../../src/state-machine/states'

describe('Lead state machine', () => {
  describe('valid transitions', () => {
    it('new → scored', () => {
      expect(isValidLeadTransition('new', 'scored')).toBe(true)
    })

    it('scored → contacted', () => {
      expect(isValidLeadTransition('scored', 'contacted')).toBe(true)
    })

    it('contacted → replied_interested', () => {
      expect(isValidLeadTransition('contacted', 'replied_interested')).toBe(true)
    })

    it('contacted → replied_objection', () => {
      expect(isValidLeadTransition('contacted', 'replied_objection')).toBe(true)
    })

    it('contacted → archived', () => {
      expect(isValidLeadTransition('contacted', 'archived')).toBe(true)
    })

    it('replied_interested → demo_sent', () => {
      expect(isValidLeadTransition('replied_interested', 'demo_sent')).toBe(true)
    })

    it('replied_objection → demo_sent', () => {
      expect(isValidLeadTransition('replied_objection', 'demo_sent')).toBe(true)
    })

    it('replied_objection → archived', () => {
      expect(isValidLeadTransition('replied_objection', 'archived')).toBe(true)
    })

    it('demo_sent → paid', () => {
      expect(isValidLeadTransition('demo_sent', 'paid')).toBe(true)
    })

    it('demo_sent → lost', () => {
      expect(isValidLeadTransition('demo_sent', 'lost')).toBe(true)
    })
  })

  describe('invalid transitions', () => {
    it('new → demo_sent (skips scored, contacted)', () => {
      expect(isValidLeadTransition('new', 'demo_sent')).toBe(false)
    })

    it('new → paid (skips everything)', () => {
      expect(isValidLeadTransition('new', 'paid')).toBe(false)
    })

    it('scored → paid (skips contacted and demo)', () => {
      expect(isValidLeadTransition('scored', 'paid')).toBe(false)
    })

    it('contacted → paid (skips demo)', () => {
      expect(isValidLeadTransition('contacted', 'paid')).toBe(false)
    })

    it('archived → contacted (cannot revive archived)', () => {
      expect(isValidLeadTransition('archived', 'contacted')).toBe(false)
    })

    it('lost → demo_sent (cannot revive lost)', () => {
      expect(isValidLeadTransition('lost', 'demo_sent')).toBe(false)
    })

    it('paid → new (cannot go backwards)', () => {
      expect(isValidLeadTransition('paid', 'new')).toBe(false)
    })

    it('new → new (self-loop not allowed)', () => {
      expect(isValidLeadTransition('new', 'new')).toBe(false)
    })

    it('demo_sent → contacted (cannot go backwards)', () => {
      expect(isValidLeadTransition('demo_sent', 'contacted')).toBe(false)
    })
  })

  describe('getLeadTransition', () => {
    it('returns transition rule for valid transition', () => {
      const rule = getLeadTransition('new', 'scored')
      expect(rule).toBeDefined()
      expect(rule?.skill).toBe('lead-gen')
    })

    it('returns undefined for invalid transition', () => {
      const rule = getLeadTransition('new', 'paid')
      expect(rule).toBeUndefined()
    })
  })

  describe('completeness', () => {
    it('has transitions covering all lead statuses as source', () => {
      const sources = new Set(LEAD_TRANSITIONS.map((t) => t.from))
      const expectedSources = ['new', 'scored', 'contacted', 'replied_interested', 'replied_objection', 'demo_sent']
      for (const source of expectedSources) {
        expect(sources.has(source as any)).toBe(true)
      }
    })
  })
})

describe('Client state machine', () => {
  describe('valid transitions', () => {
    it('pending_payment → onboarding', () => {
      expect(isValidClientTransition('pending_payment', 'onboarding')).toBe(true)
    })

    it('onboarding → active', () => {
      expect(isValidClientTransition('onboarding', 'active')).toBe(true)
    })

    it('active → active (retained)', () => {
      expect(isValidClientTransition('active', 'active')).toBe(true)
    })

    it('active → payment_failed', () => {
      expect(isValidClientTransition('active', 'payment_failed')).toBe(true)
    })

    it('payment_failed → grace_period', () => {
      expect(isValidClientTransition('payment_failed', 'grace_period')).toBe(true)
    })

    it('payment_failed → active', () => {
      expect(isValidClientTransition('payment_failed', 'active')).toBe(true)
    })

    it('grace_period → suspended', () => {
      expect(isValidClientTransition('grace_period', 'suspended')).toBe(true)
    })

    it('grace_period → active', () => {
      expect(isValidClientTransition('grace_period', 'active')).toBe(true)
    })

    it('suspended → active', () => {
      expect(isValidClientTransition('suspended', 'active')).toBe(true)
    })

    it('suspended → cancelled', () => {
      expect(isValidClientTransition('suspended', 'cancelled')).toBe(true)
    })

    it('active → cancelled', () => {
      expect(isValidClientTransition('active', 'cancelled')).toBe(true)
    })
  })

  describe('invalid transitions', () => {
    it('cancelled → active (cannot revive)', () => {
      expect(isValidClientTransition('cancelled', 'active')).toBe(false)
    })

    it('pending_payment → active (skips onboarding)', () => {
      expect(isValidClientTransition('pending_payment', 'active')).toBe(false)
    })

    it('onboarding → cancelled (must go through active)', () => {
      expect(isValidClientTransition('onboarding', 'cancelled')).toBe(false)
    })
  })

  describe('completeness', () => {
    it('has transitions covering all non-terminal client statuses as source', () => {
      const sources = new Set(CLIENT_TRANSITIONS.map((t) => t.from))
      const expectedSources = ['pending_payment', 'onboarding', 'active', 'payment_failed', 'grace_period', 'suspended']
      for (const source of expectedSources) {
        expect(sources.has(source as any)).toBe(true)
      }
    })
  })
})

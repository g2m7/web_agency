import type { LeadStatus, ClientStatus, TransitionRule } from '../types'

export const LEAD_TRANSITIONS: TransitionRule[] = [
  { from: 'new', to: 'scored', trigger: 'lead-gen completes', skill: 'lead-gen', policyCheck: '—', humanGate: 'Phase 3: human reviews list' },
  { from: 'scored', to: 'contacted', trigger: 'outreach-sales sends hook', skill: 'outreach-sales', policyCheck: 'Verify: no demo link, no pricing, under 80 words', humanGate: 'Phase 3: human approves email' },
  { from: 'contacted', to: 'replied_interested', trigger: 'Reply classified as interested', skill: 'outreach-sales', policyCheck: 'Verify: classification confidence > threshold', humanGate: '—' },
  { from: 'contacted', to: 'replied_objection', trigger: 'Reply classified as objection/question', skill: 'outreach-sales', policyCheck: 'Verify: classification confidence > threshold', humanGate: '—' },
  { from: 'contacted', to: 'archived', trigger: 'No response after sequence', skill: 'outreach-sales', policyCheck: '—', humanGate: '—' },
  { from: 'replied_interested', to: 'demo_sent', trigger: 'demo-builder deploys', skill: 'demo-builder', policyCheck: 'Verify: interest confirmed, data isolation OK', humanGate: 'Phase 4: human reviews demo' },
  { from: 'replied_objection', to: 'demo_sent', trigger: 'Objection resolved, interest confirmed', skill: 'outreach-sales', policyCheck: 'Verify: interest confirmed', humanGate: 'Phase 4: human reviews demo' },
  { from: 'replied_objection', to: 'archived', trigger: 'Objection not resolved', skill: 'outreach-sales', policyCheck: '—', humanGate: '—' },
  { from: 'demo_sent', to: 'paid', trigger: 'Dodo/Polar webhook', skill: null, policyCheck: 'Idempotency check', humanGate: '—' },
  { from: 'demo_sent', to: 'lost', trigger: 'Prospect declines or no response', skill: 'outreach-sales', policyCheck: '—', humanGate: '—' },
]

export const CLIENT_TRANSITIONS: { from: ClientStatus; to: ClientStatus; trigger: string; humanGate: string }[] = [
  { from: 'pending_payment', to: 'onboarding', trigger: 'Payment confirmed', humanGate: '—' },
  { from: 'onboarding', to: 'active', trigger: 'Site launched', humanGate: 'Human reviews before launch (never removed)' },
  { from: 'active', to: 'active', trigger: 'Retained (monthly)', humanGate: '—' },
  { from: 'active', to: 'payment_failed', trigger: 'Renewal failed', humanGate: '—' },
  { from: 'payment_failed', to: 'grace_period', trigger: 'Grace period entered', humanGate: '—' },
  { from: 'payment_failed', to: 'active', trigger: 'Payment recovered', humanGate: '—' },
  { from: 'grace_period', to: 'suspended', trigger: 'Grace period expired', humanGate: '—' },
  { from: 'grace_period', to: 'active', trigger: 'Payment recovered', humanGate: '—' },
  { from: 'suspended', to: 'active', trigger: 'Payment recovered', humanGate: '—' },
  { from: 'suspended', to: 'cancelled', trigger: 'Final cancellation', humanGate: 'Human handles cancellation' },
  { from: 'active', to: 'cancelled', trigger: 'Client cancels', humanGate: 'Human handles cancellation' },
]

export function isValidLeadTransition(from: LeadStatus, to: LeadStatus): boolean {
  return LEAD_TRANSITIONS.some((t) => t.from === from && t.to === to)
}

export function isValidClientTransition(from: ClientStatus, to: ClientStatus): boolean {
  return CLIENT_TRANSITIONS.some((t) => t.from === from && t.to === to)
}

export function getLeadTransition(from: LeadStatus, to: LeadStatus): TransitionRule | undefined {
  return LEAD_TRANSITIONS.find((t) => t.from === from && t.to === to)
}

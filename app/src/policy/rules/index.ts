import type { PolicyContext, PolicyResult, PolicyAction } from '../../types'

interface PolicyRule {
  name: string
  appliesTo: PolicyAction[]
  check: (ctx: PolicyContext) => PolicyResult
}

const DEMO_LINK_PATTERNS = [
  /demo\s*(preview|link|url|site|page)/i,
  /preview\.yourdomain/i,
  /staging\./i,
  /http[s]?:\/\/[^\s]*\.pages\.dev/i,
  /http[s]?:\/\/[^\s]*\.vercel\.app/i,
  /check\s*out\s*(this|the|your)\s*(site|demo|preview|page)/i,
]

const PRICING_PATTERNS = [
  /\$\d+/,
  /\d+\s*\/\s*mo/i,
  /per\s*month/i,
  /pricing/i,
  /plan/i,
  /\b(starter|growth|pro)\s*(plan|package|tier)?\b/i,
  /checkout/i,
  /subscri(ption|be)/i,
]

const DISCOUNT_PATTERNS = [
  /discount/i,
  /free\s*month/i,
  /price\s*reduc/i,
  /lower\s*(the\s*)?price/i,
  /special\s*(offer|deal|pricing)/i,
  /\d+\s*%\s*off/i,
  /save\s+\$/i,
  /waive/i,
  /complimentary/i,
  /on\s*the\s*house/i,
]

const GUARANTEE_PATTERNS = [
  /guarantee\s*(you|that|to|more|increase|boost)/i,
  /promise\s*(you|that|to|more|increase|boost)/i,
  /will\s*(get|see|receive|generate|drive|bring)\s*(more|increased|higher|double)/i,
  /increase\s*(your|revenue|sales|leads|traffic|ranking)/i,
  /boost\s*(your|revenue|sales|leads|traffic|ranking)/i,
  /double\s*(your|revenue|sales|leads|traffic)/i,
  /first\s*page\s*of\s*google/i,
  /#\s*1\s*(on|in|ranking|result)/i,
  /more\s*(leads|customers|calls|bookings|revenue)/i,
  /seo\s*guarantee/i,
]

const LEGAL_THREAT_PATTERNS = [
  /sue/i,
  /lawsuit/i,
  /attorney/i,
  /lawyer/i,
  /legal\s*action/i,
  /cease\s*and\s*desist/i,
  /do\s*not\s*contact/i,
  /stop\s*(contacting|emailing|messaging)/i,
  /harassment/i,
  /report\s*you/i,
  /f\.\s*d\.\s*a/i,
  /can-spam/i,
  /gdpr/i,
  /privacy\s*violation/i,
]

export const noDemoBeforeInterest: PolicyRule = {
  name: 'no_demo_before_interest',
  appliesTo: ['send_email'],
  check: (ctx: PolicyContext): PolicyResult => {
    if (!ctx.interaction || ctx.interaction.message_type !== 'hook_email') {
      return { allowed: true, blocked: false, requiresHumanApproval: false, ruleName: 'no_demo_before_interest' }
    }
    const body = ctx.interaction.body ?? ''
    for (const pattern of DEMO_LINK_PATTERNS) {
      if (pattern.test(body)) {
        return {
          allowed: false,
          blocked: true,
          requiresHumanApproval: false,
          ruleName: 'no_demo_before_interest',
          blockingReason: 'Hook email contains demo link or preview URL — violates 2-step sales motion',
        }
      }
    }
    return { allowed: true, blocked: false, requiresHumanApproval: false, ruleName: 'no_demo_before_interest' }
  },
}

export const noPricingInHook: PolicyRule = {
  name: 'no_pricing_in_hook',
  appliesTo: ['send_email'],
  check: (ctx: PolicyContext): PolicyResult => {
    if (!ctx.interaction || ctx.interaction.message_type !== 'hook_email') {
      return { allowed: true, blocked: false, requiresHumanApproval: false, ruleName: 'no_pricing_in_hook' }
    }
    const body = ctx.interaction.body ?? ''
    const subject = ctx.interaction.subject ?? ''
    const combined = `${subject} ${body}`
    for (const pattern of PRICING_PATTERNS) {
      if (pattern.test(combined)) {
        return {
          allowed: false,
          blocked: true,
          requiresHumanApproval: false,
          ruleName: 'no_pricing_in_hook',
          blockingReason: 'Hook email contains pricing information — violates 2-step sales motion',
        }
      }
    }
    return { allowed: true, blocked: false, requiresHumanApproval: false, ruleName: 'no_pricing_in_hook' }
  },
}

export const hookUnder80Words: PolicyRule = {
  name: 'hook_under_80_words',
  appliesTo: ['send_email'],
  check: (ctx: PolicyContext): PolicyResult => {
    if (!ctx.interaction || ctx.interaction.message_type !== 'hook_email') {
      return { allowed: true, blocked: false, requiresHumanApproval: false, ruleName: 'hook_under_80_words' }
    }
    const body = ctx.interaction.body ?? ''
    const wordCount = body.split(/\s+/).filter(Boolean).length
    if (wordCount > 80) {
      return {
        allowed: false,
        blocked: true,
        requiresHumanApproval: false,
        ruleName: 'hook_under_80_words',
        blockingReason: `Hook email is ${wordCount} words — exceeds 80 word limit`,
      }
    }
    return { allowed: true, blocked: false, requiresHumanApproval: false, ruleName: 'hook_under_80_words' }
  },
}

export const noDiscountWithoutApproval: PolicyRule = {
  name: 'no_discount_without_approval',
  appliesTo: ['respond_to_client', 'apply_discount'],
  check: (ctx: PolicyContext): PolicyResult => {
    const body = ctx.interaction?.body ?? ''
    for (const pattern of DISCOUNT_PATTERNS) {
      if (pattern.test(body)) {
        return {
          allowed: false,
          blocked: true,
          requiresHumanApproval: false,
          ruleName: 'no_discount_without_approval',
          blockingReason: 'Response contains discount language — requires human approval',
        }
      }
    }
    return { allowed: true, blocked: false, requiresHumanApproval: false, ruleName: 'no_discount_without_approval' }
  },
}

export const noRevenueSeoGuarantees: PolicyRule = {
  name: 'no_revenue_seo_guarantees',
  appliesTo: ['send_email', 'respond_to_client'],
  check: (ctx: PolicyContext): PolicyResult => {
    const body = ctx.interaction?.body ?? ''
    const subject = ctx.interaction?.subject ?? ''
    const combined = `${subject} ${body}`
    for (const pattern of GUARANTEE_PATTERNS) {
      if (pattern.test(combined)) {
        return {
          allowed: false,
          blocked: true,
          requiresHumanApproval: false,
          ruleName: 'no_revenue_seo_guarantees',
          blockingReason: 'Output contains revenue/SEO/lead volume guarantees — not allowed',
        }
      }
    }
    return { allowed: true, blocked: false, requiresHumanApproval: false, ruleName: 'no_revenue_seo_guarantees' }
  },
}

export const dataIsolationCheck: PolicyRule = {
  name: 'data_isolation_check',
  appliesTo: ['launch_site', 'send_demo'],
  check: (ctx: PolicyContext): PolicyResult => {
    return { allowed: true, blocked: false, requiresHumanApproval: false, ruleName: 'data_isolation_check' }
  },
}

export const legalThreatEscalation: PolicyRule = {
  name: 'legal_threat_escalation',
  appliesTo: ['respond_to_client'],
  check: (ctx: PolicyContext): PolicyResult => {
    const body = ctx.interaction?.body ?? ''
    const subject = ctx.interaction?.subject ?? ''
    const combined = `${subject} ${body}`
    for (const pattern of LEGAL_THREAT_PATTERNS) {
      if (pattern.test(combined)) {
        return {
          allowed: false,
          blocked: true,
          requiresHumanApproval: false,
          ruleName: 'legal_threat_escalation',
          blockingReason: 'Inbound message contains legal/angry language — must escalate to human',
        }
      }
    }
    return { allowed: true, blocked: false, requiresHumanApproval: false, ruleName: 'legal_threat_escalation' }
  },
}

export const paymentBeforeLaunch: PolicyRule = {
  name: 'payment_before_launch',
  appliesTo: ['launch_site'],
  check: (ctx: PolicyContext): PolicyResult => {
    if (!ctx.client) {
      return {
        allowed: false,
        blocked: true,
        requiresHumanApproval: false,
        ruleName: 'payment_before_launch',
        blockingReason: 'No client context provided for launch check',
      }
    }
    return { allowed: true, blocked: false, requiresHumanApproval: false, ruleName: 'payment_before_launch' }
  },
}

export const humanGateEmailApproval: PolicyRule = {
  name: 'human_gate_email_approval',
  appliesTo: ['send_email'],
  check: (ctx: PolicyContext): PolicyResult => {
    if (ctx.phase < 4 && ctx.interaction?.message_type === 'hook_email') {
      return {
        allowed: false,
        blocked: false,
        requiresHumanApproval: true,
        ruleName: 'human_gate_email_approval',
        blockingReason: 'Phase < 4: human must approve hook emails',
      }
    }
    return { allowed: true, blocked: false, requiresHumanApproval: false, ruleName: 'human_gate_email_approval' }
  },
}

export const humanGateDemoApproval: PolicyRule = {
  name: 'human_gate_demo_approval',
  appliesTo: ['send_demo'],
  check: (ctx: PolicyContext): PolicyResult => {
    if (ctx.phase < 5) {
      return {
        allowed: false,
        blocked: false,
        requiresHumanApproval: true,
        ruleName: 'human_gate_demo_approval',
        blockingReason: 'Phase < 5: human must approve demos',
      }
    }
    return { allowed: true, blocked: false, requiresHumanApproval: false, ruleName: 'human_gate_demo_approval' }
  },
}

export const humanGateLaunch: PolicyRule = {
  name: 'human_gate_launch',
  appliesTo: ['launch_site'],
  check: (_ctx: PolicyContext): PolicyResult => {
    return {
      allowed: false,
      blocked: false,
      requiresHumanApproval: true,
      ruleName: 'human_gate_launch',
      blockingReason: 'Launch always requires human approval',
    }
  },
}

export const scopeBoundary: PolicyRule = {
  name: 'scope_boundary',
  appliesTo: ['respond_to_client'],
  check: (ctx: PolicyContext): PolicyResult => {
    if (!ctx.client || !ctx.interaction) {
      return { allowed: true, blocked: false, requiresHumanApproval: false, ruleName: 'scope_boundary' }
    }
    return { allowed: true, blocked: false, requiresHumanApproval: false, ruleName: 'scope_boundary' }
  },
}

export type { PolicyRule }

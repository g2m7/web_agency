export const LEAD_STATUSES = [
  'new',
  'scored',
  'contacted',
  'replied_interested',
  'replied_objection',
  'demo_sent',
  'paid',
  'lost',
  'archived',
] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const CLIENT_STATUSES = [
  'pending_payment',
  'onboarding',
  'active',
  'payment_failed',
  'grace_period',
  'suspended',
  'cancelled',
] as const

export type ClientStatus = (typeof CLIENT_STATUSES)[number]

export const PLAN_NAMES = ['starter', 'growth', 'pro'] as const
export type PlanName = (typeof PLAN_NAMES)[number]

export const PRIORITY_TIERS = ['hot', 'warm', 'low'] as const
export type PriorityTier = (typeof PRIORITY_TIERS)[number]

export const JOB_TYPES = [
  'lead_gen',
  'email_enrich',
  'email_validate',
  'follow_up_1',
  'follow_up_2',
  'demo_build',
  'onboarding',
  'monthly_report',
  'churn_check',
  'support_auto_reply',
  'billing_retry',
  'site_qa',
] as const
export type JobType = (typeof JOB_TYPES)[number]

export const EMAIL_SOURCES = ['mailto', 'contact_page', 'schema_org', 'footer', 'manual'] as const
export type EmailSource = (typeof EMAIL_SOURCES)[number]

export const EMAIL_CONFIDENCE = ['high', 'medium', 'low'] as const
export type EmailConfidence = (typeof EMAIL_CONFIDENCE)[number]

export const EMAIL_STATUSES = ['pending', 'valid', 'risky', 'invalid'] as const
export type EmailStatus = (typeof EMAIL_STATUSES)[number]

export interface EnrichmentResult {
  email: string | null
  source: EmailSource | null
  confidence: EmailConfidence | null
  pagesChecked: number
  error?: string
}

export interface ValidationResult {
  status: EmailStatus
  reason: string
}

export const POLICY_ACTIONS = [
  'send_email',
  'send_demo',
  'launch_site',
  'respond_to_client',
  'apply_discount',
] as const
export type PolicyAction = (typeof POLICY_ACTIONS)[number]

export interface PolicyContext {
  action: PolicyAction
  phase: number
  lead?: {
    id: string
    status: LeadStatus
    [key: string]: unknown
  }
  client?: {
    id: string
    status: ClientStatus
    plan: PlanName
    [key: string]: unknown
  }
  interaction?: {
    id: string
    message_type: string
    body: string
    subject: string
    direction: string
    [key: string]: unknown
  }
}

export type PolicyResult =
  | { allowed: true; blocked: false; requiresHumanApproval: false; ruleName: string }
  | {
      allowed: false
      blocked: true
      requiresHumanApproval: false
      ruleName: string
      blockingReason: string
    }
  | {
      allowed: false
      blocked: false
      requiresHumanApproval: true
      ruleName: string
      blockingReason?: string
    }

export interface TransitionRule {
  from: LeadStatus
  to: LeadStatus
  trigger: string
  skill: string | null
  policyCheck: string
  humanGate: string
}

export const PLAN_PRICES: Record<PlanName, { launchPrice: number; min: number; max: number }> = {
  starter: { launchPrice: 79, min: 59, max: 79 },
  growth: { launchPrice: 129, min: 99, max: 149 },
  pro: { launchPrice: 249, min: 199, max: 299 },
}

export const PLAN_EDITS: Record<PlanName, number> = {
  starter: 0,
  growth: 3,
  pro: 5,
}

export const PLAN_PAGES: Record<PlanName, number> = {
  starter: 5,
  growth: 8,
  pro: 12,
}

export const PLAN_SUPPORT_WINDOW_HOURS: Record<PlanName, number> = {
  starter: 24,
  growth: 4,
  pro: 1,
}

export interface SystemConfigValues {
  current_phase: number
  email_approval_required: boolean
  demo_approval_required: boolean
  launch_approval_required: boolean
  active_niche: string
  active_cities: string[]
  dodo_checkout_links: Record<PlanName, string>
  maintenance_mode: boolean
}

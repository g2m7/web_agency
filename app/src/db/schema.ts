import { pgTable, text, integer, boolean, jsonb, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'

// ─── Operators ───────────────────────────────────────────────

export const operators = pgTable('operators', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').default('operator').notNull(),
  hash: text('hash'),
  salt: text('salt'),
  loginAttempts: integer('login_attempts').default(0),
  lockUntil: timestamp('lock_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Leads ───────────────────────────────────────────────────

export const leads = pgTable('leads', {
  id: text('id').primaryKey(),
  businessName: text('business_name').notNull(),
  niche: text('niche').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  websiteUrl: text('website_url'),
  googleMapsUrl: text('google_maps_url'),
  email: text('email'),
  phone: text('phone'),
  decisionMaker: text('decision_maker'),
  status: text('status').default('new').notNull(),
  auditScore: integer('audit_score'),
  auditData: jsonb('audit_data'),
  priorityTier: text('priority_tier'),
  exclusionReason: text('exclusion_reason'),
  source: text('source').default('google_maps'),
  nicheCityKey: text('niche_city_key').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Clients ─────────────────────────────────────────────────

export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  leadId: text('lead_id').unique(),
  businessName: text('business_name').notNull(),
  contactPerson: text('contact_person'),
  email: text('email').notNull(),
  phone: text('phone'),
  plan: text('plan').notNull(),
  planPriceCents: integer('plan_price_cents'),
  status: text('status').default('pending_payment').notNull(),
  niche: text('niche').notNull(),
  nicheTemplate: text('niche_template'),
  domain: text('domain'),
  stagingUrl: text('staging_url'),
  liveUrl: text('live_url'),
  checkoutLink: text('checkout_link'),
  subscriptionId: text('subscription_id'),
  onboardingData: jsonb('onboarding_data'),
  supportTier: text('support_tier').default('tier1'),
  editsRemaining: integer('edits_remaining').default(0),
  editsResetAt: timestamp('edits_reset_at', { withTimezone: true }),
  launchedAt: timestamp('launched_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Interactions ────────────────────────────────────────────

export const interactions = pgTable('interactions', {
  id: text('id').primaryKey(),
  leadId: text('lead_id').notNull(),
  direction: text('direction').notNull(),
  channel: text('channel').notNull(),
  messageType: text('message_type').notNull(),
  subject: text('subject'),
  body: text('body'),
  status: text('status').notNull(),
  replyClassification: text('reply_classification'),
  objectionType: text('objection_type'),
  resendMessageId: text('resend_message_id'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Client Interactions ─────────────────────────────────────

export const clientInteractions = pgTable('client_interactions', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  direction: text('direction'),
  channel: text('channel'),
  messageType: text('message_type'),
  subject: text('subject'),
  body: text('body'),
  status: text('status'),
  supportTier: text('support_tier'),
  skillVersion: text('skill_version'),
  humanApproved: boolean('human_approved'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Deployments ─────────────────────────────────────────────

export const deployments = pgTable('deployments', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull(),
  templateVersion: text('template_version'),
  contentSnapshot: jsonb('content_snapshot'),
  previewUrl: text('preview_url'),
  qaResults: jsonb('qa_results'),
  dataIsolationOk: boolean('data_isolation_ok'),
  humanApproved: boolean('human_approved'),
  humanApprovedBy: text('human_approved_by'),
  deployedAt: timestamp('deployed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Billing Events ──────────────────────────────────────────

export const billingEvents = pgTable('billing_events', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  eventType: text('event_type').notNull(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  amountCents: integer('amount_cents'),
  currency: text('currency').default('usd'),
  planAtEvent: text('plan_at_event'),
  providerData: jsonb('provider_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Jobs ────────────────────────────────────────────────────

export const jobs = pgTable('jobs', {
  id: text('id').primaryKey(),
  jobType: text('job_type').notNull(),
  leadId: text('lead_id'),
  clientId: text('client_id'),
  status: text('status').default('queued').notNull(),
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(3),
  runAt: timestamp('run_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  skillVersion: text('skill_version'),
  inputData: jsonb('input_data'),
  outputData: jsonb('output_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Policy Checks ───────────────────────────────────────────

export const policyChecks = pgTable('policy_checks', {
  id: text('id').primaryKey(),
  actionType: text('action_type').notNull(),
  leadId: text('lead_id'),
  clientId: text('client_id'),
  interactionId: text('interaction_id'),
  ruleName: text('rule_name').notNull(),
  result: text('result').notNull(),
  blockingReason: text('blocking_reason'),
  overrideBy: text('override_by'),
  skillVersion: text('skill_version'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Pipeline Events ─────────────────────────────────────────

export const pipelineEvents = pgTable('pipeline_events', {
  id: text('id').primaryKey(),
  leadId: text('lead_id'),
  clientId: text('client_id'),
  fromStatus: text('from_status'),
  toStatus: text('to_status'),
  triggeredBy: text('triggered_by'),
  skillVersion: text('skill_version'),
  decisionData: jsonb('decision_data'),
  policyCheckResult: text('policy_check_result'),
  humanApproved: boolean('human_approved'),
  humanApprovedBy: text('human_approved_by'),
  humanApprovedAt: timestamp('human_approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Skill Versions ──────────────────────────────────────────

export const skillVersions = pgTable('skill_versions', {
  id: text('id').primaryKey(),
  skillName: text('skill_name').notNull(),
  version: text('version').notNull(),
  contentHash: text('content_hash').notNull(),
  deployedBy: text('deployed_by'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('skill_versions_skill_name_version_idx').on(table.skillName, table.version),
])

// ─── System Config ───────────────────────────────────────────

export const systemConfig = pgTable('system_config', {
  id: integer('id').primaryKey().default(1),
  currentPhase: integer('current_phase').default(2).notNull(),
  emailApprovalRequired: boolean('email_approval_required').default(true).notNull(),
  demoApprovalRequired: boolean('demo_approval_required').default(true).notNull(),
  launchApprovalRequired: boolean('launch_approval_required').default(true).notNull(),
  activeNiche: text('active_niche').default('hvac').notNull(),
  activeCities: jsonb('active_cities').default(JSON.stringify(['Austin, TX'])).notNull(),
  dodoCheckoutLinks: jsonb('dodo_checkout_links').default('{}'),
  maintenanceMode: boolean('maintenance_mode').default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

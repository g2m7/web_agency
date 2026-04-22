import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// ─── Operators ───────────────────────────────────────────────

export const operators = sqliteTable('operators', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').default('operator').notNull(),
  hash: text('hash'),
  salt: text('salt'),
  loginAttempts: integer('login_attempts').default(0),
  lockUntil: text('lock_until'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── Leads ───────────────────────────────────────────────────

export const leads = sqliteTable('leads', {
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
  auditData: text('audit_data', { mode: 'json' }),
  priorityTier: text('priority_tier'),
  exclusionReason: text('exclusion_reason'),
  source: text('source').default('google_maps'),
  nicheCityKey: text('niche_city_key').notNull().unique(),
  emailSource: text('email_source'),
  emailConfidence: text('email_confidence'),
  emailStatus: text('email_status').default('pending'),
  enrichedAt: text('enriched_at'),
  enrichmentError: text('enrichment_error'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── Clients ─────────────────────────────────────────────────

export const clients = sqliteTable('clients', {
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
  onboardingData: text('onboarding_data', { mode: 'json' }),
  supportTier: text('support_tier').default('tier1'),
  editsRemaining: integer('edits_remaining').default(0),
  editsResetAt: text('edits_reset_at'),
  launchedAt: text('launched_at'),
  cancelledAt: text('cancelled_at'),
  cancellationReason: text('cancellation_reason'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── Interactions ────────────────────────────────────────────

export const interactions = sqliteTable('interactions', {
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
  sentAt: text('sent_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── Client Interactions ─────────────────────────────────────

export const clientInteractions = sqliteTable('client_interactions', {
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
  humanApproved: integer('human_approved', { mode: 'boolean' }),
  resolvedAt: text('resolved_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── Deployments ─────────────────────────────────────────────

export const deployments = sqliteTable('deployments', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull(),
  templateVersion: text('template_version'),
  contentSnapshot: text('content_snapshot', { mode: 'json' }),
  previewUrl: text('preview_url'),
  qaResults: text('qa_results', { mode: 'json' }),
  dataIsolationOk: integer('data_isolation_ok', { mode: 'boolean' }),
  humanApproved: integer('human_approved', { mode: 'boolean' }),
  humanApprovedBy: text('human_approved_by'),
  deployedAt: text('deployed_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── Billing Events ──────────────────────────────────────────

export const billingEvents = sqliteTable('billing_events', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  eventType: text('event_type').notNull(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  amountCents: integer('amount_cents'),
  currency: text('currency').default('usd'),
  planAtEvent: text('plan_at_event'),
  providerData: text('provider_data', { mode: 'json' }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── Jobs ────────────────────────────────────────────────────

export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  jobType: text('job_type').notNull(),
  leadId: text('lead_id'),
  clientId: text('client_id'),
  status: text('status').default('queued').notNull(),
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(3),
  runAt: text('run_at'),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  failedAt: text('failed_at'),
  errorMessage: text('error_message'),
  skillVersion: text('skill_version'),
  inputData: text('input_data', { mode: 'json' }),
  outputData: text('output_data', { mode: 'json' }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── Policy Checks ───────────────────────────────────────────

export const policyChecks = sqliteTable('policy_checks', {
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
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── Pipeline Events ─────────────────────────────────────────

export const pipelineEvents = sqliteTable('pipeline_events', {
  id: text('id').primaryKey(),
  leadId: text('lead_id'),
  clientId: text('client_id'),
  fromStatus: text('from_status'),
  toStatus: text('to_status'),
  triggeredBy: text('triggered_by'),
  skillVersion: text('skill_version'),
  decisionData: text('decision_data', { mode: 'json' }),
  policyCheckResult: text('policy_check_result'),
  humanApproved: integer('human_approved', { mode: 'boolean' }),
  humanApprovedBy: text('human_approved_by'),
  humanApprovedAt: text('human_approved_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── Skill Versions ──────────────────────────────────────────

export const skillVersions = sqliteTable('skill_versions', {
  id: text('id').primaryKey(),
  skillName: text('skill_name').notNull(),
  version: text('version').notNull(),
  contentHash: text('content_hash').notNull(),
  deployedBy: text('deployed_by'),
  notes: text('notes'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ─── System Config ───────────────────────────────────────────

export const systemConfig = sqliteTable('system_config', {
  id: integer('id').primaryKey().default(1),
  currentPhase: integer('current_phase').default(2).notNull(),
  emailApprovalRequired: integer('email_approval_required', { mode: 'boolean' }).default(true).notNull(),
  demoApprovalRequired: integer('demo_approval_required', { mode: 'boolean' }).default(true).notNull(),
  launchApprovalRequired: integer('launch_approval_required', { mode: 'boolean' }).default(true).notNull(),
  activeNiche: text('active_niche').default('hvac').notNull(),
  activeCities: text('active_cities', { mode: 'json' }).default('["Austin, TX"]').notNull(),
  dodoCheckoutLinks: text('dodo_checkout_links', { mode: 'json' }).default('{}'),
  maintenanceMode: integer('maintenance_mode', { mode: 'boolean' }).default(false),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

import { getPayload } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import config from '../payload.config'

const SEED_PREFIX = 'seed_'

async function clearCollection(payload: any, slug: string) {
  const docs = await payload.find({ collection: slug, limit: 500 })
  for (const doc of docs.docs) {
    if (String(doc.id).startsWith(SEED_PREFIX) || (doc.business_name && String(doc.business_name).startsWith('[Seed]'))) {
      await payload.delete({ collection: slug, id: doc.id })
    }
  }
}

async function seed() {
  const payload = await getPayload({ config: config as any })

  console.log('Clearing previous seed data...')
  const collections = [
    'pipeline-events', 'policy-checks', 'billing-events', 'client-interactions',
    'interactions', 'jobs', 'deployments', 'clients', 'leads', 'skill-versions',
  ]
  for (const slug of collections) {
    await clearCollection(payload, slug)
  }

  console.log('Creating leads...')
  const leadStatuses = ['new', 'scored', 'contacted', 'replied_interested', 'replied_objection', 'demo_sent', 'paid', 'lost', 'archived'] as const
  const leads: Record<string, any> = {}

  for (const status of leadStatuses) {
    const lead = await payload.create({
      collection: 'leads',
      data: {
        business_name: `[Seed] ${status.charAt(0).toUpperCase() + status.slice(1)} HVAC Co`,
        niche: 'HVAC',
        city: status === 'new' ? 'Austin' : status === 'scored' ? 'Denver' : 'Austin',
        state: status === 'new' ? 'TX' : status === 'scored' ? 'CO' : 'TX',
        status,
        email: `${status}@seed.test`,
        phone: '512-555-0100',
        audit_score: status === 'scored' || status === 'contacted' || status === 'demo_sent' ? 7 : undefined,
        priority_tier: status === 'demo_sent' || status === 'replied_interested' ? 'hot' : status === 'scored' ? 'warm' : 'low',
        niche_city_key: `seed_hvac_${status}_austin`,
        source: 'google_maps',
      },
    })
    leads[status] = lead
    console.log(`  Lead: ${status} (${lead.id})`)
  }

  console.log('Creating clients...')
  const clientStatuses = ['pending_payment', 'onboarding', 'active', 'payment_failed', 'grace_period', 'suspended', 'cancelled'] as const
  const clients: Record<string, any> = {}

  for (const status of clientStatuses) {
    const paidLead = leads['paid']
    const client = await payload.create({
      collection: 'clients',
      data: {
        lead: String(paidLead.id),
        business_name: `[Seed] ${status.charAt(0).toUpperCase() + status.slice(1)} Client HVAC`,
        email: `client_${status}@seed.test`,
        phone: '512-555-0200',
        plan: status === 'cancelled' ? 'starter' : status === 'suspended' ? 'growth' : 'growth',
        plan_price_cents: 12900,
        status,
        niche: 'HVAC',
        domain: status === 'active' ? `${status}.example.com` : undefined,
        live_url: status === 'active' ? `https://${status}.example.com` : undefined,
        staging_url: status === 'onboarding' ? `https://${status}.staging.example.com` : undefined,
        subscription_id: `sub_seed_${status}`,
        edits_remaining: status === 'active' ? 3 : 0,
        cancelled_at: status === 'cancelled' ? new Date().toISOString() : undefined,
        cancellation_reason: status === 'cancelled' ? 'Client requested cancellation' : undefined,
        launched_at: status === 'active' ? new Date().toISOString() : undefined,
      },
    })
    clients[status] = client
    console.log(`  Client: ${status} (${client.id})`)
  }

  console.log('Creating interactions...')
  const hookInteraction = await payload.create({
    collection: 'interactions',
    data: {
      lead: String(leads['contacted'].id),
      direction: 'outbound',
      channel: 'email',
      message_type: 'hook_email',
      subject: 'Quick note about your site',
      body: 'Hi, I noticed your website has some issues on mobile. Would you like to see a better version?',
      status: 'delivered',
    },
  })

  const demoInteraction = await payload.create({
    collection: 'interactions',
    data: {
      lead: String(leads['demo_sent'].id),
      direction: 'outbound',
      channel: 'email',
      message_type: 'demo_email',
      subject: 'Your demo site is ready',
      body: 'Your custom demo is live. Take a look and let me know what you think.',
      status: 'delivered',
    },
  })

  const supportInteraction = await payload.create({
    collection: 'interactions',
    data: {
      lead: String(leads['replied_interested'].id),
      direction: 'inbound',
      channel: 'email',
      message_type: 'other',
      subject: 'Re: Quick note',
      body: 'Yes, I would love to see what you can do.',
      status: 'delivered',
      reply_classification: 'interested',
    },
  })

  console.log('Creating client interactions...')
  const clientInteraction = await payload.create({
    collection: 'client-interactions',
    data: {
      client: String(clients['active'].id),
      direction: 'inbound',
      channel: 'email',
      message_type: 'support_request',
      subject: 'Need an edit',
      body: 'Can you change the phone number on our contact page?',
      status: 'open',
      support_tier: 'tier1',
    },
  })

  console.log('Creating deployments...')
  const buildingDeployment = await payload.create({
    collection: 'deployments',
    data: {
      client: String(clients['onboarding'].id),
      type: 'demo',
      status: 'building',
      data_isolation_ok: false,
      human_approved: false,
    },
  })

  const deployedDeployment = await payload.create({
    collection: 'deployments',
    data: {
      client: String(clients['active'].id),
      type: 'initial_launch',
      status: 'deployed',
      preview_url: 'https://active.example.com',
      data_isolation_ok: true,
      human_approved: true,
      human_approved_by: 'seed_operator',
      deployed_at: new Date().toISOString(),
    },
  })

  const failedDeployment = await payload.create({
    collection: 'deployments',
    data: {
      client: String(clients['pending_payment'].id),
      type: 'demo',
      status: 'failed',
      data_isolation_ok: false,
      human_approved: false,
    },
  })

  console.log('Creating billing events...')
  await payload.create({
    collection: 'billing-events',
    data: {
      client: String(clients['active'].id),
      event_type: 'checkout_complete',
      idempotency_key: 'seed_checkout_active_001',
      amount_cents: 12900,
      currency: 'usd',
      plan_at_event: 'growth',
      provider_data: { source: 'seed' },
    },
  })

  await payload.create({
    collection: 'billing-events',
    data: {
      client: String(clients['active'].id),
      event_type: 'renewal_success',
      idempotency_key: 'seed_renewal_active_001',
      amount_cents: 12900,
      currency: 'usd',
      plan_at_event: 'growth',
      provider_data: { source: 'seed' },
    },
  })

  await payload.create({
    collection: 'billing-events',
    data: {
      client: String(clients['payment_failed'].id),
      event_type: 'renewal_failed',
      idempotency_key: 'seed_renewal_failed_001',
      amount_cents: 12900,
      currency: 'usd',
      plan_at_event: 'growth',
      provider_data: { source: 'seed' },
    },
  })

  console.log('Creating jobs...')
  const jobStatuses = [
    { status: 'queued', type: 'lead_gen' as const },
    { status: 'running', type: 'follow_up_1' as const },
    { status: 'completed', type: 'demo_build' as const },
    { status: 'failed', type: 'billing_retry' as const },
    { status: 'dead', type: 'monthly_report' as const },
  ]

  for (const { status, type } of jobStatuses) {
    const leadForJob = type === 'lead_gen' ? undefined : String(leads['contacted'].id)
    const clientForJob = type === 'monthly_report' || type === 'billing_retry'
      ? String(clients['payment_failed'].id)
      : undefined

    const data: any = {
      job_type: type,
      status,
      lead: leadForJob,
      client: clientForJob,
      run_at: new Date().toISOString(),
      input_data: { source: 'seed' },
    }

    if (status === 'completed') {
      data.completed_at = new Date().toISOString()
      data.output_data = { status: 'completed', message: 'Seed job completed' }
    }
    if (status === 'failed' || status === 'dead') {
      data.failed_at = new Date().toISOString()
      data.error_message = 'Seed job simulated failure'
    }
    if (status === 'running') {
      data.started_at = new Date().toISOString()
    }

    await payload.create({ collection: 'jobs', data })
    console.log(`  Job: ${type} (${status})`)
  }

  console.log('Creating pipeline events...')
  const transitions = [
    { from: 'new', to: 'scored', lead: leads['scored'] },
    { from: 'scored', to: 'contacted', lead: leads['contacted'] },
    { from: 'contacted', to: 'replied_interested', lead: leads['replied_interested'] },
    { from: 'contacted', to: 'replied_objection', lead: leads['replied_objection'] },
    { from: 'replied_interested', to: 'demo_sent', lead: leads['demo_sent'] },
    { from: 'demo_sent', to: 'paid', lead: leads['paid'] },
    { from: 'demo_sent', to: 'lost', lead: leads['lost'] },
    { from: 'contacted', to: 'archived', lead: leads['archived'] },
  ]

  for (const t of transitions) {
    await payload.create({
      collection: 'pipeline-events',
      data: {
        lead: String(t.lead.id),
        from_status: t.from,
        to_status: t.to,
        triggered_by: 'seed_script',
        decision_data: { source: 'seed' },
        policy_check_result: 'pass',
      },
    })
  }

  console.log('Creating policy checks...')
  await payload.create({
    collection: 'policy-checks',
    data: {
      action_type: 'send_email',
      lead: String(leads['contacted'].id),
      rule_name: 'no_demo_before_interest',
      result: 'blocked',
      blocking_reason: 'Seed: demo link in hook email',
    },
  })

  await payload.create({
    collection: 'policy-checks',
    data: {
      action_type: 'send_email',
      lead: String(leads['contacted'].id),
      rule_name: 'all_passed',
      result: 'pass',
    },
  })

  await payload.create({
    collection: 'policy-checks',
    data: {
      action_type: 'launch_site',
      client: String(clients['onboarding'].id),
      rule_name: 'human_gate_launch',
      result: 'requires_human_approval',
      blocking_reason: 'Launch always requires human approval',
    },
  })

  console.log('Creating skill versions...')
  await payload.create({
    collection: 'skill-versions',
    data: {
      skill_name: 'outreach-sales',
      version: '1.0.0',
      content_hash: 'seed_hash_outreach_v1',
      deployed_by: 'seed_script',
      notes: 'Initial seed version',
      is_active: true,
    },
  })

  await payload.create({
    collection: 'skill-versions',
    data: {
      skill_name: 'demo-builder',
      version: '1.0.0',
      content_hash: 'seed_hash_demo_v1',
      deployed_by: 'seed_script',
      notes: 'Initial seed version',
      is_active: true,
    },
  })

  console.log('Setting SystemConfig global...')
  await payload.updateGlobal({
    slug: 'system-config',
    data: {
      current_phase: 5,
      email_approval_required: true,
      demo_approval_required: true,
      launch_approval_required: true,
      active_niche: 'HVAC',
      active_cities: ['Austin', 'Denver'],
      dodo_checkout_links: { starter: '', growth: '', pro: '' },
      maintenance_mode: false,
    },
  })

  console.log('\nSeed complete!')
  console.log('  Leads:       9 (one per status)')
  console.log('  Clients:     7 (one per status)')
  console.log('  Interactions: 3')
  console.log('  ClientInteractions: 1')
  console.log('  Deployments: 3 (building, deployed, failed)')
  console.log('  BillingEvents: 3 (checkout, renewal_success, renewal_failed)')
  console.log('  Jobs:        5 (queued, running, completed, failed, dead)')
  console.log('  PipelineEvents: 8 (transition logs)')
  console.log('  PolicyChecks: 3 (blocked, passed, requires_human_approval)')
  console.log('  SkillVersions: 2 (outreach-sales, demo-builder)')
  console.log('  SystemConfig: phase 5, HVAC, Austin+Denver')

  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})

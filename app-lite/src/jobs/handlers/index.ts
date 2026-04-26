import type { DbClient } from '../../db'
import type { ScheduledJob } from '../queue'
import { enqueueJob } from '../queue'
import {
  scrapeMultipleCities,
  parseCityState,
  buildNicheCityKey,
  type ScrapedBusiness,
  type ScraperOptions,
} from '../../scraper/google-maps'
import { enrichEmailFromWebsite, computePriorityTier } from '../../scraper/email-enricher'
import { validateEmail } from '../../scraper/email-validator'
import { normalizePairTarget, scorePair, type PairMetricsInput } from '../../niche-city/scoring'
import { PLAN_EDITS, PLAN_SUPPORT_WINDOW_HOURS, type NicheCityPairTarget } from '../../types'
import { transitionClient } from '../../state-machine/orchestrator'

interface LeadGenTarget extends NicheCityPairTarget {
  maxResults?: number
}

export async function handleLeadGen(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const config = await db.findGlobal({ slug: 'system-config' })
  const niche = config.activeNiche ?? config.active_niche ?? 'hvac'
  const cities: string[] = config.activeCities ?? config.active_cities ?? []
  const targets = await resolveLeadGenTargets(db, config, job, niche, cities)

  const existingLeads = await db.find({ collection: 'leads', limit: 0 })
  const leadsBefore = existingLeads.totalDocs

  const scraperOptions: ScraperOptions = {
    signal: AbortSignal.timeout(Math.max(targets.length * 60_000, 120_000)),
    maxRequestsPerMinute: config.scraperMaxRpm ?? config.scraper_max_rpm ?? 8,
    maxRetries: config.scraperMaxRetries ?? config.scraper_max_retries ?? 3,
    retryBaseDelayMs: 4000,
    interRequestDelayMs: config.scraperDelayMs ?? config.scraper_delay_ms ?? [5000, 12000],
    proxies: ((config.scraperProxies ?? config.scraper_proxies ?? []) as any[])?.map((p: any) => ({
      url: p.url,
      username: p.username,
      password: p.password,
    })),
  }

  let allBusinesses: Array<{ city: string; state: string; niche: string; pairId?: string; biz: ScrapedBusiness }> = []
  const errors: string[] = []

  try {
    for (const group of groupTargets(targets)) {
      const results = await scrapeMultipleCities(group.niche, group.targets, {
        ...scraperOptions,
        maxResults: group.maxResults,
      })

      for (const [key, businesses] of results) {
        const { city, state } = parseCityState(key)
        const target = group.targets.find((t) => t.city === city && t.state === state)
        for (const biz of businesses) {
          allBusinesses.push({ city, state, niche: group.niche, pairId: target?.id, biz })
        }
        if (target?.id && job.data.runMode === 'mini_validation') {
          await updatePairFromValidation(db, target, businesses, job.id)
        }
      }
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      errors.push(`batch scrape: ${err.message}`)
    }
  }

  let leadsCreated = 0
  let leadsSkipped = 0

  for (const { city, state, niche: targetNiche, pairId, biz } of allBusinesses) {
    const nicheCityKey = buildNicheCityKey(targetNiche, city, biz.name)

    const existing = await db.find({
      collection: 'leads',
      where: { niche_city_key: { equals: nicheCityKey } },
      limit: 1,
    })

    if (existing.totalDocs > 0) {
      leadsSkipped++
      continue
    }

    try {
      const tier = computePriorityTier(!!biz.website, !!biz.phone)
      await db.create({
        collection: 'leads',
        data: {
          id: crypto.randomUUID(),
          businessName: biz.name,
          pair_id: pairId ?? null,
          niche: targetNiche,
          city,
          state,
          websiteUrl: biz.website ?? null,
          googleMapsUrl: biz.mapsUrl,
          email: null,
          phone: biz.phone ?? null,
          decisionMaker: null,
          status: 'new',
          auditScore: null,
          auditData: null,
          priorityTier: tier,
          exclusionReason: null,
          source: 'google_maps',
          nicheCityKey,
          emailSource: null,
          emailConfidence: null,
          emailStatus: 'pending',
          enrichedAt: null,
          enrichmentError: null,
        },
      })
      leadsCreated++
    } catch (err: any) {
      if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
        leadsSkipped++
      } else {
        errors.push(`insert ${biz.name}: ${err.message}`)
      }
    }
  }

  // Auto-enqueue email enrichment if new leads were created
  if (leadsCreated > 0) {
    try {
      await enqueueJob(db, 'email_enrich', { triggeredBy: 'lead_gen', jobId: job.id })
    } catch {
      // Non-fatal — enrichment can be triggered manually
    }
  }

  return {
    status: 'completed',
    niche,
    cities,
    targets,
    run_mode: job.data.runMode ?? 'lead_gen',
    leads_before: leadsBefore,
    leads_created: leadsCreated,
    leads_skipped: leadsSkipped,
    errors,
    job_id: job.id,
    enrichment_queued: leadsCreated > 0,
  }
}

async function resolveLeadGenTargets(
  db: DbClient,
  config: any,
  job: ScheduledJob,
  fallbackNiche: string,
  fallbackCities: string[],
): Promise<LeadGenTarget[]> {
  const jobPairs = Array.isArray(job.data.pairs) ? job.data.pairs : []
  if (jobPairs.length > 0) {
    return jobPairs.map((p) => normalizePairTarget(p as any)).filter((p) => p.niche && p.city)
  }

  const pairIds = Array.isArray(job.data.pairIds) ? job.data.pairIds.map(String) : []
  if (pairIds.length > 0) {
    const targets: LeadGenTarget[] = []
    for (const id of pairIds) {
      const pair = await db.findByID({ collection: 'niche-city-pairs', id }).catch(() => null)
      if (pair) {
        targets.push({
          id: String(pair.id),
          niche: pair.niche,
          city: pair.city,
          state: pair.state,
          maxResults: typeof job.data.maxResults === 'number' ? job.data.maxResults : undefined,
        })
      }
    }
    if (targets.length > 0) return targets
  }

  const configuredPairs = config.activePairs ?? config.active_pairs ?? []
  if (Array.isArray(configuredPairs) && configuredPairs.length > 0) {
    return configuredPairs.map((p) => normalizePairTarget(p as any)).filter((p) => p.niche && p.city)
  }

  return fallbackCities.map((entry) => {
    const { city, state } = parseCityState(entry)
    return { niche: fallbackNiche, city, state }
  })
}

function groupTargets(targets: LeadGenTarget[]): Array<{ niche: string; maxResults?: number; targets: LeadGenTarget[] }> {
  const groups = new Map<string, { niche: string; maxResults?: number; targets: LeadGenTarget[] }>()
  for (const target of targets) {
    const key = `${target.niche}|${target.maxResults ?? ''}`
    const existing = groups.get(key)
    if (existing) {
      existing.targets.push(target)
    } else {
      groups.set(key, { niche: target.niche, maxResults: target.maxResults, targets: [target] })
    }
  }
  return Array.from(groups.values())
}

async function updatePairFromValidation(
  db: DbClient,
  target: LeadGenTarget,
  businesses: ScrapedBusiness[],
  jobId: string,
) {
  const current = await db.findByID({ collection: 'niche-city-pairs', id: String(target.id) }).catch(() => null)
  if (!current) return

  const contactable = businesses.filter((b) => b.phone || b.website).length
  const noWebsite = businesses.filter((b) => !b.website).length
  const mapsCount = businesses.length
  const contactablePct = mapsCount > 0 ? Math.round((contactable / mapsCount) * 100) : 0
  const weakSitePct = current.weakSitePct ?? current.weak_site_pct ?? (mapsCount > 0 ? Math.round((noWebsite / mapsCount) * 100) : 0)

  const estimatedMapsCount = current.mapsCount ?? current.maps_count ?? 0
  const estimatedContactablePct = current.contactablePct ?? current.contactable_pct ?? 0
  const estimatedWeakSitePct = current.weakSitePct ?? current.weak_site_pct ?? 0
  const estimatedTotalScore = current.totalScore ?? current.total_score ?? 0
  const estimatedDemandScore = current.demandScore ?? current.demand_score ?? 0
  const estimatedCompetitionScore = current.competitionScore ?? current.competition_score ?? 0
  const estimatedWeaknessScore = current.weaknessScore ?? current.weakness_score ?? 0
  const estimatedContactScore = current.contactScore ?? current.contact_score ?? 0
  const estimatedRevenueScore = current.revenueScore ?? current.revenue_score ?? 0

  const scored = scorePair({
    city: target.city,
    state: target.state,
    niche: target.niche,
    mapsCount,
    reviewVelocity: current.reviewVelocity ?? current.review_velocity ?? 0,
    adCount: current.adCount ?? current.ad_count ?? 0,
    agencyPages: current.agencyPages ?? current.agency_pages ?? 0,
    weakSitePct,
    contactablePct,
    economicSignal: current.economicSignal ?? current.economic_signal ?? 'flat',
    revenueScore: current.revenueScore ?? current.revenue_score ?? undefined,
  } satisfies PairMetricsInput)

  const priorDecisions = await db.find({
    collection: 'niche-city-pairs',
    where: { status: { in: ['approved', 'parked', 'dropped'] } },
    limit: 0,
  })
  const humanReviewRequired = priorDecisions.totalDocs < 3

  await db.update({
    collection: 'niche-city-pairs',
    id: String(target.id),
    data: {
      maps_count: scored.mapsCount,
      contactable_pct: scored.contactablePct,
      weak_site_pct: scored.weakSitePct,
      demand_score: scored.demandScore,
      competition_score: scored.competitionScore,
      weakness_score: scored.weaknessScore,
      contact_score: scored.contactScore,
      revenue_score: scored.revenueScore,
      total_score: scored.totalScore,
      status: humanReviewRequired ? 'validated' : scored.recommendedStatus,
      evaluated_date: new Date().toISOString().slice(0, 10),
      last_scrape_job_id: jobId,
      validation_data: {
        job_id: jobId,
        sampled_leads: mapsCount,
        contactable_leads: contactable,
        no_website_leads: noWebsite,
        recommended_status: scored.recommendedStatus,
        threshold_reasons: scored.thresholdReasons,
        human_review_required: humanReviewRequired,
        validated_at: new Date().toISOString(),
        estimated_maps_count: estimatedMapsCount,
        estimated_contactable_pct: estimatedContactablePct,
        estimated_weak_site_pct: estimatedWeakSitePct,
        estimated_total_score: estimatedTotalScore,
        estimated_demand_score: estimatedDemandScore,
        estimated_competition_score: estimatedCompetitionScore,
        estimated_weakness_score: estimatedWeaknessScore,
        estimated_contact_score: estimatedContactScore,
        estimated_revenue_score: estimatedRevenueScore,
        validated_contactable_pct: contactablePct,
        validated_weak_site_pct: weakSitePct,
        validated_maps_count: mapsCount,
      },
    },
  })
}

export async function handleFollowUp1(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const leadId = job.data.leadId as string
  const lead = await db.findByID({ collection: 'leads', id: leadId }).catch(() => null)

  if (!lead || lead.status !== 'contacted') {
    return { status: 'skipped', reason: 'Lead no longer in contacted status' }
  }

  const interaction = await createLeadFollowUpDraft(db, lead, 'follow_up_1')

  return {
    status: 'completed',
    lead_id: leadId,
    interaction_id: interaction.id,
    channel: interaction.channel,
    message: 'Follow-up 1 draft created for approval.',
  }
}

export async function handleFollowUp2(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const leadId = job.data.leadId as string
  const lead = await db.findByID({ collection: 'leads', id: leadId }).catch(() => null)

  if (!lead || lead.status !== 'contacted') {
    return { status: 'skipped', reason: 'Lead no longer in contacted status' }
  }

  const interaction = await createLeadFollowUpDraft(db, lead, 'follow_up_2')

  return {
    status: 'completed',
    lead_id: leadId,
    interaction_id: interaction.id,
    channel: interaction.channel,
    message: 'Follow-up 2 draft created for approval.',
  }
}

export async function handleDemoBuild(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const leadId = job.data.leadId as string
  const lead = await db.findByID({ collection: 'leads', id: leadId }).catch(() => null)

  if (!lead) {
    return { status: 'skipped', reason: 'Lead not found' }
  }

  const deployment = await db.create({
    collection: 'deployments',
    data: {
      client: leadId,
      lead: leadId,
      type: 'demo',
      status: 'ready',
      content_snapshot: {
        business_name: lead.businessName ?? lead.business_name,
        niche: lead.niche,
        city: lead.city,
        phone: lead.phone,
        website_url: lead.websiteUrl ?? lead.website_url,
        source: 'demo_build_handler',
      },
      qa_results: {
        checks: ['content_snapshot_created', 'awaiting_demo_builder', 'awaiting_human_review'],
      },
      data_isolation_ok: false,
      human_approved: false,
    },
  })

  return {
    status: 'completed',
    lead_id: leadId,
    deployment_id: deployment.id,
    message: 'Demo build record created. Content/deploy remains gated for demo-builder and human review.',
  }
}

export async function handleOnboarding(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const clientId = job.data.clientId as string
  const client = await db.findByID({ collection: 'clients', id: clientId }).catch(() => null)

  if (!client) {
    return { status: 'skipped', reason: 'Client not found' }
  }

  const existingInteraction = await db.find({
    collection: 'client-interactions',
    where: {
      and: [
        { client: { equals: clientId } },
        { message_type: { equals: 'support_request' } },
      ],
    },
    limit: 1,
  })

  if (existingInteraction.totalDocs === 0) {
    const supportWindow = PLAN_SUPPORT_WINDOW_HOURS[client.plan as keyof typeof PLAN_SUPPORT_WINDOW_HOURS] ?? 24
    const editsRemaining = PLAN_EDITS[client.plan as keyof typeof PLAN_EDITS] ?? 0
    const interaction = await db.create({
      collection: 'client-interactions',
      data: {
        client: clientId,
        direction: 'outbound',
        channel: 'email',
        message_type: 'welcome',
        subject: `Welcome to ${client.businessName ?? client.business_name}`,
        body: [
          'Welcome aboard.',
          '',
          'Next step is collecting the details needed to set up the site properly: business info, services, service area, preferred contact route, logo/photos, and testimonials.',
          '',
          `Your plan includes ${editsRemaining} monthly edits and a ${supportWindow}-hour support response target.`,
          '',
          'Launch still requires the final human quality gate before anything goes live.',
        ].join('\n'),
        status: 'open',
        support_tier: client.supportTier ?? client.support_tier ?? 'tier1',
        human_approved: false,
      },
    })

    const deployment = await db.create({
      collection: 'deployments',
      data: {
        client: clientId,
        type: 'initial_launch',
        status: 'building',
        content_snapshot: {
          business_name: client.businessName ?? client.business_name,
          plan: client.plan,
          onboarding_data: client.onboardingData ?? client.onboarding_data ?? {},
        },
        data_isolation_ok: false,
        human_approved: false,
      },
    })

    await enqueueJob(db, 'monthly_report', { clientId }, 30 * 24 * 60 * 60 * 1000).catch(() => null)

    return {
      status: 'completed',
      client_id: clientId,
      interaction_id: interaction.id,
      deployment_id: deployment.id,
      message: 'Onboarding welcome draft and launch deployment record created.',
    }
  }

  return { status: 'completed', client_id: clientId, message: 'Onboarding in progress.' }
}

export async function handleMonthlyReport(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const clientId = job.data.clientId as string | undefined
  const activeClients = clientId
    ? await db.find({ collection: 'clients', where: { id: { equals: clientId } }, limit: 1 })
    : await db.find({
        collection: 'clients',
        where: { status: { equals: 'active' } },
        limit: 100,
      })

  let reportsCreated = 0
  for (const client of activeClients.docs) {
    if (client.status !== 'active' && !clientId) continue
    await db.create({
      collection: 'client-interactions',
      data: {
        client: String(client.id),
        direction: 'outbound',
        channel: 'email',
        message_type: 'monthly_report',
        subject: `${client.businessName ?? client.business_name} monthly site update`,
        body: [
          "Here's your monthly site update:",
          '',
          '- Visitors: pending analytics integration',
          '- Top pages: pending analytics integration',
          '- Notable actions: support and deployment records reviewed',
          '- Recommendation: keep the site current and route any edits through the support queue',
        ].join('\n'),
        status: 'open',
        support_tier: client.supportTier ?? client.support_tier ?? 'tier1',
        human_approved: false,
      },
    })
    reportsCreated++
  }

  return {
    status: 'completed',
    clients_count: activeClients.totalDocs,
    reports_created: reportsCreated,
    message: `Monthly report drafts created for ${reportsCreated} client(s).`,
  }
}

export async function handleChurnCheck(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const gracePeriodClients = await db.find({
    collection: 'clients',
    where: { status: { in: ['payment_failed', 'grace_period', 'suspended'] } },
    limit: 100,
  })

  const now = new Date()
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

  const inactiveClients = await db.find({
    collection: 'clients',
    where: {
      and: [
        { status: { equals: 'active' } },
        { updatedAt: { less_than: sixtyDaysAgo } },
      ],
    },
    limit: 100,
  })

  let retentionDrafts = 0
  for (const client of [...gracePeriodClients.docs, ...inactiveClients.docs]) {
    const existing = await db.find({
      collection: 'client-interactions',
      where: {
        and: [
          { client: { equals: String(client.id) } },
          { message_type: { equals: 'retention' } },
          { status: { in: ['open', 'in_progress'] } },
        ],
      },
      limit: 1,
    })
    if (existing.totalDocs > 0) continue

    await db.create({
      collection: 'client-interactions',
      data: {
        client: String(client.id),
        direction: 'outbound',
        channel: 'email',
        message_type: 'retention',
        subject: 'Checking in on your site',
        body: 'Quick check-in: I noticed your account may need attention. Reply here and a human operator can help review the next step.',
        status: 'open',
        support_tier: 'tier2',
        human_approved: true,
      },
    })
    retentionDrafts++
  }

  return {
    status: 'completed',
    at_risk_count: gracePeriodClients.totalDocs + inactiveClients.totalDocs,
    grace_period: gracePeriodClients.totalDocs,
    inactive: inactiveClients.totalDocs,
    retention_drafts_created: retentionDrafts,
    message: 'Churn check complete. At-risk clients flagged for retention review.',
  }
}

export async function handleSupportAutoReply(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const interactionId = job.data.interactionId as string
  const interaction = await db.findByID({ collection: 'client-interactions', id: interactionId }).catch(() => null)

  if (!interaction) {
    return { status: 'skipped', reason: 'Interaction not found' }
  }

  const body = `${interaction.subject ?? ''} ${interaction.body ?? ''}`.toLowerCase()
  const needsHuman = /legal|lawyer|attorney|sue|angry|refund|cancel|chargeback|harassment/.test(body)
  if (needsHuman) {
    await db.update({
      collection: 'client-interactions',
      id: interactionId,
      data: { status: 'escalated', support_tier: 'tier2' },
    })
    return {
      status: 'completed',
      interaction_id: interactionId,
      escalated: true,
      message: 'Support request escalated to human review.',
    }
  }

  const reply = await db.create({
    collection: 'client-interactions',
    data: {
      client: String(interaction.clientId ?? interaction.client),
      direction: 'outbound',
      channel: interaction.channel ?? 'email',
      message_type: 'support_reply',
      subject: `Re: ${interaction.subject ?? 'Support request'}`,
      body: 'Received. This has been logged and will be handled within your plan support window. I will follow up if anything is unclear.',
      status: 'open',
      support_tier: interaction.supportTier ?? interaction.support_tier ?? 'tier1',
      human_approved: false,
    },
  })

  return {
    status: 'completed',
    interaction_id: interactionId,
    reply_interaction_id: reply.id,
    escalated: false,
    message: 'Support acknowledgement draft created.',
  }
}

export async function handleBillingRetry(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const clientId = job.data.clientId as string
  const client = await db.findByID({ collection: 'clients', id: clientId }).catch(() => null)

  if (!client) {
    return { status: 'skipped', reason: 'Client not found' }
  }

  const interaction = await db.create({
    collection: 'client-interactions',
    data: {
      client: clientId,
      direction: 'outbound',
      channel: 'email',
      message_type: 'retention',
      subject: 'Payment Action Required',
      body: 'We were unable to process your monthly payment. Please update your payment method.',
      status: 'open',
      support_tier: 'tier1',
    },
  })

  let transitioned = false
  if (client.status === 'payment_failed' && job.attemptsMade + 1 >= job.maxAttempts) {
    const result = await transitionClient(db, clientId, 'payment_failed', 'grace_period', {
      triggeredBy: 'billing_retry',
      decisionData: { interaction_id: interaction.id },
      skipPolicy: true,
    })
    transitioned = result.success
  }

  return { status: 'completed', client_id: clientId, interaction_id: interaction.id, transitioned_to_grace_period: transitioned, message: 'Payment retry notification logged.' }
}

export async function handleSiteQa(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const deploymentId = job.data.deploymentId as string
  const deployment = await db.findByID({ collection: 'deployments', id: deploymentId }).catch(() => null)

  if (!deployment) {
    return { status: 'skipped', reason: 'Deployment not found' }
  }

  const snapshot = JSON.stringify(deployment.contentSnapshot ?? deployment.content_snapshot ?? {})
  const forbiddenNames = Array.isArray(job.data.forbiddenClientNames) ? job.data.forbiddenClientNames.map(String) : []
  const dataIsolationOk = forbiddenNames.every((name) => !snapshot.toLowerCase().includes(name.toLowerCase()))
  const checks = {
    mobile_layout: 'manual_review_required',
    links: 'manual_review_required',
    forms: 'manual_review_required',
    data_isolation: dataIsolationOk ? 'pass' : 'fail',
    launch_gate: 'human_review_required',
  }

  await db.update({
    collection: 'deployments',
    id: deploymentId,
    data: {
      qa_results: checks,
      data_isolation_ok: dataIsolationOk,
      status: dataIsolationOk ? deployment.status : 'failed',
    },
  })

  return {
    status: 'completed',
    deployment_id: deploymentId,
    data_isolation_ok: dataIsolationOk,
    qa_results: checks,
    message: 'QA metadata recorded. Launch remains blocked on human review.',
  }
}

async function createLeadFollowUpDraft(db: DbClient, lead: any, messageType: 'follow_up_1' | 'follow_up_2') {
  const leadId = String(lead.id)
  const existing = await db.find({
    collection: 'interactions',
    where: {
      and: [
        { lead: { equals: leadId } },
        { message_type: { equals: messageType } },
      ],
    },
    limit: 1,
  })

  if (existing.docs[0]) return existing.docs[0]

  const businessName = lead.businessName ?? lead.business_name ?? 'your business'
  const firstName = (lead.decisionMaker ?? lead.decision_maker ?? '').split(/\s+/)[0] || 'there'
  const issue = lead.auditData?.specific_issue
    ?? lead.audit_data?.specific_issue
    ?? (lead.websiteUrl || lead.website_url ? 'the site is not making the next step clear on mobile' : 'I could not find a clear website for the business')
  const channel = lead.email ? 'email' : lead.phone ? 'phone' : 'email'
  const body = messageType === 'follow_up_1'
    ? [
        `Hi ${firstName},`,
        '',
        'Just bumping this in case it got buried.',
        '',
        `The main issue I noticed was ${issue}. Happy to show you what a better version looks like.`,
        '',
        'Worth a look?',
      ].join('\n')
    : [
        `Hi ${firstName},`,
        '',
        'Closing the loop on this.',
        '',
        "If improving the site ever becomes a priority, I'm here. Just reply and I can send over a preview.",
      ].join('\n')

  return db.create({
    collection: 'interactions',
    data: {
      lead: leadId,
      direction: 'outbound',
      channel,
      message_type: messageType,
      subject: `Re: Quick note about ${businessName}`,
      body,
      status: 'pending_approval',
    },
  })
}

// ── Email Enrichment Handler ──────────────────────────────────

export async function handleEmailEnrich(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const batchSize = (job.data.batchSize as number) ?? 20
  const signal = AbortSignal.timeout(Math.max(batchSize * 15_000, 120_000))

  // Find all unenriched leads (email is null, has not been enriched yet)
  const allLeads = await db.find({
    collection: 'leads',
    where: {
      and: [
        { status: { equals: 'new' } },
      ],
    },
    limit: 200,
    sort: '-createdAt',
  })

  // Filter to leads that still need enrichment and have a website
  const candidates = allLeads.docs.filter((l: any) => {
    const hasWebsite = l.websiteUrl || l.website_url
    const alreadyEnriched = l.enrichedAt || l.enriched_at
    const alreadyHasEmail = l.email
    return hasWebsite && !alreadyEnriched && !alreadyHasEmail
  })

  // Sort by priority: hot > warm > low > null
  const tierOrder: Record<string, number> = { hot: 0, warm: 1, low: 2 }
  candidates.sort((a: any, b: any) => {
    const ta = tierOrder[a.priorityTier ?? a.priority_tier] ?? 3
    const tb = tierOrder[b.priorityTier ?? b.priority_tier] ?? 3
    return ta - tb
  })

  const leads = candidates.slice(0, batchSize)
  let processed = 0
  let emailsFound = 0
  const errors: string[] = []

  for (const lead of leads) {
    if (signal.aborted) break

    const websiteUrl = lead.websiteUrl ?? lead.website_url
    if (!websiteUrl) {
      // No website — mark as enriched with no result
      await db.update({
        collection: 'leads',
        id: String(lead.id),
        data: {
          enriched_at: new Date().toISOString(),
          enrichment_error: 'No website URL available',
        },
      })
      processed++
      continue
    }

    try {
      const result = await enrichEmailFromWebsite(websiteUrl, { signal })

      const updateData: Record<string, unknown> = {
        enriched_at: new Date().toISOString(),
      }

      if (result.email) {
        updateData.email = result.email
        updateData.email_source = result.source
        updateData.email_confidence = result.confidence
        updateData.email_status = 'pending' // will be validated in next step
        emailsFound++
      } else {
        updateData.enrichment_error = result.error ?? `No email found (checked ${result.pagesChecked} pages)`
      }

      await db.update({
        collection: 'leads',
        id: String(lead.id),
        data: updateData,
      })
      processed++
    } catch (err: any) {
      errors.push(`${lead.businessName ?? lead.business_name}: ${err.message}`)
      await db.update({
        collection: 'leads',
        id: String(lead.id),
        data: {
          enriched_at: new Date().toISOString(),
          enrichment_error: err.message,
        },
      })
      processed++
    }
  }

  // Auto-enqueue validation if emails were found
  if (emailsFound > 0) {
    try {
      await enqueueJob(db, 'email_validate', { triggeredBy: 'email_enrich', jobId: job.id })
    } catch {
      // Non-fatal
    }
  }

  return {
    status: 'completed',
    processed,
    emails_found: emailsFound,
    candidates_found: candidates.length,
    batch_size: batchSize,
    errors,
    job_id: job.id,
    validation_queued: emailsFound > 0,
  }
}

// ── Email Validation Handler ──────────────────────────────────

export async function handleEmailValidate(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const batchSize = (job.data.batchSize as number) ?? 50

  // Find leads with emails that haven't been validated
  const leads = await db.find({
    collection: 'leads',
    where: {
      and: [
        { email_status: { equals: 'pending' } },
      ],
    },
    limit: batchSize,
    sort: '-createdAt',
  })

  // Filter to only leads that actually have an email
  const leadsWithEmail = leads.docs.filter((l: any) => l.email)

  let validated = 0
  let valid = 0
  let risky = 0
  let invalid = 0

  for (const lead of leadsWithEmail) {
    try {
      const result = await validateEmail(lead.email)

      await db.update({
        collection: 'leads',
        id: String(lead.id),
        data: {
          email_status: result.status,
        },
      })

      validated++
      if (result.status === 'valid') valid++
      else if (result.status === 'risky') risky++
      else if (result.status === 'invalid') invalid++
    } catch (err: any) {
      // Validation error — mark as risky rather than failing
      await db.update({
        collection: 'leads',
        id: String(lead.id),
        data: {
          email_status: 'risky',
        },
      })
      validated++
      risky++
    }
  }

  return {
    status: 'completed',
    validated,
    valid,
    risky,
    invalid,
    job_id: job.id,
  }
}

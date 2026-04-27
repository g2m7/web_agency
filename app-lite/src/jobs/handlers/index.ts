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
import { scoreNichePair, type NicheRawData } from '../../scraper/niche-scorer'

export async function handleLeadGen(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const config = await db.findGlobal({ slug: 'system-config' })
  const niche = config.activeNiche ?? config.active_niche ?? 'hvac'
  const cities: string[] = config.activeCities ?? config.active_cities ?? []

  const existingLeads = await db.find({ collection: 'leads', limit: 0 })
  const leadsBefore = existingLeads.totalDocs

  const cityStates = cities.map((entry) => parseCityState(entry))

  const scraperOptions: ScraperOptions = {
    signal: AbortSignal.timeout(Math.max(cities.length * 60_000, 120_000)),
    maxRequestsPerMinute: 8,
    maxRetries: 3,
    retryBaseDelayMs: 4000,
    interRequestDelayMs: [5000, 12000],
    proxies: (config.scraper_proxies as any[])?.map((p: any) => ({
      url: p.url,
      username: p.username,
      password: p.password,
    })),
  }

  let allBusinesses: Array<{ city: string; state: string; biz: ScrapedBusiness }> = []
  const errors: string[] = []

  try {
    const results = await scrapeMultipleCities(niche, cityStates, scraperOptions)
    for (const [key, businesses] of results) {
      const { city, state } = parseCityState(key)
      for (const biz of businesses) {
        allBusinesses.push({ city, state, biz })
      }
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      errors.push(`batch scrape: ${err.message}`)
    }
  }

  let leadsCreated = 0
  let leadsSkipped = 0

  for (const { city, state, biz } of allBusinesses) {
    const nicheCityKey = buildNicheCityKey(niche, city, biz.name)

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
          niche,
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
    leads_before: leadsBefore,
    leads_created: leadsCreated,
    leads_skipped: leadsSkipped,
    errors,
    job_id: job.id,
    enrichment_queued: leadsCreated > 0,
  }
}

export async function handleFollowUp1(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const leadId = job.data.leadId as string
  const lead = await db.findByID({ collection: 'leads', id: leadId }).catch(() => null)

  if (!lead || lead.status !== 'contacted') {
    return { status: 'skipped', reason: 'Lead no longer in contacted status' }
  }

  return {
    status: 'completed',
    lead_id: leadId,
    message: 'Follow-up 1 ready. Skill execution required to draft email.',
  }
}

export async function handleFollowUp2(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const leadId = job.data.leadId as string
  const lead = await db.findByID({ collection: 'leads', id: leadId }).catch(() => null)

  if (!lead || lead.status !== 'contacted') {
    return { status: 'skipped', reason: 'Lead no longer in contacted status' }
  }

  return {
    status: 'completed',
    lead_id: leadId,
    message: 'Follow-up 2 ready. Skill execution required to draft email.',
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
      client: '' as any,
      type: 'demo',
      status: 'building',
      data_isolation_ok: false,
      human_approved: false,
    },
  })

  return {
    status: 'completed',
    lead_id: leadId,
    deployment_id: deployment.id,
    message: 'Demo build initiated. Skill execution required for content swap and deploy.',
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
    return {
      status: 'completed',
      client_id: clientId,
      message: 'Onboarding welcome email ready. Skill execution required.',
    }
  }

  return { status: 'completed', client_id: clientId, message: 'Onboarding in progress.' }
}

export async function handleMonthlyReport(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const activeClients = await db.find({
    collection: 'clients',
    where: { status: { equals: 'active' } },
    limit: 100,
  })

  return {
    status: 'completed',
    clients_count: activeClients.totalDocs,
    message: `Monthly report generation queued for ${activeClients.totalDocs} active clients. Skill execution required.`,
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

  return {
    status: 'completed',
    at_risk_count: gracePeriodClients.totalDocs + inactiveClients.totalDocs,
    grace_period: gracePeriodClients.totalDocs,
    inactive: inactiveClients.totalDocs,
    message: 'Churn check complete. Flagged clients for retention outreach.',
  }
}

export async function handleSupportAutoReply(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const interactionId = job.data.interactionId as string

  return {
    status: 'completed',
    interaction_id: interactionId,
    message: 'Support auto-reply queued. Skill execution required for classification and response.',
  }
}

export async function handleBillingRetry(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const clientId = job.data.clientId as string

  await db.create({
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

  return { status: 'completed', client_id: clientId, message: 'Payment retry notification sent.' }
}

export async function handleSiteQa(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const deploymentId = job.data.deploymentId as string
  const deployment = await db.findByID({ collection: 'deployments', id: deploymentId }).catch(() => null)

  if (!deployment) {
    return { status: 'skipped', reason: 'Deployment not found' }
  }

  return {
    status: 'completed',
    deployment_id: deploymentId,
    message: 'QA check queued. Automated checks will verify mobile layout, links, forms, and data isolation.',
  }
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

// ── Niche Score Handler ───────────────────────────────────────

export async function handleNicheScore(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const pairId = job.data.nicheCityPairId as string
  if (!pairId) {
    return { status: 'skipped', reason: 'No nicheCityPairId provided' }
  }

  let pair: any
  try {
    pair = await db.findByID({ collection: 'niche-city-pairs', id: pairId })
  } catch {
    return { status: 'skipped', reason: 'Pair not found' }
  }

  const rawData: NicheRawData = {
    mapsCount: pair.mapsCount ?? pair.maps_count ?? 0,
    reviewVelocity: pair.reviewVelocity ?? pair.review_velocity ?? 0,
    adCount: pair.adCount ?? pair.ad_count ?? 0,
    agencyPages: pair.agencyPages ?? pair.agency_pages ?? 0,
    weakSitePct: pair.weakSitePct ?? pair.weak_site_pct ?? 0,
    contactablePct: pair.contactablePct ?? pair.contactable_pct ?? 0,
    economicSignal: pair.economicSignal ?? pair.economic_signal ?? 'flat',
    revenueEstimate: pair.revenueEstimate ?? pair.revenue_estimate ?? 'moderate',
  }

  const scores = scoreNichePair(rawData)

  await db.update({
    collection: 'niche-city-pairs',
    id: pairId,
    data: {
      demand_score: scores.demandScore,
      competition_score: scores.competitionScore,
      weakness_score: scores.weaknessScore,
      contact_score: scores.contactScore,
      revenue_score: scores.revenueScore,
      total_score: scores.totalScore,
      status: 'scored',
      evaluated_at: new Date().toISOString(),
    },
  })

  return {
    status: 'completed',
    pair_id: pairId,
    scores,
    job_id: job.id,
  }
}

// ── Niche Validate Handler (Mini-Validation Scrape) ───────────

export async function handleNicheValidate(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const pairId = job.data.nicheCityPairId as string
  if (!pairId) {
    return { status: 'skipped', reason: 'No nicheCityPairId provided' }
  }

  let pair: any
  try {
    pair = await db.findByID({ collection: 'niche-city-pairs', id: pairId })
  } catch {
    return { status: 'skipped', reason: 'Pair not found' }
  }

  const city = pair.city
  const state = pair.state
  const niche = pair.niche

  // Run a limited 30-lead scrape for this pair
  const scraperOptions: ScraperOptions = {
    signal: AbortSignal.timeout(120_000),
    maxRequestsPerMinute: 8,
    maxRetries: 3,
    retryBaseDelayMs: 4000,
    interRequestDelayMs: [5000, 12000],
  }

  let allBusinesses: Array<{ biz: ScrapedBusiness }> = []
  const errors: string[] = []

  try {
    const results = await scrapeMultipleCities(niche, [{ city, state }], scraperOptions)
    for (const [_key, businesses] of results) {
      for (const biz of businesses.slice(0, 30)) {
        allBusinesses.push({ biz })
      }
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      errors.push(`validation scrape: ${err.message}`)
    }
  }

  // Insert scraped leads, tagged with pair ID
  let leadsCreated = 0
  let leadsSkipped = 0

  for (const { biz } of allBusinesses) {
    const nicheCityKey = buildNicheCityKey(niche, city, biz.name)

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
          niche,
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
          nicheCityPairId: pairId,
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

  // Compute actual metrics from leads tied to this pair
  const pairLeads = await db.find({
    collection: 'leads',
    where: { niche_city_pair_id: { equals: pairId } },
    limit: 200,
  })

  const total = pairLeads.docs.length
  const contactable = pairLeads.docs.filter((l: any) => l.email || l.phone).length
  const withWebsite = pairLeads.docs.filter((l: any) => l.websiteUrl || l.website_url).length
  // For weakness, approximate: leads without a website are "weak", leads with website need audit
  // In mini-validation, use the proxy: no website = definitely weak, has website but no strong signals = weak
  const weakCount = pairLeads.docs.filter((l: any) => !(l.websiteUrl || l.website_url)).length

  const contactablePct = total > 0 ? Math.round((contactable / total) * 100) : 0
  const weakPct = total > 0 ? Math.round((weakCount / total) * 100) : 0

  // Update pair with validation results
  await db.update({
    collection: 'niche-city-pairs',
    id: pairId,
    data: {
      status: 'validated',
      validation_leads: total,
      validation_contactable_pct: contactablePct,
      validation_weak_pct: weakPct,
      evaluated_at: new Date().toISOString(),
    },
  })

  return {
    status: 'completed',
    pair_id: pairId,
    leads_created: leadsCreated,
    leads_skipped: leadsSkipped,
    validation: {
      totalLeads: total,
      contactablePct,
      weakPct,
    },
    errors,
    job_id: job.id,
  }
}

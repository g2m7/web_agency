import { Hono } from 'hono'
import { getDb } from '../db'
import { normalizePairTarget, scorePair, type PairMetricsInput } from '../niche-city/scoring'
import type { NicheCityPairStatus, NicheCityPairTarget } from '../types'

export const scraperRoutes = new Hono()

scraperRoutes.get('/config', async (c) => {
  const db = getDb()
  const config = await db.findGlobal({ slug: 'system-config' })
  const approvedPairs = await db.find({
    collection: 'niche-city-pairs',
    where: { status: { equals: 'approved' } },
    limit: 100,
    sort: '-totalScore',
  }).catch(() => ({ totalDocs: 0, docs: [] }))
  return c.json({
    niche: config.active_niche ?? config.activeNiche ?? 'hvac',
    cities: config.active_cities ?? config.activeCities ?? [],
    activePairs: config.activePairs ?? config.active_pairs ?? [],
    approvedPairs: approvedPairs.docs,
    proxies: (config.scraperProxies ?? config.scraper_proxies ?? []) as Array<{ url: string; username?: string; password?: string }>,
    maxRequestsPerMinute: config.scraperMaxRpm ?? config.scraper_max_rpm ?? 8,
    maxRetries: config.scraperMaxRetries ?? config.scraper_max_retries ?? 3,
    interRequestDelayMs: config.scraperDelayMs ?? config.scraper_delay_ms ?? [5000, 12000],
  })
})

scraperRoutes.patch('/config', async (c) => {
  const db = getDb()
  const body = await c.req.json()
  const updates: Record<string, unknown> = {}

  if (body.niche !== undefined) updates.active_niche = body.niche
  if (body.cities !== undefined) updates.active_cities = body.cities
  if (body.activePairs !== undefined) updates.active_pairs = body.activePairs
  if (body.pairs !== undefined) updates.active_pairs = body.pairs
  if (body.proxies !== undefined) updates.scraper_proxies = body.proxies
  if (body.maxRequestsPerMinute !== undefined) updates.scraper_max_rpm = body.maxRequestsPerMinute
  if (body.maxRetries !== undefined) updates.scraper_max_retries = body.maxRetries
  if (body.interRequestDelayMs !== undefined) updates.scraper_delay_ms = body.interRequestDelayMs

  const config = await db.updateGlobal({ slug: 'system-config', data: updates })
  return c.json(config)
})

scraperRoutes.post('/run', async (c) => {
  const db = getDb()
  const body = await c.req.json() as {
    niche?: string
    cities?: string[]
    pairIds?: string[]
    pairs?: NicheCityPairTarget[]
    maxResults?: number
  }

  if (body.niche || body.cities || body.pairs) {
    const updates: Record<string, unknown> = {}
    if (body.niche) updates.active_niche = body.niche
    if (body.cities) updates.active_cities = body.cities
    if (body.pairs) updates.active_pairs = body.pairs
    await db.updateGlobal({ slug: 'system-config', data: updates })
  }

  const job = await db.create({
    collection: 'jobs',
    data: {
      job_type: 'lead_gen',
      status: 'queued',
      input_data: { niche: body.niche, cities: body.cities, pairIds: body.pairIds, pairs: body.pairs, maxResults: body.maxResults },
      run_at: new Date().toISOString(),
      max_attempts: 3,
      attempts: 0,
    },
  })

  return c.json({ queued: true, jobId: job.id, jobType: 'lead_gen' }, 201)
})

// ── City + niche pair scorecard ───────────────────────────────

scraperRoutes.get('/pairs', async (c) => {
  const db = getDb()
  const status = c.req.query('status')
  const city = c.req.query('city')
  const niche = c.req.query('niche')
  const limit = parseInt(c.req.query('limit') ?? '100', 10)

  const conditions: any[] = []
  if (status) conditions.push({ status: { equals: status } })
  if (city) conditions.push({ city: { contains: city } })
  if (niche) conditions.push({ niche: { contains: niche } })

  const result = await db.find({
    collection: 'niche-city-pairs',
    where: conditions.length ? { and: conditions } : undefined,
    limit,
    sort: '-totalScore',
  })
  return c.json(result)
})

scraperRoutes.post('/pairs', async (c) => {
  const db = getDb()
  const body = await c.req.json()
  const inputs = Array.isArray(body.pairs) ? body.pairs : [body]
  const docs = []

  for (const input of inputs) {
    const scored = scorePair(input as PairMetricsInput)
    const existing = await db.find({
      collection: 'niche-city-pairs',
      where: { unique_key: { equals: scored.uniqueKey } },
      limit: 1,
    })

    const data = {
      unique_key: scored.uniqueKey,
      city: scored.city,
      state: scored.state,
      niche: scored.niche,
      maps_count: scored.mapsCount,
      review_velocity: scored.reviewVelocity,
      ad_count: scored.adCount,
      agency_pages: scored.agencyPages,
      weak_site_pct: scored.weakSitePct,
      contactable_pct: scored.contactablePct,
      economic_signal: scored.economicSignal,
      demand_score: scored.demandScore,
      competition_score: scored.competitionScore,
      weakness_score: scored.weaknessScore,
      contact_score: scored.contactScore,
      revenue_score: scored.revenueScore,
      total_score: scored.totalScore,
      status: (input.status ?? existing.docs[0]?.status ?? 'candidate') as NicheCityPairStatus,
      notes: input.notes ?? existing.docs[0]?.notes ?? null,
      evaluated_date: input.evaluatedDate ?? input.evaluated_date ?? new Date().toISOString().slice(0, 10),
      validation_data: {
        recommended_status: scored.recommendedStatus,
        threshold_reasons: scored.thresholdReasons,
      },
    }

    if (existing.docs[0]) {
      docs.push(await db.update({ collection: 'niche-city-pairs', id: String(existing.docs[0].id), data }))
    } else {
      docs.push(await db.create({ collection: 'niche-city-pairs', data }))
    }
  }

  return c.json({ totalDocs: docs.length, docs }, 201)
})

scraperRoutes.patch('/pairs/:id', async (c) => {
  const db = getDb()
  const body = await c.req.json()
  try {
    const current = await db.findByID({ collection: 'niche-city-pairs', id: c.req.param('id') })
    const merged = {
      city: body.city ?? current.city,
      state: body.state ?? current.state,
      niche: body.niche ?? current.niche,
      mapsCount: body.mapsCount ?? body.maps_count ?? current.mapsCount ?? current.maps_count,
      reviewVelocity: body.reviewVelocity ?? body.review_velocity ?? current.reviewVelocity ?? current.review_velocity,
      adCount: body.adCount ?? body.ad_count ?? current.adCount ?? current.ad_count,
      agencyPages: body.agencyPages ?? body.agency_pages ?? current.agencyPages ?? current.agency_pages,
      weakSitePct: body.weakSitePct ?? body.weak_site_pct ?? current.weakSitePct ?? current.weak_site_pct,
      contactablePct: body.contactablePct ?? body.contactable_pct ?? current.contactablePct ?? current.contactable_pct,
      economicSignal: body.economicSignal ?? body.economic_signal ?? current.economicSignal ?? current.economic_signal,
      revenueScore: body.revenueScore ?? body.revenue_score ?? current.revenueScore ?? current.revenue_score,
    }
    const scored = scorePair(merged)
    const pair = await db.update({
      collection: 'niche-city-pairs',
      id: c.req.param('id'),
      data: {
        ...body,
        unique_key: scored.uniqueKey,
        city: scored.city,
        state: scored.state,
        niche: scored.niche,
        maps_count: scored.mapsCount,
        review_velocity: scored.reviewVelocity,
        ad_count: scored.adCount,
        agency_pages: scored.agencyPages,
        weak_site_pct: scored.weakSitePct,
        contactable_pct: scored.contactablePct,
        economic_signal: scored.economicSignal,
        demand_score: scored.demandScore,
        competition_score: scored.competitionScore,
        weakness_score: scored.weaknessScore,
        contact_score: scored.contactScore,
        revenue_score: scored.revenueScore,
        total_score: scored.totalScore,
        validation_data: {
          ...(current.validationData ?? current.validation_data ?? {}),
          recommended_status: scored.recommendedStatus,
          threshold_reasons: scored.thresholdReasons,
        },
      },
    })
    return c.json(pair)
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Update failed' }, 400)
  }
})

scraperRoutes.post('/pairs/:id/decision', async (c) => {
  const db = getDb()
  const body = await c.req.json().catch(() => ({}))
  const id = c.req.param('id')
  const pair = await db.findByID({ collection: 'niche-city-pairs', id }).catch(() => null)
  if (!pair) return c.json({ error: 'Pair not found' }, 404)

  const scored = scorePair(pairToMetrics(pair))
  const priorDecisions = await db.find({
    collection: 'niche-city-pairs',
    where: { status: { in: ['approved', 'parked', 'dropped'] } },
    limit: 0,
  })
  const humanReviewRequired = priorDecisions.totalDocs < 3 && body.humanApproved !== true && body.human_approved !== true
  const status = humanReviewRequired
    ? 'validated'
    : (body.status ?? scored.recommendedStatus)

  const updated = await db.update({
    collection: 'niche-city-pairs',
    id,
    data: {
      status,
      validation_data: {
        ...(pair.validationData ?? pair.validation_data ?? {}),
        recommended_status: scored.recommendedStatus,
        threshold_reasons: scored.thresholdReasons,
        human_review_required: humanReviewRequired,
        decided_at: new Date().toISOString(),
        decided_by: body.decidedBy ?? body.decided_by ?? (humanReviewRequired ? 'agent_recommendation' : 'system'),
      },
    },
  })

  return c.json({
    ...updated,
    recommendedStatus: scored.recommendedStatus,
    thresholdReasons: scored.thresholdReasons,
    humanReviewRequired,
  })
})

scraperRoutes.post('/pairs/:id/validate', async (c) => {
  const db = getDb()
  const body = await c.req.json().catch(() => ({}))
  const id = c.req.param('id')
  const pair = await db.findByID({ collection: 'niche-city-pairs', id }).catch(() => null)
  if (!pair) return c.json({ error: 'Pair not found' }, 404)

  const target = normalizePairTarget({
    id: String(pair.id),
    niche: pair.niche,
    city: pair.city,
    state: pair.state,
    maxResults: body.maxResults ?? body.max_results ?? 30,
  })

  const job = await db.create({
    collection: 'jobs',
    data: {
      job_type: 'lead_gen',
      status: 'queued',
      input_data: {
        pairs: [target],
        runMode: 'mini_validation',
        triggeredBy: 'pair_validation',
      },
      run_at: new Date().toISOString(),
      max_attempts: 3,
      attempts: 0,
    },
  })

  await db.update({
    collection: 'niche-city-pairs',
    id,
    data: {
      last_scrape_job_id: job.id,
      validation_data: {
        ...(pair.validationData ?? pair.validation_data ?? {}),
        queued_job_id: job.id,
        queued_at: new Date().toISOString(),
        max_results: target.maxResults,
      },
    },
  })

  return c.json({ queued: true, jobId: job.id, jobType: 'lead_gen', runMode: 'mini_validation' }, 201)
})

function pairToMetrics(pair: any): PairMetricsInput {
  return {
    city: pair.city,
    state: pair.state,
    niche: pair.niche,
    mapsCount: pair.mapsCount ?? pair.maps_count ?? 0,
    reviewVelocity: pair.reviewVelocity ?? pair.review_velocity ?? 0,
    adCount: pair.adCount ?? pair.ad_count ?? 0,
    agencyPages: pair.agencyPages ?? pair.agency_pages ?? 0,
    weakSitePct: pair.weakSitePct ?? pair.weak_site_pct ?? 0,
    contactablePct: pair.contactablePct ?? pair.contactable_pct ?? 0,
    economicSignal: pair.economicSignal ?? pair.economic_signal ?? 'flat',
    revenueScore: pair.revenueScore ?? pair.revenue_score ?? undefined,
  }
}

scraperRoutes.get('/history', async (c) => {
  const db = getDb()
  const limit = parseInt(c.req.query('limit') ?? '50', 10)
  const result = await db.find({
    collection: 'jobs',
    where: { job_type: { in: ['lead_gen', 'email_enrich', 'email_validate'] } },
    limit,
    sort: '-createdAt',
  })
  return c.json(result)
})

scraperRoutes.get('/results', async (c) => {
  const db = getDb()
  const niche = c.req.query('niche')
  const city = c.req.query('city')
  const status = c.req.query('status')
  const search = c.req.query('search')
  const hasWebsite = c.req.query('hasWebsite')
  const hasPhone = c.req.query('hasPhone')
  const hasEmail = c.req.query('hasEmail')
  const contactMode = c.req.query('contactMode')
  const emailStatus = c.req.query('emailStatus')
  const priorityTier = c.req.query('priorityTier')
  const pairId = c.req.query('pairId')
  const source = c.req.query('source') ?? 'google_maps'
  const limit = parseInt(c.req.query('limit') ?? '200', 10)

  const conditions: any[] = [{ source: { equals: source } }]
  if (niche) conditions.push({ niche: { equals: niche } })
  if (city) conditions.push({ city: { contains: city } })
  if (status) conditions.push({ status: { equals: status } })
  if (search) conditions.push({ business_name: { contains: search } })
  if (emailStatus) conditions.push({ email_status: { equals: emailStatus } })
  if (priorityTier) conditions.push({ priority_tier: { equals: priorityTier } })
  if (pairId) conditions.push({ pair_id: { equals: pairId } })

  const result = await db.find({
    collection: 'leads',
    where: { and: conditions },
    limit,
    sort: '-createdAt',
  })

  let docs = result.docs
  if (hasWebsite === 'true') docs = docs.filter((l: any) => l.websiteUrl || l.website_url)
  if (hasWebsite === 'false') docs = docs.filter((l: any) => !l.websiteUrl && !l.website_url)
  if (hasPhone === 'true') docs = docs.filter((l: any) => l.phone)
  if (hasPhone === 'false') docs = docs.filter((l: any) => !l.phone)
  if (hasEmail === 'true') docs = docs.filter((l: any) => l.email)
  if (hasEmail === 'false') docs = docs.filter((l: any) => !l.email)
  if (contactMode === 'email') docs = docs.filter((l: any) => l.email)
  if (contactMode === 'phone_only') docs = docs.filter((l: any) => !l.email && l.phone)
  if (contactMode === 'unreachable') docs = docs.filter((l: any) => !l.email && !l.phone)

  return c.json({ totalDocs: result.totalDocs, docs })
})

// ── Enrichment endpoints ────────────────────────────────────────

scraperRoutes.post('/enrich', async (c) => {
  const db = getDb()
  const body = await c.req.json().catch(() => ({})) as { batchSize?: number }

  const job = await db.create({
    collection: 'jobs',
    data: {
      job_type: 'email_enrich',
      status: 'queued',
      input_data: { batchSize: body.batchSize ?? 20, triggeredBy: 'manual' },
      run_at: new Date().toISOString(),
      max_attempts: 3,
      attempts: 0,
    },
  })

  return c.json({ queued: true, jobId: job.id, jobType: 'email_enrich' }, 201)
})

scraperRoutes.get('/enrich/stats', async (c) => {
  const db = getDb()

  const [allLeads, leadSample, pendingEmail, validEmail, riskyEmail, invalidEmail, hotLeads, warmLeads, lowLeads, approvedPairs, validatedPairs] =
    await Promise.all([
      db.find({ collection: 'leads', where: { source: { equals: 'google_maps' } }, limit: 0 }),
      db.find({ collection: 'leads', where: { and: [{ source: { equals: 'google_maps' } }] }, limit: 5000 }),
      db.find({ collection: 'leads', where: { and: [{ source: { equals: 'google_maps' } }, { email_status: { equals: 'pending' } }] }, limit: 0 }),
      db.find({ collection: 'leads', where: { and: [{ source: { equals: 'google_maps' } }, { email_status: { equals: 'valid' } }] }, limit: 0 }),
      db.find({ collection: 'leads', where: { and: [{ source: { equals: 'google_maps' } }, { email_status: { equals: 'risky' } }] }, limit: 0 }),
      db.find({ collection: 'leads', where: { and: [{ source: { equals: 'google_maps' } }, { email_status: { equals: 'invalid' } }] }, limit: 0 }),
      db.find({ collection: 'leads', where: { and: [{ source: { equals: 'google_maps' } }, { priority_tier: { equals: 'hot' } }] }, limit: 0 }),
      db.find({ collection: 'leads', where: { and: [{ source: { equals: 'google_maps' } }, { priority_tier: { equals: 'warm' } }] }, limit: 0 }),
      db.find({ collection: 'leads', where: { and: [{ source: { equals: 'google_maps' } }, { priority_tier: { equals: 'low' } }] }, limit: 0 }),
      db.find({ collection: 'niche-city-pairs', where: { status: { equals: 'approved' } }, limit: 0 }).catch(() => ({ totalDocs: 0, docs: [] })),
      db.find({ collection: 'niche-city-pairs', where: { status: { equals: 'validated' } }, limit: 0 }).catch(() => ({ totalDocs: 0, docs: [] })),
    ])

  const sampledLeads = leadSample.docs
  const withEmail = sampledLeads.filter((l: any) => l.email).length
  const enriched = sampledLeads.filter((l: any) => l.enrichedAt || l.enriched_at).length
  const phoneOnly = sampledLeads.filter((l: any) => !l.email && l.phone).length
  const contactable = sampledLeads.filter((l: any) => l.email || l.phone).length
  const phoneFallbackReady = sampledLeads.filter((l: any) => {
    const tier = l.priorityTier ?? l.priority_tier
    return !l.email && !!l.phone && (tier === 'hot' || tier === 'warm')
  }).length

  // Outreach ready: valid email + hot or warm priority
  const outreachReady = await db.find({
    collection: 'leads',
    where: { and: [{ source: { equals: 'google_maps' } }, { email_status: { equals: 'valid' } }] },
    limit: 5000,
  }).then(r => r.docs.filter((l: any) => {
    const tier = l.priorityTier ?? l.priority_tier
    return tier === 'hot' || tier === 'warm'
  }).length)

  return c.json({
    total: allLeads.totalDocs,
    withEmail,
    enriched,
    phoneOnly,
    contactable,
    phoneFallbackReady,
    emailPending: pendingEmail.totalDocs,
    emailValid: validEmail.totalDocs,
    emailRisky: riskyEmail.totalDocs,
    emailInvalid: invalidEmail.totalDocs,
    hot: hotLeads.totalDocs,
    warm: warmLeads.totalDocs,
    low: lowLeads.totalDocs,
    outreachReady,
    approvedPairs: approvedPairs.totalDocs,
    validatedPairs: validatedPairs.totalDocs,
  })
})

scraperRoutes.post('/validate', async (c) => {
  const db = getDb()
  const body = await c.req.json().catch(() => ({})) as { batchSize?: number }

  const job = await db.create({
    collection: 'jobs',
    data: {
      job_type: 'email_validate',
      status: 'queued',
      input_data: { batchSize: body.batchSize ?? 50, triggeredBy: 'manual' },
      run_at: new Date().toISOString(),
      max_attempts: 3,
      attempts: 0,
    },
  })

  return c.json({ queued: true, jobId: job.id, jobType: 'email_validate' }, 201)
})

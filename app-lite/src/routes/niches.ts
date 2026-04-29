import { Hono } from 'hono'
import { getDb } from '../db'
import { scoreNichePair, evaluateGoNoGo, type NicheRawData } from '../scraper/niche-scorer'
import { US_CITIES } from '../data/us-cities'
import { NICHE_LIBRARY, getVerticals } from '../data/niche-library'

export const nicheRoutes = new Hono()

// ── Discovery management ────────────────────────────────────

nicheRoutes.post('/discover', async (c) => {
  const db = getDb()
  const body = await c.req.json().catch(() => ({})) as { batchSize?: number }

  // Check if a discovery job is already running
  const running = await db.find({
    collection: 'jobs',
    where: {
      and: [
        { job_type: { equals: 'niche_discover' } },
        { status: { in: ['queued', 'running'] } },
      ],
    },
    limit: 1,
  })

  if (running.totalDocs > 0) {
    return c.json({ error: 'A discovery job is already in progress', jobId: running.docs[0]?.id }, 409)
  }

  const job = await db.create({
    collection: 'jobs',
    data: {
      job_type: 'niche_discover',
      status: 'queued',
      input_data: { batchSize: body.batchSize ?? 20, triggeredBy: 'manual' },
      run_at: new Date().toISOString(),
      max_attempts: 1,
      attempts: 0,
    },
  })

  return c.json({ queued: true, jobId: job.id, jobType: 'niche_discover' }, 201)
})

nicheRoutes.get('/discover/config', async (c) => {
  const db = getDb()
  const config = await db.findGlobal({ slug: 'system-config' })

  return c.json({
    enabled: config.discoveryEnabled ?? config.discovery_enabled ?? true,
    batchSize: config.discoveryBatchSize ?? config.discovery_batch_size ?? 20,
    intervalHours: config.discoveryIntervalHours ?? config.discovery_interval_hours ?? 6,
    autoApprove: config.discoveryAutoApprove ?? config.discovery_auto_approve ?? false,
    excludeNiches: config.discoveryExcludeNiches ?? config.discovery_exclude_niches ?? [],
    priorityCities: config.discoveryPriorityCities ?? config.discovery_priority_cities ?? [],
    lastRun: config.discoveryLastRun ?? config.discovery_last_run ?? null,
    humanReviewCount: config.discoveryHumanReviewCount ?? config.discovery_human_review_count ?? 0,
    availableCities: US_CITIES.length,
    availableNiches: NICHE_LIBRARY.length,
    verticals: getVerticals(),
  })
})

nicheRoutes.patch('/discover/config', async (c) => {
  const db = getDb()
  const body = await c.req.json()
  const updates: Record<string, unknown> = {}

  if (body.enabled !== undefined) updates.discovery_enabled = body.enabled
  if (body.batchSize !== undefined) updates.discovery_batch_size = body.batchSize
  if (body.intervalHours !== undefined) updates.discovery_interval_hours = body.intervalHours
  if (body.autoApprove !== undefined) updates.discovery_auto_approve = body.autoApprove
  if (body.excludeNiches !== undefined) updates.discovery_exclude_niches = body.excludeNiches
  if (body.priorityCities !== undefined) updates.discovery_priority_cities = body.priorityCities

  const config = await db.updateGlobal({ slug: 'system-config', data: updates })
  return c.json(config)
})

nicheRoutes.get('/discover/stats', async (c) => {
  const db = getDb()

  const [all, candidates, scored, validated, approved, parked, dropped] = await Promise.all([
    db.find({ collection: 'niche-city-pairs', limit: 0 }),
    db.find({ collection: 'niche-city-pairs', where: { status: { equals: 'candidate' } }, limit: 0 }),
    db.find({ collection: 'niche-city-pairs', where: { status: { equals: 'scored' } }, limit: 0 }),
    db.find({ collection: 'niche-city-pairs', where: { status: { equals: 'validated' } }, limit: 0 }),
    db.find({ collection: 'niche-city-pairs', where: { status: { equals: 'approved' } }, limit: 0 }),
    db.find({ collection: 'niche-city-pairs', where: { status: { equals: 'parked' } }, limit: 0 }),
    db.find({ collection: 'niche-city-pairs', where: { status: { equals: 'dropped' } }, limit: 0 }),
  ])

  // Discovery job history
  const discoveryJobs = await db.find({
    collection: 'jobs',
    where: { job_type: { equals: 'niche_discover' } },
    limit: 10,
    sort: '-createdAt',
  })

  // Unique cities and niches discovered
  const allPairs = await db.find({ collection: 'niche-city-pairs', limit: 5000 })
  const uniqueCities = new Set(allPairs.docs.map((p: any) => `${p.city}, ${p.state}`))
  const uniqueNiches = new Set(allPairs.docs.map((p: any) => p.niche))

  return c.json({
    pipeline: {
      total: all.totalDocs,
      candidate: candidates.totalDocs,
      scored: scored.totalDocs,
      validated: validated.totalDocs,
      approved: approved.totalDocs,
      parked: parked.totalDocs,
      dropped: dropped.totalDocs,
    },
    coverage: {
      uniqueCities: uniqueCities.size,
      uniqueNiches: uniqueNiches.size,
      topNiches: [...uniqueNiches].slice(0, 20),
    },
    recentJobs: discoveryJobs.docs.map((j: any) => ({
      id: j.id,
      status: j.status,
      createdAt: j.createdAt ?? j.created_at,
      completedAt: j.completedAt ?? j.completed_at,
      output: j.outputData ?? j.output_data,
    })),
  })
})

// ── Approve pair (with human review tracking) ───────────────

nicheRoutes.patch('/:id/approve', async (c) => {
  const db = getDb()
  const id = c.req.param('id')

  let pair: any
  try {
    pair = await db.findByID({ collection: 'niche-city-pairs', id })
  } catch {
    return c.json({ error: 'Pair not found' }, 404)
  }

  // Check 3-sprint cap
  const approvedCount = await db.find({
    collection: 'niche-city-pairs',
    where: { status: { equals: 'approved' } },
    limit: 0,
  })

  if (approvedCount.totalDocs >= 3) {
    return c.json({
      error: 'Maximum 3 simultaneous approved pairs. Park or drop an existing pair first.',
    }, 409)
  }

  await db.update({
    collection: 'niche-city-pairs',
    id,
    data: {
      status: 'approved',
      sprint_start: new Date().toISOString(),
      notes: 'Human-approved',
    },
  })

  // Increment human review count
  const config = await db.findGlobal({ slug: 'system-config' })
  const currentCount = config.discoveryHumanReviewCount ?? config.discovery_human_review_count ?? 0
  await db.updateGlobal({
    slug: 'system-config',
    data: { discovery_human_review_count: currentCount + 1 },
  })

  return c.json({ approved: true, id, humanReviewCount: currentCount + 1 })
})

// ── List all pairs ──────────────────────────────────────────

nicheRoutes.get('/', async (c) => {
  const db = getDb()
  const status = c.req.query('status')
  const city = c.req.query('city')
  const niche = c.req.query('niche')
  const limit = parseInt(c.req.query('limit') ?? '100', 10)

  const conditions: any[] = []
  if (status) conditions.push({ status: { equals: status } })
  if (city) conditions.push({ city: { contains: city } })
  if (niche) conditions.push({ niche: { contains: niche } })

  const where = conditions.length > 0 ? { and: conditions } : undefined
  const result = await db.find({
    collection: 'niche-city-pairs',
    where,
    limit,
    sort: '-createdAt',
  })

  return c.json(result)
})

// ── Get single pair ─────────────────────────────────────────

nicheRoutes.get('/stats', async (c) => {
  const db = getDb()

  const [all, candidates, scored, validated, approved, parked, dropped] = await Promise.all([
    db.find({ collection: 'niche-city-pairs', limit: 0 }),
    db.find({ collection: 'niche-city-pairs', where: { status: { equals: 'candidate' } }, limit: 0 }),
    db.find({ collection: 'niche-city-pairs', where: { status: { equals: 'scored' } }, limit: 0 }),
    db.find({ collection: 'niche-city-pairs', where: { status: { equals: 'validated' } }, limit: 0 }),
    db.find({ collection: 'niche-city-pairs', where: { status: { equals: 'approved' } }, limit: 0 }),
    db.find({ collection: 'niche-city-pairs', where: { status: { equals: 'parked' } }, limit: 0 }),
    db.find({ collection: 'niche-city-pairs', where: { status: { equals: 'dropped' } }, limit: 0 }),
  ])

  // Get top pairs
  const topPairs = await db.find({
    collection: 'niche-city-pairs',
    where: { total_score: { greater_than: 0 } },
    limit: 5,
    sort: '-totalScore',
  })

  return c.json({
    total: all.totalDocs,
    byStatus: {
      candidate: candidates.totalDocs,
      scored: scored.totalDocs,
      validated: validated.totalDocs,
      approved: approved.totalDocs,
      parked: parked.totalDocs,
      dropped: dropped.totalDocs,
    },
    topPairs: topPairs.docs,
  })
})

nicheRoutes.get('/:id', async (c) => {
  const db = getDb()
  const id = c.req.param('id')
  try {
    const pair = await db.findByID({ collection: 'niche-city-pairs', id })
    return c.json(pair)
  } catch {
    return c.json({ error: 'Pair not found' }, 404)
  }
})

// ── Create pair ─────────────────────────────────────────────

nicheRoutes.post('/', async (c) => {
  const db = getDb()
  const body = await c.req.json()

  if (!body.city || !body.state || !body.niche) {
    return c.json({ error: 'city, state, and niche are required' }, 400)
  }

  const pair = await db.create({
    collection: 'niche-city-pairs',
    data: {
      city: body.city,
      state: body.state,
      niche: body.niche,
      maps_count: body.mapsCount ?? null,
      review_velocity: body.reviewVelocity ?? null,
      ad_count: body.adCount ?? null,
      agency_pages: body.agencyPages ?? null,
      weak_site_pct: body.weakSitePct ?? null,
      contactable_pct: body.contactablePct ?? null,
      economic_signal: body.economicSignal ?? null,
      revenue_estimate: body.revenueEstimate ?? null,
      notes: body.notes ?? null,
      status: 'candidate',
    },
  })

  return c.json(pair, 201)
})

// ── Update pair ─────────────────────────────────────────────

nicheRoutes.patch('/:id', async (c) => {
  const db = getDb()
  const id = c.req.param('id')
  const body = await c.req.json()

  // Don't allow changing status directly — use /score, /validate, /decide
  const { status: _status, ...updateData } = body

  try {
    const pair = await db.update({
      collection: 'niche-city-pairs',
      id,
      data: updateData,
    })
    return c.json(pair)
  } catch {
    return c.json({ error: 'Pair not found' }, 404)
  }
})

// ── Score pair ──────────────────────────────────────────────

nicheRoutes.patch('/:id/score', async (c) => {
  const db = getDb()
  const id = c.req.param('id')

  let pair: any
  try {
    pair = await db.findByID({ collection: 'niche-city-pairs', id })
  } catch {
    return c.json({ error: 'Pair not found' }, 404)
  }

  // Allow body to override stored raw data
  const body = await c.req.json().catch(() => ({}))

  const rawData: NicheRawData = {
    mapsCount: body.mapsCount ?? pair.mapsCount ?? pair.maps_count ?? 0,
    reviewVelocity: body.reviewVelocity ?? pair.reviewVelocity ?? pair.review_velocity ?? 0,
    adCount: body.adCount ?? pair.adCount ?? pair.ad_count ?? 0,
    agencyPages: body.agencyPages ?? pair.agencyPages ?? pair.agency_pages ?? 0,
    weakSitePct: body.weakSitePct ?? pair.weakSitePct ?? pair.weak_site_pct ?? 0,
    contactablePct: body.contactablePct ?? pair.contactablePct ?? pair.contactable_pct ?? 0,
    economicSignal: body.economicSignal ?? pair.economicSignal ?? pair.economic_signal ?? 'flat',
    revenueEstimate: body.revenueEstimate ?? pair.revenueEstimate ?? pair.revenue_estimate ?? 'moderate',
  }

  const scores = scoreNichePair(rawData)

  const updated = await db.update({
    collection: 'niche-city-pairs',
    id,
    data: {
      maps_count: rawData.mapsCount,
      review_velocity: rawData.reviewVelocity,
      ad_count: rawData.adCount,
      agency_pages: rawData.agencyPages,
      weak_site_pct: rawData.weakSitePct,
      contactable_pct: rawData.contactablePct,
      economic_signal: rawData.economicSignal,
      revenue_estimate: rawData.revenueEstimate,
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

  return c.json({ ...updated, scores })
})

// ── Validate pair (trigger mini-validation scrape) ──────────

nicheRoutes.post('/:id/validate', async (c) => {
  const db = getDb()
  const id = c.req.param('id')

  let pair: any
  try {
    pair = await db.findByID({ collection: 'niche-city-pairs', id })
  } catch {
    return c.json({ error: 'Pair not found' }, 404)
  }

  if (pair.status !== 'scored' && pair.status !== 'candidate') {
    return c.json({
      error: `Pair must be in 'scored' or 'candidate' status to validate (currently: ${pair.status})`,
    }, 400)
  }

  // Queue a niche_validate job
  const job = await db.create({
    collection: 'jobs',
    data: {
      job_type: 'niche_validate',
      status: 'queued',
      input_data: { nicheCityPairId: id },
      run_at: new Date().toISOString(),
      max_attempts: 3,
      attempts: 0,
    },
  })

  return c.json({ queued: true, jobId: job.id, pairId: id }, 201)
})

// ── Go/No-Go decision ───────────────────────────────────────

nicheRoutes.patch('/:id/decide', async (c) => {
  const db = getDb()
  const id = c.req.param('id')

  let pair: any
  try {
    pair = await db.findByID({ collection: 'niche-city-pairs', id })
  } catch {
    return c.json({ error: 'Pair not found' }, 404)
  }

  const totalScore = pair.totalScore ?? pair.total_score ?? 0

  // Prefer validated metrics, fall back to scored estimates
  const contactablePct = pair.validationContactablePct ?? pair.validation_contactable_pct
    ?? pair.contactablePct ?? pair.contactable_pct ?? 0
  const weakSitePct = pair.validationWeakPct ?? pair.validation_weak_pct
    ?? pair.weakSitePct ?? pair.weak_site_pct ?? 0
  const mapsCount = pair.mapsCount ?? pair.maps_count ?? 0

  const result = evaluateGoNoGo(totalScore, {
    contactablePct,
    weakSitePct,
    mapsCount,
  })

  // Enforce 3-sprint cap: if approving, check how many are already approved
  if (result.decision === 'approved') {
    const activeApproved = await db.find({
      collection: 'niche-city-pairs',
      where: { status: { equals: 'approved' } },
      limit: 0,
    })
    if (activeApproved.totalDocs >= 3) {
      return c.json({
        decision: 'blocked',
        reasons: ['Maximum 3 simultaneous approved pairs allowed. Park or drop an existing pair first.'],
      }, 409)
    }
  }

  const updated = await db.update({
    collection: 'niche-city-pairs',
    id,
    data: {
      status: result.decision,
      sprint_start: result.decision === 'approved' ? new Date().toISOString() : null,
    },
  })

  return c.json({ ...updated, decision: result.decision, reasons: result.reasons })
})

// ── Delete pair ─────────────────────────────────────────────

nicheRoutes.delete('/:id', async (c) => {
  const db = getDb()
  const id = c.req.param('id')

  let pair: any
  try {
    pair = await db.findByID({ collection: 'niche-city-pairs', id })
  } catch {
    return c.json({ error: 'Pair not found' }, 404)
  }

  if (pair.status === 'approved') {
    return c.json({ error: 'Cannot delete an approved pair. Drop or park it first.' }, 400)
  }

  await db.delete({ collection: 'niche-city-pairs', id })
  return c.json({ deleted: true, id })
})

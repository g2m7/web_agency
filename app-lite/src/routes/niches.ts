import { Hono } from 'hono'
import { getDb } from '../db'
import { scoreNichePair, evaluateGoNoGo, type NicheRawData } from '../scraper/niche-scorer'

export const nicheRoutes = new Hono()

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

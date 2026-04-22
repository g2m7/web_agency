import { Hono } from 'hono'
import { getDb } from '../db'

export const scraperRoutes = new Hono()

scraperRoutes.get('/config', async (c) => {
  const db = getDb()
  const config = await db.findGlobal({ slug: 'system-config' })
  return c.json({
    niche: config.active_niche ?? config.activeNiche ?? 'hvac',
    cities: config.active_cities ?? config.activeCities ?? [],
    proxies: (config.scraper_proxies ?? []) as Array<{ url: string; username?: string; password?: string }>,
    maxRequestsPerMinute: config.scraper_max_rpm ?? 8,
    maxRetries: config.scraper_max_retries ?? 3,
    interRequestDelayMs: config.scraper_delay_ms ?? [5000, 12000],
  })
})

scraperRoutes.patch('/config', async (c) => {
  const db = getDb()
  const body = await c.req.json()
  const updates: Record<string, unknown> = {}

  if (body.niche !== undefined) updates.active_niche = body.niche
  if (body.cities !== undefined) updates.active_cities = body.cities
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
  }

  if (body.niche || body.cities) {
    const updates: Record<string, unknown> = {}
    if (body.niche) updates.active_niche = body.niche
    if (body.cities) updates.active_cities = body.cities
    await db.updateGlobal({ slug: 'system-config', data: updates })
  }

  const job = await db.create({
    collection: 'jobs',
    data: {
      job_type: 'lead_gen',
      status: 'queued',
      input_data: { niche: body.niche, cities: body.cities },
      run_at: new Date().toISOString(),
      max_attempts: 3,
      attempts: 0,
    },
  })

  return c.json({ queued: true, jobId: job.id, jobType: 'lead_gen' }, 201)
})

scraperRoutes.get('/history', async (c) => {
  const db = getDb()
  const limit = parseInt(c.req.query('limit') ?? '50', 10)
  const result = await db.find({
    collection: 'jobs',
    where: { job_type: { equals: 'lead_gen' } },
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
  const source = c.req.query('source') ?? 'google_maps'
  const limit = parseInt(c.req.query('limit') ?? '200', 10)

  const conditions: any[] = [{ source: { equals: source } }]
  if (niche) conditions.push({ niche: { equals: niche } })
  if (city) conditions.push({ city: { contains: city } })
  if (status) conditions.push({ status: { equals: status } })
  if (search) conditions.push({ business_name: { contains: search } })

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

  return c.json({ totalDocs: result.totalDocs, docs })
})

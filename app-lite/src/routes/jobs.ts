import { Hono } from 'hono'
import { getDb } from '../db'

export const jobRoutes = new Hono()

// List jobs
jobRoutes.get('/', async (c) => {
  const db = getDb()
  const status = c.req.query('status')
  const jobType = c.req.query('jobType')
  const limit = parseInt(c.req.query('limit') ?? '50', 10)

  const conditions: any[] = []
  if (status) conditions.push({ status: { equals: status } })
  if (jobType) conditions.push({ job_type: { equals: jobType } })
  const where = conditions.length > 0 ? { and: conditions } : undefined
  const result = await db.find({ collection: 'jobs', where, limit })
  return c.json(result)
})

// Get job by ID
jobRoutes.get('/:id', async (c) => {
  const db = getDb()
  try {
    const job = await db.findByID({ collection: 'jobs', id: c.req.param('id') })
    return c.json(job)
  } catch {
    return c.json({ error: 'Job not found' }, 404)
  }
})

// Get pipeline events
jobRoutes.get('/pipeline/events', async (c) => {
  const db = getDb()
  const limit = parseInt(c.req.query('limit') ?? '50', 10)
  const result = await db.find({ collection: 'pipeline-events', limit, sort: '-createdAt' })
  return c.json(result)
})

// Get policy checks
jobRoutes.get('/policy/checks', async (c) => {
  const db = getDb()
  const limit = parseInt(c.req.query('limit') ?? '50', 10)
  const result = await db.find({ collection: 'policy-checks', limit, sort: '-createdAt' })
  return c.json(result)
})

// Manually trigger a specific job
const ALLOWED_TRIGGERS = ['lead_gen', 'email_enrich', 'email_validate', 'churn_check', 'monthly_report', 'site_qa'] as const
jobRoutes.post('/trigger', async (c) => {
  const db = getDb()
  const { jobType, data } = await c.req.json()

  if (!ALLOWED_TRIGGERS.includes(jobType)) {
    return c.json({ error: `Invalid job type. Allowed: ${ALLOWED_TRIGGERS.join(', ')}` }, 400)
  }

  const job = await db.create({
    collection: 'jobs',
    data: {
      job_type: jobType,
      status: 'queued',
      input_data: data ?? {},
      run_at: new Date().toISOString(),
      max_attempts: 3,
      attempts: 0,
    },
  })

  return c.json({ queued: true, jobId: job.id, jobType }, 201)
})

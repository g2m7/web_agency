import { Hono } from 'hono'
import { getDb } from '../db'
import { transitionLead } from '../state-machine/orchestrator'
import type { LeadStatus } from '../types'

export const leadRoutes = new Hono()

// List leads (supports ?status=&niche=&city=&search=&sort=&limit=)
leadRoutes.get('/', async (c) => {
  const db = getDb()
  const status = c.req.query('status')
  const niche = c.req.query('niche')
  const city = c.req.query('city')
  const search = c.req.query('search')
  const sort = c.req.query('sort') || '-createdAt'
  const limit = parseInt(c.req.query('limit') ?? '100', 10)

  const conditions: any[] = []
  if (status) conditions.push({ status: { equals: status } })
  if (niche) conditions.push({ niche: { equals: niche } })
  if (city) conditions.push({ city: { contains: city } })
  if (search) conditions.push({ business_name: { contains: search } })

  const where = conditions.length > 0 ? { and: conditions } : undefined
  const result = await db.find({ collection: 'leads', where, limit, sort })
  return c.json(result)
})

// Get lead by ID
leadRoutes.get('/:id', async (c) => {
  const db = getDb()
  try {
    const lead = await db.findByID({ collection: 'leads', id: c.req.param('id') })
    return c.json(lead)
  } catch {
    return c.json({ error: 'Lead not found' }, 404)
  }
})

// Create lead
leadRoutes.post('/', async (c) => {
  const db = getDb()
  const data = await c.req.json()
  try {
    const lead = await db.create({ collection: 'leads', data })
    return c.json(lead, 201)
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Create failed' }, 400)
  }
})

// Update lead
leadRoutes.patch('/:id', async (c) => {
  const db = getDb()
  const data = await c.req.json()
  try {
    const lead = await db.update({ collection: 'leads', id: c.req.param('id'), data })
    return c.json(lead)
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Update failed' }, 400)
  }
})

// Transition lead status
leadRoutes.post('/:id/transition', async (c) => {
  const db = getDb()
  const { to, triggeredBy, skillVersion, decisionData } = await c.req.json()
  const lead = await db.findByID({ collection: 'leads', id: c.req.param('id') })

  const result = await transitionLead(
    db,
    c.req.param('id'),
    lead.status as LeadStatus,
    to as LeadStatus,
    { triggeredBy: triggeredBy ?? 'api', skillVersion, decisionData },
  )

  if (!result.success) {
    return c.json({ success: false, reason: result.reason }, 422)
  }
  return c.json({ success: true })
})

// Delete lead
leadRoutes.delete('/:id', async (c) => {
  const db = getDb()
  try {
    await db.delete({ collection: 'leads', id: c.req.param('id') })
    return c.json({ deleted: true })
  } catch {
    return c.json({ error: 'Lead not found' }, 404)
  }
})

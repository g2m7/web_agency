import { Hono } from 'hono'
import { getDb } from '../db'
import { transitionClient } from '../state-machine/orchestrator'
import type { ClientStatus } from '../types'

export const clientRoutes = new Hono()

// List clients
clientRoutes.get('/', async (c) => {
  const db = getDb()
  const status = c.req.query('status')
  const limit = parseInt(c.req.query('limit') ?? '50', 10)

  const where = status ? { status: { equals: status } } : undefined
  const result = await db.find({ collection: 'clients', where, limit })
  return c.json(result)
})

// Get client by ID
clientRoutes.get('/:id', async (c) => {
  const db = getDb()
  try {
    const client = await db.findByID({ collection: 'clients', id: c.req.param('id') })
    return c.json(client)
  } catch {
    return c.json({ error: 'Client not found' }, 404)
  }
})

// Create client
clientRoutes.post('/', async (c) => {
  const db = getDb()
  const data = await c.req.json()
  try {
    const client = await db.create({ collection: 'clients', data })
    return c.json(client, 201)
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Create failed' }, 400)
  }
})

// Update client (status changes must go through POST /:id/transition)
clientRoutes.patch('/:id', async (c) => {
  const db = getDb()
  const data = await c.req.json()
  if ('status' in data) {
    return c.json({ error: 'Use POST /:id/transition to change status' }, 422)
  }
  try {
    const client = await db.update({ collection: 'clients', id: c.req.param('id'), data })
    return c.json(client)
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Update failed' }, 400)
  }
})

// Transition client status
clientRoutes.post('/:id/transition', async (c) => {
  const db = getDb()
  const { to, triggeredBy, skillVersion, decisionData } = await c.req.json()
  const client = await db.findByID({ collection: 'clients', id: c.req.param('id') })

  const result = await transitionClient(
    db,
    c.req.param('id'),
    client.status as ClientStatus,
    to as ClientStatus,
    { triggeredBy: triggeredBy ?? 'api', skillVersion, decisionData },
  )

  if (!result.success) {
    return c.json({ success: false, reason: result.reason }, 422)
  }
  return c.json({ success: true })
})

// Delete client
clientRoutes.delete('/:id', async (c) => {
  const db = getDb()
  try {
    await db.delete({ collection: 'clients', id: c.req.param('id') })
    return c.json({ deleted: true })
  } catch {
    return c.json({ error: 'Client not found' }, 404)
  }
})

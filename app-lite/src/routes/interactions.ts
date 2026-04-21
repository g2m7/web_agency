import { Hono } from 'hono'
import { getDb } from '../db'

export const interactionRoutes = new Hono()

// List interactions
interactionRoutes.get('/', async (c) => {
  const db = getDb()
  const leadId = c.req.query('lead_id')
  const limit = parseInt(c.req.query('limit') ?? '50', 10)

  const where = leadId ? { lead: { equals: leadId } } : undefined
  const result = await db.find({ collection: 'interactions', where, limit })
  return c.json(result)
})

// Get interaction by ID
interactionRoutes.get('/:id', async (c) => {
  const db = getDb()
  try {
    const interaction = await db.findByID({ collection: 'interactions', id: c.req.param('id') })
    return c.json(interaction)
  } catch {
    return c.json({ error: 'Interaction not found' }, 404)
  }
})

// Create interaction
interactionRoutes.post('/', async (c) => {
  const db = getDb()
  const data = await c.req.json()
  try {
    const interaction = await db.create({ collection: 'interactions', data })
    return c.json(interaction, 201)
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Create failed' }, 400)
  }
})

// Update interaction
interactionRoutes.patch('/:id', async (c) => {
  const db = getDb()
  const data = await c.req.json()
  try {
    const interaction = await db.update({ collection: 'interactions', id: c.req.param('id'), data })
    return c.json(interaction)
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Update failed' }, 400)
  }
})

// List client interactions
interactionRoutes.get('/client/:clientId', async (c) => {
  const db = getDb()
  const clientId = c.req.param('clientId')
  const limit = parseInt(c.req.query('limit') ?? '50', 10)

  const result = await db.find({
    collection: 'client-interactions',
    where: { client: { equals: clientId } },
    limit,
  })
  return c.json(result)
})

// Create client interaction
interactionRoutes.post('/client', async (c) => {
  const db = getDb()
  const data = await c.req.json()
  try {
    const interaction = await db.create({ collection: 'client-interactions', data })
    return c.json(interaction, 201)
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Create failed' }, 400)
  }
})

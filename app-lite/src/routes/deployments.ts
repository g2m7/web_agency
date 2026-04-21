import { Hono } from 'hono'
import { getDb } from '../db'

export const deploymentRoutes = new Hono()

// List deployments
deploymentRoutes.get('/', async (c) => {
  const db = getDb()
  const clientId = c.req.query('client_id')
  const limit = parseInt(c.req.query('limit') ?? '50', 10)

  const where = clientId ? { client: { equals: clientId } } : undefined
  const result = await db.find({ collection: 'deployments', where, limit })
  return c.json(result)
})

// Get deployment by ID
deploymentRoutes.get('/:id', async (c) => {
  const db = getDb()
  try {
    const deployment = await db.findByID({ collection: 'deployments', id: c.req.param('id') })
    return c.json(deployment)
  } catch {
    return c.json({ error: 'Deployment not found' }, 404)
  }
})

// Create deployment
deploymentRoutes.post('/', async (c) => {
  const db = getDb()
  const data = await c.req.json()
  try {
    const deployment = await db.create({ collection: 'deployments', data })
    return c.json(deployment, 201)
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Create failed' }, 400)
  }
})

// Update deployment
deploymentRoutes.patch('/:id', async (c) => {
  const db = getDb()
  const data = await c.req.json()
  try {
    const deployment = await db.update({ collection: 'deployments', id: c.req.param('id'), data })
    return c.json(deployment)
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Update failed' }, 400)
  }
})

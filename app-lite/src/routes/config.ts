import { Hono } from 'hono'
import { getDb } from '../db'

export const configRoutes = new Hono()

// Get system config
configRoutes.get('/', async (c) => {
  const db = getDb()
  const config = await db.findGlobal({ slug: 'system-config' })
  return c.json(config)
})

// Update system config
configRoutes.patch('/', async (c) => {
  const db = getDb()
  const data = await c.req.json()
  const config = await db.updateGlobal({ slug: 'system-config', data })
  return c.json(config)
})

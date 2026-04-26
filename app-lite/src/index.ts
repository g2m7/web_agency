import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { getDb, disconnectDb } from './db'
import { startWorkers, stopWorkers } from './jobs/workers'
import { startRecurringJobs } from './jobs/scheduler'
import { leadRoutes } from './routes/leads'
import { clientRoutes } from './routes/clients'
import { interactionRoutes } from './routes/interactions'
import { deploymentRoutes } from './routes/deployments'
import { jobRoutes } from './routes/jobs'
import { configRoutes } from './routes/config'
import { scraperRoutes } from './routes/scraper'
import { dodoWebhook } from './routes/webhooks/dodo'
import { resendWebhook } from './routes/webhooks/resend'
import { cloudflareWebhook } from './routes/webhooks/cloudflare'
import { initializeDatabase } from './db/migrate'

const app = new Hono()
let server: ReturnType<typeof Bun.serve> | null = null

// ── Middleware ───────────────────────────────────────────────
app.use('*', logger())
app.use('*', cors())

// ── API Key Auth ────────────────────────────────────────────
app.use('/api/*', async (c, next) => {
  const apiKey = c.req.header('x-api-key') ?? c.req.query('api_key')
  const expected = process.env.API_KEY_INTERNAL
  if (!expected || apiKey !== expected) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})

// ── Routes ──────────────────────────────────────────────────
app.route('/api/leads', leadRoutes)
app.route('/api/clients', clientRoutes)
app.route('/api/interactions', interactionRoutes)
app.route('/api/deployments', deploymentRoutes)
app.route('/api/jobs', jobRoutes)
app.route('/api/config', configRoutes)
app.route('/api/scraper', scraperRoutes)

// Webhooks (no API key — use their own verification)
app.route('/webhooks/dodo', dodoWebhook)
app.route('/webhooks/resend', resendWebhook)
app.route('/webhooks/cloudflare', cloudflareWebhook)

// ── Health ──────────────────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ── Root ────────────────────────────────────────────────────
app.get('/', async (c) => {
  const html = await Bun.file(import.meta.dir + '/../public/index.html').text()
  return c.html(html)
})

// ── Startup ─────────────────────────────────────────────────
const port = parseInt(process.env.PORT ?? '3006', 10)

async function main() {
  console.log('─── Web Agency Engine ───────────────────')

  // Initialize database & create tables
  await initializeDatabase()

  // Start job workers
  const db = getDb()
  if (process.env.ENABLE_RECURRING_JOBS === 'true') {
    await startRecurringJobs(db)
  } else {
    console.log('Recurring jobs disabled (set ENABLE_RECURRING_JOBS=true to enable)')
  }

  if (process.env.ENABLE_WORKERS === 'false') {
    console.log('Job workers disabled (ENABLE_WORKERS=false)')
  } else {
    await startWorkers(db)
  }

  server = Bun.serve({
    port,
    fetch: app.fetch,
  })

  console.log(`Server running on http://localhost:${port}`)
}

main().catch((err) => {
  console.error('Failed to start:', err)
  process.exit(1)
})

// ── Graceful shutdown ───────────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\nShutting down...')
  await stopWorkers()
  server?.stop()
  disconnectDb()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await stopWorkers()
  server?.stop()
  disconnectDb()
  process.exit(0)
})

export { app }

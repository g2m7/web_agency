import { Hono } from 'hono'
import { getDb } from '../../db'

export const cloudflareWebhook = new Hono()

// Cloudflare Pages deploy callback
cloudflareWebhook.post('/', async (c) => {
  const db = getDb()
  const body = await c.req.json()

  const deploymentId = body.metadata?.deployment_id
  const deployStatus = body.status ?? body.latest_stage?.status

  if (!deploymentId) {
    return c.json({ status: 'no_deployment_id' })
  }

  try {
    const deployment = await db.findByID({ collection: 'deployments', id: deploymentId })

    const statusMap: Record<string, string> = {
      success: 'deployed',
      active: 'deployed',
      failure: 'failed',
    }

    const newStatus = statusMap[deployStatus] ?? deployment.status
    const previewUrl = body.url ?? body.preview_url

    await db.update({
      collection: 'deployments',
      id: deploymentId,
      data: {
        status: newStatus,
        ...(previewUrl ? { preview_url: previewUrl } : {}),
        ...(newStatus === 'deployed' ? { deployed_at: new Date().toISOString() } : {}),
      },
    })

    return c.json({ status: 'processed' })
  } catch {
    return c.json({ status: 'deployment_not_found' }, 404)
  }
})

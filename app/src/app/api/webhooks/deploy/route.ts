import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { createDbClientFromPayload } from '@/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const event = JSON.parse(body)

    const payload = await getPayload({ config })
    const db = createDbClientFromPayload(payload)

    const deployId = event.id ?? ''
    const status = event.success ? 'deployed' : 'failed'
    const url = event.url ?? event.deploy_url ?? ''

    const deployments = await db.find({
      collection: 'deployments',
      where: { preview_url: { contains: deployId } },
      limit: 1,
    })

    const deployment = deployments.docs[0]
    if (deployment) {
      await db.update({
        collection: 'deployments',
        id: String(deployment.id),
        data: { status, deployed_at: new Date().toISOString(), ...(url ? { preview_url: url } : {}) },
      })
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Deploy webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

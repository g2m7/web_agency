import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { verifyWebhookSignature } from '@/middleware/auth'
import { isAlreadyProcessed } from '@/services/idempotency'
import { createDbClientFromPayload } from '@/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-polar-signature') ?? ''
    const secret = process.env.POLAR_WEBHOOK_SECRET ?? ''

    if (!verifyWebhookSignature(body, signature, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    const eventId = event.data?.event_id ?? event.id ?? ''
    if (!eventId) return NextResponse.json({ error: 'Missing event ID' }, { status: 400 })

    const payload = await getPayload({ config })
    const db = createDbClientFromPayload(payload)

    if (await isAlreadyProcessed(db, 'billing-events', eventId)) {
      return NextResponse.json({ status: 'already_processed' })
    }

    await db.create({
      collection: 'billing-events',
      data: {
        client: event.data?.customer_id ?? '',
        event_type: event.type ?? '',
        idempotency_key: eventId,
        amount_cents: event.data?.amount ?? 0,
        currency: event.data?.currency ?? 'usd',
        plan_at_event: event.data?.product?.name ?? '',
        provider_data: event,
      },
    })

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Polar webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

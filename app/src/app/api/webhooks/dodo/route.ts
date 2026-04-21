import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { verifyWebhookSignature } from '@/middleware/auth'
import { isAlreadyProcessed } from '@/services/idempotency'
import { createDbClientFromPayload } from '@/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-dodo-signature') ?? ''
    const secret = process.env.DODO_WEBHOOK_SECRET ?? ''

    if (!verifyWebhookSignature(body, signature, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    const eventId = event.id ?? event.event_id ?? ''
    if (!eventId) return NextResponse.json({ error: 'Missing event ID' }, { status: 400 })

    const payload = await getPayload({ config })
    const db = createDbClientFromPayload(payload)

    if (await isAlreadyProcessed(db, 'billing-events', eventId)) {
      return NextResponse.json({ status: 'already_processed' })
    }

    const eventType = event.type ?? event.event_type ?? ''
    const customerId = event.data?.customer_id ?? event.data?.client_id ?? ''

    await db.create({
      collection: 'billing-events',
      data: {
        client: customerId,
        event_type: mapEventType(eventType),
        idempotency_key: eventId,
        amount_cents: event.data?.amount ?? 0,
        currency: event.data?.currency ?? 'usd',
        plan_at_event: event.data?.plan ?? '',
        provider_data: event,
      },
    })

    if (eventType === 'checkout_complete' || eventType === 'payment.success') {
      const clients = await db.find({
        collection: 'clients',
        where: { subscription_id: { equals: event.data?.subscription_id ?? '' } },
        limit: 1,
      })
      const client = clients.docs[0]
      if (client) {
        await db.update({ collection: 'clients', id: String(client.id), data: { status: 'onboarding' } })
      }
    }

    if (eventType === 'subscription_cancelled' || eventType === 'subscription.canceled') {
      const clients = await db.find({
        collection: 'clients',
        where: { subscription_id: { equals: event.data?.subscription_id ?? '' } },
        limit: 1,
      })
      const c = clients.docs[0]
      if (c) {
        await db.update({ collection: 'clients', id: String(c.id), data: { status: 'cancelled', cancelled_at: new Date().toISOString() } })
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Dodo webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

function mapEventType(type: string): string {
  const map: Record<string, string> = {
    'payment.success': 'checkout_complete',
    'checkout_complete': 'checkout_complete',
    'subscription.renewed': 'renewal_success',
    'payment.failed': 'renewal_failed',
    'subscription.canceled': 'subscription_cancelled',
    'subscription.resumed': 'subscription_resumed',
  }
  return map[type] ?? type
}

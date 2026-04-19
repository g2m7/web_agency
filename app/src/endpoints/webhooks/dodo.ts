import type { PayloadRequest } from 'payload'
import { verifyWebhookSignature } from '../../middleware/auth'
import { isAlreadyProcessed } from '../../services/idempotency'

export default async function dodoWebhook(req: PayloadRequest) {
  const body = await (req.text?.() ?? Promise.resolve(''))
  const signature = req.headers.get('x-dodo-signature') ?? ''
  const secret = process.env.DODO_WEBHOOK_SECRET ?? ''

  if (!verifyWebhookSignature(body, signature, secret)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)
  const eventId = event.id ?? event.event_id ?? ''

  if (!eventId) {
    return Response.json({ error: 'Missing event ID' }, { status: 400 })
  }

  const payload = req.payload
  const alreadyProcessed = await isAlreadyProcessed(payload, 'billing-events', eventId)
  if (alreadyProcessed) {
    return Response.json({ status: 'already_processed' })
  }

  const eventType = event.type ?? event.event_type ?? ''
  const customerId = event.data?.customer_id ?? event.data?.client_id ?? ''
  const amountCents = event.data?.amount ?? 0
  const currency = event.data?.currency ?? 'usd'
  const planAtEvent = event.data?.plan ?? ''

  await payload.create({
    collection: 'billing-events',
    data: {
      client: customerId,
      event_type: mapEventType(eventType),
      idempotency_key: eventId,
      amount_cents: amountCents,
      currency,
      plan_at_event: planAtEvent,
      provider_data: event,
    },
  })

  if (eventType === 'checkout_complete' || eventType === 'payment.success') {
    const clients = await payload.find({
      collection: 'clients',
      where: { subscription_id: { equals: event.data?.subscription_id ?? '' } },
      limit: 1,
    })

    const client = clients.docs[0]
    if (client) {
      await payload.update({
        collection: 'clients',
        id: String(client.id),
        data: { status: 'onboarding' },
      })
      await payload.create({
        collection: 'jobs',
        data: {
          job_type: 'onboarding',
          client: String(client.id),
          status: 'queued',
          run_at: new Date().toISOString(),
          input_data: { billing_event_id: eventId },
        },
      })
    }
  }

  if (eventType === 'subscription_cancelled' || eventType === 'subscription.canceled') {
    const clients = await payload.find({
      collection: 'clients',
      where: { subscription_id: { equals: event.data?.subscription_id ?? '' } },
      limit: 1,
    })
    const cancelClient = clients.docs[0]
    if (cancelClient) {
      await payload.update({
        collection: 'clients',
        id: String(cancelClient.id),
        data: { status: 'cancelled', cancelled_at: new Date().toISOString() },
      })
    }
  }

  return Response.json({ received: true })
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

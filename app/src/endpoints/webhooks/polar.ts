import type { PayloadRequest } from 'payload'
import { verifyWebhookSignature } from '../../middleware/auth'
import { isAlreadyProcessed } from '../../services/idempotency'

export default async function polarWebhook(req: PayloadRequest) {
  const body = await (req.text?.() ?? Promise.resolve(''))
  const signature = req.headers.get('x-polar-signature') ?? ''
  const secret = process.env.POLAR_WEBHOOK_SECRET ?? ''

  if (!verifyWebhookSignature(body, signature, secret)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)
  const eventId = event.data?.event_id ?? event.id ?? ''

  if (!eventId) {
    return Response.json({ error: 'Missing event ID' }, { status: 400 })
  }

  const payload = req.payload
  const alreadyProcessed = await isAlreadyProcessed(payload, 'billing-events', eventId)
  if (alreadyProcessed) {
    return Response.json({ status: 'already_processed' })
  }

  await payload.create({
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

  return Response.json({ received: true })
}

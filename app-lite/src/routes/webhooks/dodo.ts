import { Hono } from 'hono'
import { getDb } from '../../db'
import { isAlreadyProcessed } from '../../services/idempotency'
import { transitionLead } from '../../state-machine/orchestrator'
import { transitionClient } from '../../state-machine/orchestrator'
import type { LeadStatus, ClientStatus } from '../../types'
import crypto from 'crypto'

export const dodoWebhook = new Hono()

// Dodo/Polar payment webhook
dodoWebhook.post('/', async (c) => {
  const db = getDb()

  // Verify HMAC signature
  const signature = c.req.header('x-webhook-signature')
  const secret = process.env.DODO_WEBHOOK_SECRET
  if (secret && signature) {
    const raw = await c.req.raw.clone().text()
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex')
    if (signature !== expected) {
      return c.json({ error: 'Invalid signature' }, 401)
    }
  }

  const body = await c.req.json()
  const eventType = body.type ?? body.event_type
  const idempotencyKey = body.idempotency_key ?? body.id ?? `dodo_${Date.now()}`

  // Idempotency check
  const alreadyProcessed = await isAlreadyProcessed(db, 'billing-events', idempotencyKey)
  if (alreadyProcessed) {
    return c.json({ status: 'already_processed' })
  }

  const clientId = body.metadata?.client_id
  if (!clientId) {
    return c.json({ error: 'No client_id in metadata' }, 400)
  }

  // Record billing event
  await db.create({
    collection: 'billing-events',
    data: {
      client: clientId,
      event_type: eventType,
      idempotency_key: idempotencyKey,
      amount_cents: body.amount_cents ?? body.amount ?? 0,
      currency: body.currency ?? 'usd',
      plan_at_event: body.metadata?.plan ?? '',
      provider_data: body,
    },
  })

  // Handle payment success
  if (eventType === 'payment.success' || eventType === 'subscription.active') {
    try {
      const client = await db.findByID({ collection: 'clients', id: clientId })

      if (client.status === 'pending_payment') {
        await transitionClient(db, clientId, 'pending_payment', 'onboarding', {
          triggeredBy: 'webhook:dodo',
        })
      } else if (client.status === 'payment_failed' || client.status === 'grace_period' || client.status === 'suspended') {
        await transitionClient(db, clientId, client.status as ClientStatus, 'active', {
          triggeredBy: 'webhook:dodo',
        })
      }
    } catch (err) {
      console.error('Dodo webhook client transition error:', err)
    }
  }

  // Handle payment failure
  if (eventType === 'payment.failed' || eventType === 'subscription.payment_failed') {
    try {
      const client = await db.findByID({ collection: 'clients', id: clientId })
      if (client.status === 'active') {
        await transitionClient(db, clientId, 'active', 'payment_failed', {
          triggeredBy: 'webhook:dodo',
        })
      }
    } catch (err) {
      console.error('Dodo webhook payment failure handling error:', err)
    }
  }

  return c.json({ status: 'processed' })
})

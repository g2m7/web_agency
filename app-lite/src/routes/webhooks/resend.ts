import { Hono } from 'hono'
import { getDb } from '../../db'

export const resendWebhook = new Hono()

// Resend email status webhook
resendWebhook.post('/', async (c) => {
  const db = getDb()
  const body = await c.req.json()

  const eventType = body.type
  const messageId = body.data?.email_id

  if (!messageId) {
    return c.json({ status: 'no_message_id' })
  }

  // Find interaction by resend message ID
  const result = await db.find({
    collection: 'interactions',
    where: { resend_message_id: { equals: messageId } },
    limit: 1,
  })

  if (result.docs.length === 0) {
    return c.json({ status: 'not_found' })
  }

  const interaction = result.docs[0]
  const statusMap: Record<string, string> = {
    'email.delivered': 'delivered',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
    'email.opened': 'opened',
    'email.clicked': 'clicked',
  }

  const newStatus = statusMap[eventType]
  if (newStatus) {
    await db.update({
      collection: 'interactions',
      id: String(interaction.id),
      data: { status: newStatus },
    })
  }

  return c.json({ status: 'processed' })
})

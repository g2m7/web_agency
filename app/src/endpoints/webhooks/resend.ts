import type { PayloadRequest } from 'payload'

export default async function resendWebhook(req: PayloadRequest) {
  const body = await (req.text?.() ?? Promise.resolve('{}'))
  const event = JSON.parse(body)

  const payload = req.payload
  const messageType = event.data?.type ?? ''
  const resendId = event.data?.email_id ?? ''

  if (!resendId) return Response.json({ received: true })

  const interactions = await payload.find({
    collection: 'interactions',
    where: { resend_message_id: { equals: resendId } },
    limit: 1,
  })

  if (interactions.docs.length === 0) return Response.json({ received: true })

  const interaction = interactions.docs[0]
  if (!interaction) return Response.json({ received: true })

  const statusMap: Record<string, string> = {
    delivered: 'delivered',
    bounced: 'bounced',
    complained: 'bounced',
    opened: 'delivered',
  }

  const newStatus = statusMap[messageType]
  if (newStatus) {
    await payload.update({
      collection: 'interactions',
      id: interaction.id,
      data: { status: newStatus },
    })
  }

  return Response.json({ received: true })
}

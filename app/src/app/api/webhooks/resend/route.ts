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

    const messageType = event.data?.type ?? ''
    const resendId = event.data?.email_id ?? ''
    if (!resendId) return NextResponse.json({ received: true })

    const interactions = await db.find({
      collection: 'interactions',
      where: { resend_message_id: { equals: resendId } },
      limit: 1,
    })

    if (interactions.docs.length === 0) return NextResponse.json({ received: true })

    const interaction = interactions.docs[0]!
    const statusMap: Record<string, string> = { delivered: 'delivered', bounced: 'bounced', complained: 'bounced', opened: 'delivered' }
    const newStatus = statusMap[messageType]
    if (newStatus) {
      await db.update({ collection: 'interactions', id: interaction.id, data: { status: newStatus } })
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Resend webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

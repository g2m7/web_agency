import type { Payload } from 'payload'

export async function isAlreadyProcessed(payload: Payload, collection: string, idempotencyKey: string): Promise<boolean> {
  const existing = await payload.find({
    collection,
    where: { idempotency_key: { equals: idempotencyKey } },
    limit: 1,
  })
  return existing.totalDocs > 0
}

export async function isEmailAlreadySent(payload: Payload, interactionId: string): Promise<boolean> {
  const existing = await payload.findByID({ collection: 'interactions', id: interactionId }).catch(() => null)
  if (!existing) return false
  return (existing as any).status === 'sent' || (existing as any).status === 'delivered'
}

export async function isFollowUpAlreadyScheduled(payload: Payload, leadId: string, sequenceNumber: number): Promise<boolean> {
  const existing = await payload.find({
    collection: 'jobs',
    where: {
      and: [
        { lead: { equals: leadId } },
        { job_type: { equals: sequenceNumber === 1 ? 'follow_up_1' : 'follow_up_2' } },
        { status: { in: ['queued', 'running'] } },
      ],
    },
    limit: 1,
  })
  return existing.totalDocs > 0
}

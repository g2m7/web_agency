import type { DbClient } from '../db'

export async function isAlreadyProcessed(db: DbClient, collection: 'billing-events' | 'client-interactions' | 'interactions' | 'jobs', idempotencyKey: string): Promise<boolean> {
  const existing = await db.find({
    collection,
    where: { idempotency_key: { equals: idempotencyKey } },
    limit: 1,
  })
  return existing.totalDocs > 0
}

export async function isEmailAlreadySent(db: DbClient, interactionId: string): Promise<boolean> {
  const existing = await db.findByID({ collection: 'interactions', id: interactionId }).catch(() => null)
  if (!existing) return false
  return existing.status === 'sent' || existing.status === 'delivered'
}

export async function isFollowUpAlreadyScheduled(db: DbClient, leadId: string, sequenceNumber: number): Promise<boolean> {
  const existing = await db.find({
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

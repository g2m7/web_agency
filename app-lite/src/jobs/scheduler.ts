import type { DbClient } from '../db'
import type { LeadStatus, ClientStatus } from '../types'
import { enqueueJob } from './queue'

export async function startScheduler(_db: DbClient) {
  // Recurring jobs will be enqueued by the server on startup or via external cron.
  // BullMQ repeatable jobs are no longer used — the DB-backed scheduler polls the jobs table.
  console.log('Scheduler initialized (recurring jobs enqueued via startRecurringJobs)')
}

export async function startRecurringJobs(db: DbClient) {
  const recurringTypes = ['lead_gen', 'monthly_report', 'churn_check', 'niche_discover'] as const

  for (const jobType of recurringTypes) {
    if (jobType === 'niche_discover') {
      await maybeEnqueueDiscovery(db)
      continue
    }

    const recent = await db.find({
      collection: 'jobs',
      where: {
        and: [
          { job_type: { equals: jobType } },
          { status: { in: ['queued', 'running'] } },
        ],
      },
      limit: 1,
    })

    if (recent.totalDocs > 0) continue

    const lastCompleted = await db.find({
      collection: 'jobs',
      where: {
        and: [
          { job_type: { equals: jobType } },
          { status: { equals: 'completed' } },
        ],
      },
      limit: 1,
      sort: '-completedAt',
    })

    if (lastCompleted.totalDocs > 0) {
      const completedAt = lastCompleted.docs[0].completedAt ?? lastCompleted.docs[0].completed_at
      const ageMs = Date.now() - new Date(completedAt).getTime()
      if (ageMs < 60 * 60 * 1000) continue
    }

    await enqueueJob(db, jobType, {})
  }

  console.log('Recurring jobs enqueued')
}

async function maybeEnqueueDiscovery(db: DbClient) {
  const existing = await db.find({
    collection: 'jobs',
    where: {
      and: [
        { job_type: { equals: 'niche_discover' } },
        { status: { in: ['queued', 'running'] } },
      ],
    },
    limit: 1,
  })

  if (existing.totalDocs > 0) return

  const config = await db.findGlobal({ slug: 'system-config' })
  const enabled = config.discoveryEnabled ?? config.discovery_enabled ?? true
  const intervalHours = config.discoveryIntervalHours ?? config.discovery_interval_hours ?? 6
  const lastRun = config.discoveryLastRun ?? config.discovery_last_run

  if (!enabled) return

  const shouldRun = !lastRun ||
    (Date.now() - new Date(lastRun).getTime()) > intervalHours * 60 * 60 * 1000

  if (shouldRun) {
    await enqueueJob(db, 'niche_discover', { triggeredBy: 'scheduler' })
  }
}

export async function scheduleAfterTransition(
  db: DbClient,
  entityType: 'lead' | 'client',
  entityId: string,
  newStatus: string,
) {
  if (entityType === 'lead') {
    const leadStatus = newStatus as LeadStatus

    if (leadStatus === 'contacted') {
      await enqueueJob(db, 'follow_up_1', { leadId: entityId }, 3 * 24 * 60 * 60 * 1000)
      await enqueueJob(db, 'follow_up_2', { leadId: entityId }, 7 * 24 * 60 * 60 * 1000)
    }

    if (leadStatus === 'replied_interested') {
      await enqueueJob(db, 'demo_build', { leadId: entityId })
    }
  }

  if (entityType === 'client') {
    const clientStatus = newStatus as ClientStatus

    if (clientStatus === 'onboarding') {
      await enqueueJob(db, 'onboarding', { clientId: entityId })
    }

    if (clientStatus === 'payment_failed') {
      await enqueueJob(db, 'billing_retry', { clientId: entityId })
    }
  }
}

export { enqueueJob }

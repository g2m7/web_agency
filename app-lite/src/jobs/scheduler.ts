import type { DbClient } from '../db'
import type { LeadStatus, ClientStatus } from '../types'
import { enqueueJob } from './queue'

export async function startScheduler(_db: DbClient) {
  // Recurring jobs will be enqueued by the server on startup or via external cron.
  // BullMQ repeatable jobs are no longer used — the DB-backed scheduler polls the jobs table.
  console.log('Scheduler initialized (recurring jobs enqueued via startRecurringJobs)')
}

export async function startRecurringJobs(db: DbClient) {
  // Enqueue daily/weekly/monthly jobs if not already queued
  const existing = await db.find({
    collection: 'jobs',
    where: {
      and: [
        { job_type: { in: ['lead_gen', 'monthly_report', 'churn_check', 'niche_discover'] } },
        { status: { equals: 'queued' } },
      ],
    },
    limit: 10,
  })

  const existingTypes = new Set(existing.docs.map((d: any) => d.job_type))

  if (!existingTypes.has('lead_gen')) {
    await enqueueJob(db, 'lead_gen', {})
  }
  if (!existingTypes.has('monthly_report')) {
    await enqueueJob(db, 'monthly_report', {})
  }
  if (!existingTypes.has('churn_check')) {
    await enqueueJob(db, 'churn_check', {})
  }

  // Niche discovery — check if interval has elapsed
  if (!existingTypes.has('niche_discover')) {
    const config = await db.findGlobal({ slug: 'system-config' })
    const enabled = config.discoveryEnabled ?? config.discovery_enabled ?? true
    const intervalHours = config.discoveryIntervalHours ?? config.discovery_interval_hours ?? 6
    const lastRun = config.discoveryLastRun ?? config.discovery_last_run

    if (enabled) {
      const shouldRun = !lastRun ||
        (Date.now() - new Date(lastRun).getTime()) > intervalHours * 60 * 60 * 1000

      if (shouldRun) {
        await enqueueJob(db, 'niche_discover', { triggeredBy: 'scheduler' })
      }
    }
  }

  console.log('Recurring jobs enqueued')
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

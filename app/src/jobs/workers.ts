import type { DbClient } from '../db'
import type { ScheduledJob } from './queue'
import {
  handleLeadGen,
  handleFollowUp1,
  handleFollowUp2,
  handleDemoBuild,
  handleOnboarding,
  handleMonthlyReport,
  handleChurnCheck,
  handleSupportAutoReply,
  handleBillingRetry,
  handleSiteQa,
} from './handlers/index'

const handlers: Record<string, (db: DbClient, job: ScheduledJob) => Promise<Record<string, unknown>>> = {
  lead_gen: handleLeadGen,
  follow_up_1: handleFollowUp1,
  follow_up_2: handleFollowUp2,
  demo_build: handleDemoBuild,
  onboarding: handleOnboarding,
  monthly_report: handleMonthlyReport,
  churn_check: handleChurnCheck,
  support_auto_reply: handleSupportAutoReply,
  billing_retry: handleBillingRetry,
  site_qa: handleSiteQa,
}

let pollInterval: ReturnType<typeof setInterval> | null = null

export async function startWorkers(db: DbClient) {
  console.log('Job worker polling started')

  pollInterval = setInterval(async () => {
    try {
      await pollAndProcess(db)
    } catch (err) {
      console.error('Worker poll error:', err)
    }
  }, 30_000) // Poll every 30 seconds
}

async function pollAndProcess(db: DbClient) {
  const dueJobs = await db.find({
    collection: 'jobs',
    where: {
      and: [
        { status: { equals: 'queued' } },
        { run_at: { less_than: new Date().toISOString() } },
      ],
    },
    limit: 10,
    sort: 'run_at',
  })

  for (const jobDoc of dueJobs.docs) {
    const job: ScheduledJob = {
      id: String(jobDoc.id),
      name: jobDoc.job_type,
      data: (jobDoc.input_data as Record<string, unknown>) ?? {},
      attemptsMade: (jobDoc.attempts as number) ?? 0,
      maxAttempts: (jobDoc.max_attempts as number) ?? 3,
    }

    const handler = handlers[job.name]
    if (!handler) {
      console.error(`No handler for job type: ${job.name}`)
      continue
    }

    await db.update({
      collection: 'jobs',
      id: job.id,
      data: { status: 'running', started_at: new Date().toISOString(), attempts: job.attemptsMade + 1 },
    })

    try {
      const result = await handler(db, job)

      await db.update({
        collection: 'jobs',
        id: job.id,
        data: {
          status: 'completed',
          completed_at: new Date().toISOString(),
          output_data: result,
        },
      })
    } catch (error) {
      const isDead = job.attemptsMade + 1 >= job.maxAttempts
      await db.update({
        collection: 'jobs',
        id: job.id,
        data: {
          status: isDead ? 'dead' : 'queued',
          failed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : String(error),
          ...(isDead ? {} : { run_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() }),
        },
      })

      if (isDead) {
        const { sendAlert } = await import('../services/email')
        await sendAlert(
          `Job dead: ${job.name}`,
          `Job ${job.id} (${job.name}) has exhausted all retries.\n\nError: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
  }
}

export async function stopWorkers() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

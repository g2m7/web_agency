import type { DbClient } from '../db'
import type { ScheduledJob } from './queue'
import {
  handleLeadGen,
  handleEmailEnrich,
  handleEmailValidate,
  handleFollowUp1,
  handleFollowUp2,
  handleDemoBuild,
  handleOnboarding,
  handleMonthlyReport,
  handleChurnCheck,
  handleSupportAutoReply,
  handleBillingRetry,
  handleSiteQa,
  handleNicheScore,
  handleNicheValidate,
} from './handlers/index'
import { handleNicheDiscover } from './handlers/niche-discovery'

const handlers: Record<string, (db: DbClient, job: ScheduledJob) => Promise<Record<string, unknown>>> = {
  lead_gen: handleLeadGen,
  email_enrich: handleEmailEnrich,
  email_validate: handleEmailValidate,
  niche_score: handleNicheScore,
  niche_validate: handleNicheValidate,
  niche_discover: handleNicheDiscover,
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

const STUCK_JOB_TIMEOUT_MS = 30 * 60 * 1000

export async function startWorkers(db: DbClient) {
  await recoverStuckJobs(db)

  pollInterval = setInterval(async () => {
    try {
      await recoverStuckJobs(db)
      await pollAndProcess(db)
    } catch (err) {
      console.error('Worker poll error:', err)
    }
  }, 30_000)

  console.log('Job worker polling started')
}

async function recoverStuckJobs(db: DbClient) {
  const cutoff = new Date(Date.now() - STUCK_JOB_TIMEOUT_MS).toISOString()
  const stuck = await db.find({
    collection: 'jobs',
    where: {
      and: [
        { status: { equals: 'running' } },
        { started_at: { less_than: cutoff } },
      ],
    },
    limit: 50,
  })

  for (const job of stuck.docs) {
    const attempts = (job.attempts as number) ?? 0
    const maxAttempts = (job.maxAttempts ?? job.max_attempts ?? 3) as number
    const isDead = attempts >= maxAttempts

    await db.update({
      collection: 'jobs',
      id: String(job.id),
      data: {
        status: isDead ? 'dead' : 'queued',
        failed_at: new Date().toISOString(),
        error_message: 'Job timed out (stuck in running state)',
        ...(isDead ? {} : { run_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() }),
      },
    })
  }

  if (stuck.docs.length > 0) {
    console.log(`Recovered ${stuck.docs.length} stuck jobs`)
  }
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
    sort: 'runAt',
  })

  for (const jobDoc of dueJobs.docs) {
    const job: ScheduledJob = {
      id: String(jobDoc.id),
      name: jobDoc.jobType ?? jobDoc.job_type,
      data: (jobDoc.inputData ?? jobDoc.input_data ?? {}) as Record<string, unknown>,
      attemptsMade: (jobDoc.attempts as number) ?? 0,
      maxAttempts: (jobDoc.maxAttempts ?? jobDoc.max_attempts ?? 3) as number,
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

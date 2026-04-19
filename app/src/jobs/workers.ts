import { Worker } from 'bullmq'
import type { Payload } from 'payload'
import type { Job } from 'bullmq'
import { MAIN_QUEUE, connection } from './queue'
import { handleLeadGen } from './handlers/index'
import { handleFollowUp1 } from './handlers/index'
import { handleFollowUp2 } from './handlers/index'
import { handleDemoBuild } from './handlers/index'
import { handleOnboarding } from './handlers/index'
import { handleMonthlyReport } from './handlers/index'
import { handleChurnCheck } from './handlers/index'
import { handleSupportAutoReply } from './handlers/index'
import { handleBillingRetry } from './handlers/index'
import { handleSiteQa } from './handlers/index'

const handlers: Record<string, (payload: Payload, job: Job) => Promise<Record<string, unknown>>> = {
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

let worker: Worker | null = null

export async function startWorkers(payload: Payload) {
  worker = new Worker(
    'web-agency',
    async (job: Job) => {
      const handler = handlers[job.name]
      if (!handler) {
        throw new Error(`No handler for job type: ${job.name}`)
      }

      const jobRecord = await payload.find({
        collection: 'jobs',
        where: {
          and: [
            { job_type: { equals: job.name } },
            { status: { equals: 'queued' } },
          ],
        },
        limit: 1,
        sort: '-createdAt',
      })

      let jobId: string | undefined
      const jobDoc = jobRecord.docs[0]
      if (jobDoc) {
        jobId = String(jobDoc.id)
        await payload.update({
          collection: 'jobs',
          id: jobId,
          data: { status: 'running', started_at: new Date().toISOString(), attempts: { increment: 1 } },
        })
      }

      try {
        const result = await handler(payload, job)

        if (jobId) {
          await payload.update({
            collection: 'jobs',
            id: jobId,
            data: {
              status: 'completed',
              completed_at: new Date().toISOString(),
              output_data: result,
            },
          })
        }

        return result
      } catch (error) {
        if (jobId) {
          const isDead = job.attemptsMade >= (job.opts?.attempts ?? 3) - 1
          await payload.update({
            collection: 'jobs',
            id: jobId,
            data: {
              status: isDead ? 'dead' : 'failed',
              failed_at: new Date().toISOString(),
              error_message: error instanceof Error ? error.message : String(error),
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
        throw error
      }
    },
    { connection, concurrency: 5 },
  )

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message)
  })
}

export async function stopWorkers() {
  if (worker) {
    await worker.close()
    worker = null
  }
}

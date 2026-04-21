import type { DbClient } from '../db'
import type { JobType } from '../types'

export interface ScheduledJob {
  id: string
  name: string
  data: Record<string, unknown>
  attemptsMade: number
  maxAttempts: number
}

export async function enqueueJob(
  db: DbClient,
  type: JobType,
  data: Record<string, unknown>,
  delayMs?: number,
): Promise<any> {
  const runAt = delayMs
    ? new Date(Date.now() + delayMs).toISOString()
    : new Date().toISOString()

  return db.create({
    collection: 'jobs',
    data: {
      job_type: type,
      lead: (data.leadId as string) ?? undefined,
      client: (data.clientId as string) ?? undefined,
      status: 'queued',
      run_at: runAt,
      input_data: data,
    },
  })
}

export async function scheduleRecurringJob(
  db: DbClient,
  type: JobType,
  _pattern: string,
  data: Record<string, unknown>,
): Promise<any> {
  // Store the job; the scheduler will pick it up on the cron interval
  return enqueueJob(db, type, data)
}

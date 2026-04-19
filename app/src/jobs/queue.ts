import { Queue, Worker } from 'bullmq'
import type { Payload } from 'payload'
import type { JobType } from '../types'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

const connection = parseRedisUrl(REDIS_URL)

function parseRedisUrl(url: string) {
  try {
    const parsed = new URL(url)
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379'),
      password: parsed.password || undefined,
      db: parseInt(parsed.pathname.slice(1) || '0'),
    }
  } catch {
    return { host: 'localhost', port: 6379 }
  }
}

export const MAIN_QUEUE = new Queue('web-agency', { connection, defaultJobOptions: { removeOnComplete: 100, removeOnFail: 50 } })

export function getQueue() {
  return MAIN_QUEUE
}

export async function enqueueJob(type: JobType, data: Record<string, unknown>, delay?: number) {
  const jobId = `${type}-${data.leadId ?? data.clientId ?? ''}-${Date.now()}`
  return MAIN_QUEUE.add(type, data, {
    jobId,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    ...(delay ? { delay } : {}),
  })
}

export async function scheduleRecurringJob(type: JobType, pattern: string, data: Record<string, unknown>) {
  return MAIN_QUEUE.add(type, data, {
    repeat: { pattern },
    attempts: 2,
    backoff: { type: 'exponential', delay: 60000 },
  })
}

export { connection }

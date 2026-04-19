import type { Payload } from 'payload'
import { sendAlert } from '../services/email'

interface AlertParams {
  type: string
  severity: 'info' | 'warning' | 'urgent'
  message: string
  details?: Record<string, unknown>
}

export async function dispatchAlert(payload: Payload, params: AlertParams) {
  const subject = `[${params.severity.toUpperCase()}] ${params.type}`

  await sendAlert(subject, params.message)

  await payload.create({
    collection: 'pipeline-events',
    data: {
      from_status: 'system',
      to_status: `alert:${params.type}`,
      triggered_by: `alert:${params.severity}`,
      decision_data: {
        type: params.type,
        severity: params.severity,
        message: params.message,
        details: params.details ?? {},
        timestamp: new Date().toISOString(),
      },
      policy_check_result: 'pass',
    },
  })
}

export async function checkReplyRateDrop(payload: Payload): Promise<boolean> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const sentEmails = await payload.find({
    collection: 'interactions',
    where: {
      and: [
        { direction: { equals: 'outbound' } },
        { message_type: { equals: 'hook_email' } },
        { createdAt: { greater_than: sevenDaysAgo } },
      ],
    },
    limit: 0,
  })

  const replies = await payload.find({
    collection: 'interactions',
    where: {
      and: [
        { direction: { equals: 'inbound' } },
        { createdAt: { greater_than: sevenDaysAgo } },
      ],
    },
    limit: 0,
  })

  if (sentEmails.totalDocs < 10) return false

  const replyRate = replies.totalDocs / sentEmails.totalDocs
  if (replyRate < 0.02) {
    await dispatchAlert(payload, {
      type: 'reply_rate_drop',
      severity: 'warning',
      message: `7-day reply rate is ${(replyRate * 100).toFixed(1)}% (threshold: 2%). Sent: ${sentEmails.totalDocs}, Replies: ${replies.totalDocs}`,
      details: { reply_rate: replyRate, sent: sentEmails.totalDocs, replies: replies.totalDocs },
    })
    return true
  }

  return false
}

export async function checkSpamComplaintSpike(payload: Payload): Promise<boolean> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const sentEmails = await payload.find({
    collection: 'interactions',
    where: {
      and: [
        { direction: { equals: 'outbound' } },
        { createdAt: { greater_than: sevenDaysAgo } },
      ],
    },
    limit: 0,
  })

  if (sentEmails.totalDocs < 20) return false

  return false
}

export async function checkQueueBackup(payload: Payload): Promise<boolean> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  const stuckJobs = await payload.find({
    collection: 'jobs',
    where: {
      and: [
        { status: { equals: 'queued' } },
        { createdAt: { less_than: twoHoursAgo } },
      ],
    },
    limit: 0,
  })

  if (stuckJobs.totalDocs > 100) {
    await dispatchAlert(payload, {
      type: 'queue_backup',
      severity: 'warning',
      message: `${stuckJobs.totalDocs} jobs have been queued for over 2 hours`,
      details: { stuck_count: stuckJobs.totalDocs },
    })
    return true
  }

  return false
}

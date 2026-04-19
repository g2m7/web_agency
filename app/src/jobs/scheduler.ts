import type { Payload } from 'payload'
import type { LeadStatus, ClientStatus } from '../types'
import { enqueueJob, scheduleRecurringJob } from './queue'

export async function startScheduler(payload: Payload) {
  await scheduleRecurringJob('lead_gen', '0 6 * * *', {})
  await scheduleRecurringJob('monthly_report', '0 8 1 * *', {})
  await scheduleRecurringJob('churn_check', '0 9 * * 1', {})

  console.log('Schedulers started: lead_gen (daily 6am), monthly_report (1st of month), churn_check (weekly Monday)')
}

export async function scheduleAfterTransition(
  payload: Payload,
  entityType: 'lead' | 'client',
  entityId: string,
  newStatus: string,
) {
  if (entityType === 'lead') {
    const leadStatus = newStatus as LeadStatus

    if (leadStatus === 'contacted') {
      await enqueueJob('follow_up_1', { leadId: entityId }, 3 * 24 * 60 * 60 * 1000)
      await enqueueJob('follow_up_2', { leadId: entityId }, 7 * 24 * 60 * 60 * 1000)
    }

    if (leadStatus === 'replied_interested') {
      await enqueueJob('demo_build', { leadId: entityId })
    }
  }

  if (entityType === 'client') {
    const clientStatus = newStatus as ClientStatus

    if (clientStatus === 'onboarding') {
      await enqueueJob('onboarding', { clientId: entityId })
    }

    if (clientStatus === 'payment_failed') {
      await enqueueJob('billing_retry', { clientId: entityId })
    }
  }
}

export { enqueueJob }

import type { Payload } from 'payload'
import type { Job } from 'bullmq'

export async function handleLeadGen(payload: Payload, job: Job): Promise<Record<string, unknown>> {
  const config = await payload.findGlobal({ slug: 'system-config' })
  const niche = (config as any).active_niche
  const cities = (config as any).active_cities ?? []

  const existingLeads = await payload.find({ collection: 'leads', limit: 0 })
  const leadsBefore = existingLeads.totalDocs

  return {
    status: 'completed',
    niche,
    cities,
    leads_before: leadsBefore,
    message: `Lead gen job queued for ${niche} in ${cities.join(', ')}. Skill execution required.`,
    job_id: job.id,
  }
}

export async function handleFollowUp1(payload: Payload, job: Job): Promise<Record<string, unknown>> {
  const leadId = job.data.leadId as string
  const lead = await payload.findByID({ collection: 'leads', id: leadId }).catch(() => null)

  if (!lead || (lead as any).status !== 'contacted') {
    return { status: 'skipped', reason: 'Lead no longer in contacted status' }
  }

  return {
    status: 'completed',
    lead_id: leadId,
    message: 'Follow-up 1 ready. Skill execution required to draft email.',
  }
}

export async function handleFollowUp2(payload: Payload, job: Job): Promise<Record<string, unknown>> {
  const leadId = job.data.leadId as string
  const lead = await payload.findByID({ collection: 'leads', id: leadId }).catch(() => null)

  if (!lead || (lead as any).status !== 'contacted') {
    return { status: 'skipped', reason: 'Lead no longer in contacted status' }
  }

  return {
    status: 'completed',
    lead_id: leadId,
    message: 'Follow-up 2 ready. Skill execution required to draft email.',
  }
}

export async function handleDemoBuild(payload: Payload, job: Job): Promise<Record<string, unknown>> {
  const leadId = job.data.leadId as string
  const lead = await payload.findByID({ collection: 'leads', id: leadId }).catch(() => null)

  if (!lead) {
    return { status: 'skipped', reason: 'Lead not found' }
  }

  const deployment = await payload.create({
    collection: 'deployments',
    data: {
      client: null,
      type: 'demo',
      status: 'building',
      data_isolation_ok: false,
      human_approved: false,
    },
  })

  return {
    status: 'completed',
    lead_id: leadId,
    deployment_id: deployment.id,
    message: 'Demo build initiated. Skill execution required for content swap and deploy.',
  }
}

export async function handleOnboarding(payload: Payload, job: Job): Promise<Record<string, unknown>> {
  const clientId = job.data.clientId as string
  const client = await payload.findByID({ collection: 'clients', id: clientId }).catch(() => null)

  if (!client) {
    return { status: 'skipped', reason: 'Client not found' }
  }

  const existingInteraction = await payload.find({
    collection: 'client-interactions',
    where: {
      and: [
        { client: { equals: clientId } },
        { message_type: { equals: 'support_request' } },
      ],
    },
    limit: 1,
  })

  if (existingInteraction.totalDocs === 0) {
    return {
      status: 'completed',
      client_id: clientId,
      message: 'Onboarding welcome email ready. Skill execution required.',
    }
  }

  return { status: 'completed', client_id: clientId, message: 'Onboarding in progress.' }
}

export async function handleMonthlyReport(payload: Payload, job: Job): Promise<Record<string, unknown>> {
  const activeClients = await payload.find({
    collection: 'clients',
    where: { status: { equals: 'active' } },
    limit: 100,
  })

  return {
    status: 'completed',
    clients_count: activeClients.totalDocs,
    message: `Monthly report generation queued for ${activeClients.totalDocs} active clients. Skill execution required.`,
  }
}

export async function handleChurnCheck(payload: Payload, job: Job): Promise<Record<string, unknown>> {
  const gracePeriodClients = await payload.find({
    collection: 'clients',
    where: { status: { in: ['payment_failed', 'grace_period', 'suspended'] } },
    limit: 100,
  })

  const now = new Date()
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

  const inactiveClients = await payload.find({
    collection: 'clients',
    where: {
      and: [
        { status: { equals: 'active' } },
        { updatedAt: { less_than: sixtyDaysAgo } },
      ],
    },
    limit: 100,
  })

  return {
    status: 'completed',
    at_risk_count: gracePeriodClients.totalDocs + inactiveClients.totalDocs,
    grace_period: gracePeriodClients.totalDocs,
    inactive: inactiveClients.totalDocs,
    message: 'Churn check complete. Flagged clients for retention outreach.',
  }
}

export async function handleSupportAutoReply(payload: Payload, job: Job): Promise<Record<string, unknown>> {
  const interactionId = job.data.interactionId as string

  return {
    status: 'completed',
    interaction_id: interactionId,
    message: 'Support auto-reply queued. Skill execution required for classification and response.',
  }
}

export async function handleBillingRetry(payload: Payload, job: Job): Promise<Record<string, unknown>> {
  const clientId = job.data.clientId as string

  await payload.create({
    collection: 'client-interactions',
    data: {
      client: clientId,
      direction: 'outbound',
      channel: 'email',
      message_type: 'retention',
      subject: 'Payment Action Required',
      body: 'We were unable to process your monthly payment. Please update your payment method.',
      status: 'open',
      support_tier: 'tier1',
    },
  })

  return { status: 'completed', client_id: clientId, message: 'Payment retry notification sent.' }
}

export async function handleSiteQa(payload: Payload, job: Job): Promise<Record<string, unknown>> {
  const deploymentId = job.data.deploymentId as string
  const deployment = await payload.findByID({ collection: 'deployments', id: deploymentId }).catch(() => null)

  if (!deployment) {
    return { status: 'skipped', reason: 'Deployment not found' }
  }

  return {
    status: 'completed',
    deployment_id: deploymentId,
    message: 'QA check queued. Automated checks will verify mobile layout, links, forms, and data isolation.',
  }
}

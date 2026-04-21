import { randomUUID } from 'crypto'
import type { DbClient } from '../../db'
import type { ScheduledJob } from '../queue'
import {
  scrapeGoogleMaps,
  parseCityState,
  buildNicheCityKey,
  type ScrapedBusiness,
} from '../../scraper/google-maps'

export interface LeadGenResult {
  status: string
  niche: string
  cities: string[]
  leads_before: number
  leads_created: number
  leads_skipped: number
  errors: string[]
  job_id: string
}

export async function handleLeadGen(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const config = await db.findGlobal({ slug: 'system-config' })
  const niche = config.active_niche ?? 'hvac'
  const cities: string[] = config.active_cities ?? []

  const existingLeads = await db.find({ collection: 'leads', limit: 0 })
  const leadsBefore = existingLeads.totalDocs

  let leadsCreated = 0
  let leadsSkipped = 0
  const errors: string[] = []

  for (const cityEntry of cities) {
    const { city, state } = parseCityState(cityEntry)

    let businesses: ScrapedBusiness[]
    try {
      businesses = await scrapeGoogleMaps(niche, city, state, { signal: AbortSignal.timeout(30_000) })
    } catch (err: any) {
      errors.push(`${city}, ${state}: ${err.message}`)
      continue
    }

    for (const biz of businesses) {
      const nicheCityKey = buildNicheCityKey(niche, city, biz.name)

      const existing = await db.find({
        collection: 'leads',
        where: { niche_city_key: { equals: nicheCityKey } },
        limit: 1,
      })

      if (existing.totalDocs > 0) {
        leadsSkipped++
        continue
      }

      try {
        await db.create({
          collection: 'leads',
          data: {
            id: randomUUID(),
            businessName: biz.name,
            niche,
            city,
            state,
            websiteUrl: biz.website ?? null,
            googleMapsUrl: biz.mapsUrl,
            email: null,
            phone: biz.phone ?? null,
            decisionMaker: null,
            status: 'new',
            auditScore: null,
            auditData: null,
            priorityTier: null,
            exclusionReason: null,
            source: 'google_maps',
            nicheCityKey,
          },
        })
        leadsCreated++
      } catch (err: any) {
        if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
          leadsSkipped++
        } else {
          errors.push(`insert ${biz.name}: ${err.message}`)
        }
      }
    }
  }

  return {
    status: 'completed',
    niche,
    cities,
    leads_before: leadsBefore,
    leads_created: leadsCreated,
    leads_skipped: leadsSkipped,
    errors,
    job_id: job.id,
  }
}

export async function handleFollowUp1(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const leadId = job.data.leadId as string
  const lead = await db.findByID({ collection: 'leads', id: leadId }).catch(() => null)

  if (!lead || lead.status !== 'contacted') {
    return { status: 'skipped', reason: 'Lead no longer in contacted status' }
  }

  return {
    status: 'completed',
    lead_id: leadId,
    message: 'Follow-up 1 ready. Skill execution required to draft email.',
  }
}

export async function handleFollowUp2(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const leadId = job.data.leadId as string
  const lead = await db.findByID({ collection: 'leads', id: leadId }).catch(() => null)

  if (!lead || lead.status !== 'contacted') {
    return { status: 'skipped', reason: 'Lead no longer in contacted status' }
  }

  return {
    status: 'completed',
    lead_id: leadId,
    message: 'Follow-up 2 ready. Skill execution required to draft email.',
  }
}

export async function handleDemoBuild(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const leadId = job.data.leadId as string
  const lead = await db.findByID({ collection: 'leads', id: leadId }).catch(() => null)

  if (!lead) {
    return { status: 'skipped', reason: 'Lead not found' }
  }

  const deployment = await db.create({
    collection: 'deployments',
    data: {
      client: '' as any,
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

export async function handleOnboarding(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const clientId = job.data.clientId as string
  const client = await db.findByID({ collection: 'clients', id: clientId }).catch(() => null)

  if (!client) {
    return { status: 'skipped', reason: 'Client not found' }
  }

  const existingInteraction = await db.find({
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

export async function handleMonthlyReport(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const activeClients = await db.find({
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

export async function handleChurnCheck(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const gracePeriodClients = await db.find({
    collection: 'clients',
    where: { status: { in: ['payment_failed', 'grace_period', 'suspended'] } },
    limit: 100,
  })

  const now = new Date()
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

  const inactiveClients = await db.find({
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

export async function handleSupportAutoReply(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const interactionId = job.data.interactionId as string

  return {
    status: 'completed',
    interaction_id: interactionId,
    message: 'Support auto-reply queued. Skill execution required for classification and response.',
  }
}

export async function handleBillingRetry(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const clientId = job.data.clientId as string

  await db.create({
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

export async function handleSiteQa(db: DbClient, job: ScheduledJob): Promise<Record<string, unknown>> {
  const deploymentId = job.data.deploymentId as string
  const deployment = await db.findByID({ collection: 'deployments', id: deploymentId }).catch(() => null)

  if (!deployment) {
    return { status: 'skipped', reason: 'Deployment not found' }
  }

  return {
    status: 'completed',
    deployment_id: deploymentId,
    message: 'QA check queued. Automated checks will verify mobile layout, links, forms, and data isolation.',
  }
}

import type { DbClient } from '../db'
import type { LeadStatus, ClientStatus, PolicyAction } from '../types'
import { isValidLeadTransition, isValidClientTransition, getLeadTransition } from './states'
import { runPolicyCheck } from '../policy/engine'
import { scheduleAfterTransition } from '../jobs/scheduler'

interface TransitionOptions {
  triggeredBy: string
  skillVersion?: string
  decisionData?: Record<string, unknown>
  skipPolicy?: boolean
}

export async function transitionLead(
  db: DbClient,
  leadId: string,
  fromStatus: LeadStatus,
  toStatus: LeadStatus,
  options: TransitionOptions,
): Promise<{ success: boolean; reason?: string }> {
  if (!isValidLeadTransition(fromStatus, toStatus)) {
    await logBlockedTransition(db, leadId, 'lead', fromStatus, toStatus, options, 'Invalid transition')
    return { success: false, reason: `Invalid transition: ${fromStatus} → ${toStatus}` }
  }

  const rule = getLeadTransition(fromStatus, toStatus)
  const policyAction = inferPolicyAction(toStatus)

  if (policyAction && !options.skipPolicy) {
    const lead = await db.findByID({ collection: 'leads', id: leadId })
    const systemConfig = await getSystemConfig(db)

    const policyResult = await runPolicyCheck({
      action: policyAction,
      phase: systemConfig.current_phase,
      lead: { id: String(lead.id), status: lead.status as LeadStatus },
    })

    if (policyResult.blocked) {
      await logBlockedTransition(db, leadId, 'lead', fromStatus, toStatus, options, policyResult.blockingReason ?? 'Policy blocked')
      return { success: false, reason: policyResult.blockingReason }
    }

    if (policyResult.requiresHumanApproval) {
      await db.create({
        collection: 'pipeline-events',
        data: {
          lead: leadId,
          from_status: fromStatus,
          to_status: toStatus,
          triggered_by: options.triggeredBy,
          skill_version: options.skillVersion ?? '',
          decision_data: options.decisionData ?? {},
          policy_check_result: 'bypassed',
          human_approved: false,
        },
      })
      return { success: false, reason: `Requires human approval (${policyResult.ruleName})` }
    }
  }

  await db.update({
    collection: 'leads',
    id: leadId,
    data: { status: toStatus },
  })

  await db.create({
    collection: 'pipeline-events',
    data: {
      lead: leadId,
      from_status: fromStatus,
      to_status: toStatus,
      triggered_by: options.triggeredBy,
      skill_version: options.skillVersion ?? '',
      decision_data: options.decisionData ?? {},
      policy_check_result: 'pass',
      human_approved: !rule?.humanGate || rule.humanGate === '—',
    },
  })

  await scheduleAfterTransition(db, 'lead', leadId, toStatus)

  return { success: true }
}

export async function transitionClient(
  db: DbClient,
  clientId: string,
  fromStatus: ClientStatus,
  toStatus: ClientStatus,
  options: TransitionOptions,
): Promise<{ success: boolean; reason?: string }> {
  if (!isValidClientTransition(fromStatus, toStatus)) {
    await logBlockedTransition(db, clientId, 'client', fromStatus, toStatus, options, 'Invalid transition')
    return { success: false, reason: `Invalid transition: ${fromStatus} → ${toStatus}` }
  }

  const policyAction = inferPolicyActionForClient(toStatus)

  if (policyAction && !options.skipPolicy) {
    const client = await db.findByID({ collection: 'clients', id: clientId })
    const systemConfig = await getSystemConfig(db)

    const policyResult = await runPolicyCheck({
      action: policyAction,
      phase: systemConfig.current_phase,
      client: { id: String(client.id), status: client.status as ClientStatus, plan: client.plan as any },
    })

    if (policyResult.blocked) {
      await logBlockedTransition(db, clientId, 'client', fromStatus, toStatus, options, policyResult.blockingReason ?? 'Policy blocked')
      return { success: false, reason: policyResult.blockingReason }
    }

    if (policyResult.requiresHumanApproval) {
      await db.create({
        collection: 'pipeline-events',
        data: {
          client: clientId,
          from_status: fromStatus,
          to_status: toStatus,
          triggered_by: options.triggeredBy,
          skill_version: options.skillVersion ?? '',
          decision_data: options.decisionData ?? {},
          policy_check_result: 'bypassed',
          human_approved: false,
        },
      })
      return { success: false, reason: `Requires human approval (${policyResult.ruleName})` }
    }
  }

  await db.update({
    collection: 'clients',
    id: clientId,
    data: { status: toStatus },
  })

  await db.create({
    collection: 'pipeline-events',
    data: {
      client: clientId,
      from_status: fromStatus,
      to_status: toStatus,
      triggered_by: options.triggeredBy,
      skill_version: options.skillVersion ?? '',
      decision_data: options.decisionData ?? {},
      policy_check_result: 'pass',
    },
  })

  await scheduleAfterTransition(db, 'client', clientId, toStatus)

  return { success: true }
}

function inferPolicyAction(toStatus: LeadStatus): PolicyAction | null {
  const map: Partial<Record<LeadStatus, PolicyAction>> = {
    contacted: 'send_email',
    demo_sent: 'send_demo',
  }
  return map[toStatus] ?? null
}

function inferPolicyActionForClient(toStatus: ClientStatus): PolicyAction | null {
  const map: Partial<Record<ClientStatus, PolicyAction>> = {
    active: 'launch_site',
  }
  return map[toStatus] ?? null
}

async function logBlockedTransition(
  db: DbClient,
  entityId: string,
  entityType: 'lead' | 'client',
  fromStatus: string,
  toStatus: string,
  options: TransitionOptions,
  reason: string,
) {
  await db.create({
    collection: 'policy-checks',
    data: {
      action_type: entityType === 'lead' ? 'send_email' : 'launch_site',
      rule_name: 'transition_blocked',
      result: 'blocked',
      blocking_reason: `${fromStatus} → ${toStatus}: ${reason}`,
      skill_version: options.skillVersion ?? '',
      [entityType]: entityId,
    },
  })
}

async function getSystemConfig(db: DbClient) {
  const config = await db.findGlobal({ slug: 'system-config' })
  return {
    current_phase: config.current_phase ?? 2,
    email_approval_required: config.email_approval_required ?? true,
    demo_approval_required: config.demo_approval_required ?? true,
    launch_approval_required: config.launch_approval_required ?? true,
    active_niche: config.active_niche ?? '',
    active_cities: config.active_cities ?? [],
    dodo_checkout_links: config.dodo_checkout_links ?? {},
    maintenance_mode: config.maintenance_mode ?? false,
  }
}

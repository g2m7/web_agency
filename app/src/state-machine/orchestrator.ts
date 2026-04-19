import type { Payload } from 'payload'
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
  payload: Payload,
  leadId: string,
  fromStatus: LeadStatus,
  toStatus: LeadStatus,
  options: TransitionOptions,
): Promise<{ success: boolean; reason?: string }> {
  if (!isValidLeadTransition(fromStatus, toStatus)) {
    await logBlockedTransition(payload, leadId, 'lead', fromStatus, toStatus, options, 'Invalid transition')
    return { success: false, reason: `Invalid transition: ${fromStatus} → ${toStatus}` }
  }

  const rule = getLeadTransition(fromStatus, toStatus)
  const policyAction = inferPolicyAction(toStatus)

  if (policyAction && !options.skipPolicy) {
    const lead = await payload.findByID({ collection: 'leads', id: leadId })
    const systemConfig = await getSystemConfig(payload)

    const policyResult = await runPolicyCheck({
      action: policyAction,
      phase: systemConfig.current_phase,
      lead: { id: String(lead.id), status: lead.status as LeadStatus },
    })

    if (policyResult.blocked) {
      await logBlockedTransition(payload, leadId, 'lead', fromStatus, toStatus, options, policyResult.blockingReason ?? 'Policy blocked')
      return { success: false, reason: policyResult.blockingReason }
    }

    if (policyResult.requiresHumanApproval) {
      await payload.create({
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

  await payload.update({
    collection: 'leads',
    id: leadId,
    data: { status: toStatus },
  })

  await payload.create({
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

  await scheduleAfterTransition(payload, 'lead', leadId, toStatus)

  return { success: true }
}

export async function transitionClient(
  payload: Payload,
  clientId: string,
  fromStatus: ClientStatus,
  toStatus: ClientStatus,
  options: TransitionOptions,
): Promise<{ success: boolean; reason?: string }> {
  if (!isValidClientTransition(fromStatus, toStatus)) {
    await logBlockedTransition(payload, clientId, 'client', fromStatus, toStatus, options, 'Invalid transition')
    return { success: false, reason: `Invalid transition: ${fromStatus} → ${toStatus}` }
  }

  const policyAction = inferPolicyActionForClient(toStatus)

  if (policyAction && !options.skipPolicy) {
    const client = await payload.findByID({ collection: 'clients', id: clientId })
    const systemConfig = await getSystemConfig(payload)

    const policyResult = await runPolicyCheck({
      action: policyAction,
      phase: systemConfig.current_phase,
      client: { id: String(client.id), status: client.status as ClientStatus, plan: client.plan as any },
    })

    if (policyResult.blocked) {
      await logBlockedTransition(payload, clientId, 'client', fromStatus, toStatus, options, policyResult.blockingReason ?? 'Policy blocked')
      return { success: false, reason: policyResult.blockingReason }
    }

    if (policyResult.requiresHumanApproval) {
      await payload.create({
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

  await payload.update({
    collection: 'clients',
    id: clientId,
    data: { status: toStatus },
  })

  await payload.create({
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

  await scheduleAfterTransition(payload, 'client', clientId, toStatus)

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
  payload: Payload,
  entityId: string,
  entityType: 'lead' | 'client',
  fromStatus: string,
  toStatus: string,
  options: TransitionOptions,
  reason: string,
) {
  await payload.create({
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

async function getSystemConfig(payload: Payload) {
  const config = await payload.findGlobal({ slug: 'system-config' })
  return {
    current_phase: (config as any).current_phase ?? 2,
    email_approval_required: (config as any).email_approval_required ?? true,
    demo_approval_required: (config as any).demo_approval_required ?? true,
    launch_approval_required: (config as any).launch_approval_required ?? true,
    active_niche: (config as any).active_niche ?? '',
    active_cities: (config as any).active_cities ?? [],
    dodo_checkout_links: (config as any).dodo_checkout_links ?? {},
    maintenance_mode: (config as any).maintenance_mode ?? false,
  }
}

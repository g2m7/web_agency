import type { CollectionBeforeChangeHook } from 'payload'
import { runPolicyCheck } from '../policy/engine'

export const policyCheckBeforeSend: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create' || data.direction !== 'outbound' || data.status === 'draft') {
    return data
  }

  const systemConfig = await req.payload.findGlobal({ slug: 'system-config' })
  const ctx = {
    action: inferActionFromMessageType(data.message_type) as any,
    phase: (systemConfig as any).current_phase ?? 2,
    interaction: {
      id: data.id ?? '',
      message_type: data.message_type,
      body: data.body ?? '',
      subject: data.subject ?? '',
      direction: data.direction,
    },
  }

  const result = await runPolicyCheck(ctx)

  await req.payload.create({
    collection: 'policy-checks',
    data: {
      action_type: ctx.action,
      rule_name: result.ruleName,
      result: result.blocked ? 'blocked' : result.requiresHumanApproval ? 'requires_human_approval' : 'pass',
      blocking_reason: 'blockingReason' in result ? (result as any).blockingReason : null,
      interaction: data.id ?? null,
    },
  })

  if (result.blocked) {
    throw new Error(`Policy blocked: ${(result as any).blockingReason}`)
  }

  if (result.requiresHumanApproval && data.status !== 'pending_approval') {
    data.status = 'pending_approval'
  }

  return data
}

function inferActionFromMessageType(messageType: string): string {
  switch (messageType) {
    case 'hook_email':
    case 'follow_up_1':
    case 'follow_up_2':
      return 'send_email'
    case 'demo_email':
      return 'send_demo'
    default:
      return 'send_email'
  }
}

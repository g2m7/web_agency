import type { Payload } from 'payload'

interface AuditParams {
  action: string
  entityType: 'lead' | 'client' | 'interaction' | 'deployment' | 'job' | 'system'
  entityId: string
  triggeredBy: string
  skillVersion?: string
  decisionData?: Record<string, unknown>
  policyResult?: string
  details?: string
}

export async function createAuditEntry(payload: Payload, params: AuditParams) {
  await payload.create({
    collection: 'pipeline-events',
    data: {
      lead: params.entityType === 'lead' ? params.entityId : undefined,
      client: params.entityType === 'client' ? params.entityId : undefined,
      from_status: params.details ?? '',
      to_status: params.action,
      triggered_by: params.triggeredBy,
      skill_version: params.skillVersion ?? '',
      decision_data: params.decisionData ?? {},
      policy_check_result: params.policyResult ?? 'pass',
    },
  })
}

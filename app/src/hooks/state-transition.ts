import type { CollectionAfterChangeHook } from 'payload'

export const logLeadTransition: CollectionAfterChangeHook = async ({ doc, operation, previousDoc, req }) => {
  if (operation !== 'update' || !previousDoc) return

  const oldStatus = (previousDoc as any).status
  const newStatus = (doc as any).status

  if (oldStatus === newStatus) return

  await req.payload.create({
    collection: 'pipeline-events',
    data: {
      lead: doc.id,
      from_status: oldStatus,
      to_status: newStatus,
      triggered_by: 'hook:logLeadTransition',
      skill_version: '',
      decision_data: {},
      policy_check_result: 'pass',
      human_approved: true,
    },
  })
}

export const logClientTransition: CollectionAfterChangeHook = async ({ doc, operation, previousDoc, req }) => {
  if (operation !== 'update' || !previousDoc) return

  const oldStatus = (previousDoc as any).status
  const newStatus = (doc as any).status

  if (oldStatus === newStatus) return

  await req.payload.create({
    collection: 'pipeline-events',
    data: {
      client: doc.id,
      from_status: oldStatus,
      to_status: newStatus,
      triggered_by: 'hook:logClientTransition',
      skill_version: '',
      decision_data: {},
      policy_check_result: 'pass',
    },
  })
}

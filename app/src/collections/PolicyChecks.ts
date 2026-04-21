import type { CollectionConfig } from 'payload'
import crypto from 'crypto'

export const PolicyChecks: CollectionConfig = {
  slug: 'policy-checks',
  admin: { group: 'System', defaultColumns: ['action_type', 'rule_name', 'result', 'createdAt'] },
  fields: [
    { name: 'id', type: 'text', required: true, defaultValue: () => crypto.randomUUID() },
    { name: 'action_type', type: 'select', required: true, options: ['send_email', 'send_demo', 'launch_site', 'respond_to_client', 'apply_discount'] },
    { name: 'lead', type: 'relationship', relationTo: 'leads' },
    { name: 'client', type: 'relationship', relationTo: 'clients' },
    { name: 'interaction', type: 'relationship', relationTo: 'interactions' },
    { name: 'rule_name', type: 'text', required: true },
    { name: 'result', type: 'select', required: true, options: ['pass', 'blocked', 'requires_human_approval'] },
    { name: 'blocking_reason', type: 'text' },
    { name: 'override_by', type: 'text' },
    { name: 'skill_version', type: 'text' },
  ],
}

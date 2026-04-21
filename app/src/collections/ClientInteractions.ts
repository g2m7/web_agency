import type { CollectionConfig } from 'payload'
import crypto from 'crypto'

export const ClientInteractions: CollectionConfig = {
  slug: 'client-interactions',
  admin: { group: 'Operations' },
  fields: [
    { name: 'id', type: 'text', required: true, defaultValue: () => crypto.randomUUID() },
    { name: 'client', type: 'relationship', relationTo: 'clients', required: true },
    { name: 'direction', type: 'select', options: ['inbound', 'outbound'] },
    { name: 'channel', type: 'text' },
    { name: 'message_type', type: 'select', options: ['support_request', 'edit_request', 'monthly_report', 'retention', 'proactive_fix', 'escalation', 'other'] },
    { name: 'subject', type: 'text' },
    { name: 'body', type: 'textarea' },
    { name: 'status', type: 'select', options: ['open', 'in_progress', 'resolved', 'escalated', 'closed'] },
    { name: 'support_tier', type: 'select', options: ['tier1', 'tier2', 'tier3'] },
    { name: 'skill_version', type: 'text' },
    { name: 'human_approved', type: 'checkbox' },
    { name: 'resolved_at', type: 'date' },
  ],
}

import type { CollectionConfig } from 'payload'
import crypto from 'crypto'

export const Interactions: CollectionConfig = {
  slug: 'interactions',
  admin: { useAsTitle: 'subject', group: 'Pipeline' },
  fields: [
    { name: 'id', type: 'text', required: true, defaultValue: () => crypto.randomUUID() },
    { name: 'lead', type: 'relationship', relationTo: 'leads', required: true },
    { name: 'direction', type: 'select', required: true, options: ['inbound', 'outbound'] },
    { name: 'channel', type: 'select', required: true, options: ['email', 'support_ticket', 'whatsapp'] },
    { name: 'message_type', type: 'select', required: true, options: ['hook_email', 'follow_up_1', 'follow_up_2', 'demo_email', 'welcome', 'support_reply', 'monthly_report', 'retention', 'other'] },
    { name: 'subject', type: 'text' },
    { name: 'body', type: 'textarea' },
    { name: 'status', type: 'select', required: true, options: ['draft', 'pending_approval', 'approved', 'sent', 'delivered', 'bounced', 'failed'] },
    { name: 'reply_classification', type: 'select', options: ['interested', 'not_interested', 'objection', 'question', 'no_response', 'angry', 'legal_threat'] },
    { name: 'objection_type', type: 'text' },
    { name: 'resend_message_id', type: 'text' },
    { name: 'sent_at', type: 'date' },
  ],
}

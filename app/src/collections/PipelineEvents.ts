import type { CollectionConfig } from 'payload'
import crypto from 'crypto'

export const PipelineEvents: CollectionConfig = {
  slug: 'pipeline-events',
  admin: {
    useAsTitle: 'id',
    group: 'Pipeline',
    defaultColumns: ['lead', 'from_status', 'to_status', 'triggered_by', 'createdAt'],
  },
  fields: [
    {
      name: 'id',
      type: 'text',
      required: true,
      defaultValue: () => crypto.randomUUID(),
    },
    {
      name: 'lead',
      type: 'relationship',
      relationTo: 'leads',
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
    },
    {
      name: 'from_status',
      type: 'text',
    },
    {
      name: 'to_status',
      type: 'text',
    },
    {
      name: 'triggered_by',
      type: 'text',
    },
    {
      name: 'skill_version',
      type: 'text',
    },
    {
      name: 'decision_data',
      type: 'json',
    },
    {
      name: 'policy_check_result',
      type: 'select',
      options: ['pass', 'blocked', 'bypassed'],
    },
    {
      name: 'human_approved',
      type: 'checkbox',
    },
    {
      name: 'human_approved_by',
      type: 'text',
    },
    {
      name: 'human_approved_at',
      type: 'date',
    },
  ],
}

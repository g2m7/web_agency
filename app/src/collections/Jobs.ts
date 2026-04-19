import type { CollectionConfig } from 'payload'
import crypto from 'crypto'

export const Jobs: CollectionConfig = {
  slug: 'jobs',
  admin: {
    group: 'System',
    defaultColumns: ['job_type', 'status', 'run_at', 'attempts', 'createdAt'],
  },
  fields: [
    {
      name: 'id',
      type: 'text',
      required: true,
      defaultValue: () => crypto.randomUUID(),
    },
    {
      name: 'job_type',
      type: 'select',
      required: true,
      options: [
        'lead_gen',
        'follow_up_1',
        'follow_up_2',
        'demo_build',
        'onboarding',
        'monthly_report',
        'churn_check',
        'support_auto_reply',
        'billing_retry',
        'site_qa',
      ],
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
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'queued',
      options: ['queued', 'running', 'completed', 'failed', 'dead'],
    },
    {
      name: 'attempts',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'max_attempts',
      type: 'number',
      defaultValue: 3,
    },
    {
      name: 'run_at',
      type: 'date',
    },
    {
      name: 'started_at',
      type: 'date',
    },
    {
      name: 'completed_at',
      type: 'date',
    },
    {
      name: 'failed_at',
      type: 'date',
    },
    {
      name: 'error_message',
      type: 'textarea',
    },
    {
      name: 'skill_version',
      type: 'text',
    },
    {
      name: 'input_data',
      type: 'json',
    },
    {
      name: 'output_data',
      type: 'json',
    },
  ],
}

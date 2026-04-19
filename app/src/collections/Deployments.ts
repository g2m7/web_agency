import type { CollectionConfig } from 'payload'
import crypto from 'crypto'

export const Deployments: CollectionConfig = {
  slug: 'deployments',
  admin: {
    group: 'Operations',
    defaultColumns: ['client', 'type', 'status', 'data_isolation_ok', 'createdAt'],
  },
  fields: [
    {
      name: 'id',
      type: 'text',
      required: true,
      defaultValue: () => crypto.randomUUID(),
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: ['demo', 'initial_launch', 'edit', 'refresh', 'redeploy'],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: ['building', 'ready', 'deployed', 'failed'],
    },
    {
      name: 'template_version',
      type: 'text',
    },
    {
      name: 'content_snapshot',
      type: 'json',
    },
    {
      name: 'preview_url',
      type: 'text',
    },
    {
      name: 'qa_results',
      type: 'json',
    },
    {
      name: 'data_isolation_ok',
      type: 'checkbox',
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
      name: 'deployed_at',
      type: 'date',
    },
  ],
}

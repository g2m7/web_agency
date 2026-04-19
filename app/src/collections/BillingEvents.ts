import type { CollectionConfig } from 'payload'
import crypto from 'crypto'

export const BillingEvents: CollectionConfig = {
  slug: 'billing-events',
  admin: {
    group: 'Billing',
    defaultColumns: ['client', 'event_type', 'amount_cents', 'createdAt'],
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
      name: 'event_type',
      type: 'select',
      required: true,
      options: [
        'checkout_complete',
        'renewal_success',
        'renewal_failed',
        'subscription_cancelled',
        'subscription_resumed',
        'grace_period_entered',
        'suspended',
      ],
    },
    {
      name: 'idempotency_key',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'amount_cents',
      type: 'number',
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'usd',
    },
    {
      name: 'plan_at_event',
      type: 'text',
    },
    {
      name: 'provider_data',
      type: 'json',
    },
  ],
}

import type { CollectionConfig } from 'payload'
import crypto from 'crypto'

export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    useAsTitle: 'business_name',
    defaultColumns: ['business_name', 'niche', 'city', 'status', 'priority_tier', 'audit_score'],
    group: 'Pipeline',
  },
  fields: [
    {
      name: 'id',
      type: 'text',
      required: true,
      defaultValue: () => crypto.randomUUID(),
    },
    {
      name: 'business_name',
      type: 'text',
      required: true,
    },
    {
      name: 'niche',
      type: 'text',
      required: true,
    },
    {
      name: 'city',
      type: 'text',
      required: true,
    },
    {
      name: 'state',
      type: 'text',
      required: true,
    },
    {
      name: 'website_url',
      type: 'text',
    },
    {
      name: 'google_maps_url',
      type: 'text',
    },
    {
      name: 'email',
      type: 'text',
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'decision_maker',
      type: 'text',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: [
        'new',
        'scored',
        'contacted',
        'replied_interested',
        'replied_objection',
        'demo_sent',
        'paid',
        'lost',
        'archived',
      ],
    },
    {
      name: 'audit_score',
      type: 'number',
      min: 0,
      max: 10,
    },
    {
      name: 'audit_data',
      type: 'json',
    },
    {
      name: 'priority_tier',
      type: 'select',
      options: ['hot', 'warm', 'low'],
    },
    {
      name: 'exclusion_reason',
      type: 'text',
    },
    {
      name: 'source',
      type: 'text',
      defaultValue: 'google_maps',
    },
    {
      name: 'niche_city_key',
      type: 'text',
      required: true,
      unique: true,
    },
  ],
}

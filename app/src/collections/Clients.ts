import type { CollectionConfig } from 'payload'
import crypto from 'crypto'

export const Clients: CollectionConfig = {
  slug: 'clients',
  admin: { useAsTitle: 'business_name', group: 'Operations', defaultColumns: ['business_name', 'plan', 'status', 'niche', 'edits_remaining'] },
  fields: [
    { name: 'id', type: 'text', required: true, defaultValue: () => crypto.randomUUID() },
    { name: 'lead', type: 'relationship', relationTo: 'leads' },
    { name: 'business_name', type: 'text', required: true },
    { name: 'contact_person', type: 'text' },
    { name: 'email', type: 'text', required: true },
    { name: 'phone', type: 'text' },
    { name: 'plan', type: 'select', required: true, options: ['starter', 'growth', 'pro'] },
    { name: 'plan_price_cents', type: 'number' },
    { name: 'status', type: 'select', required: true, defaultValue: 'pending_payment', options: ['pending_payment', 'onboarding', 'active', 'payment_failed', 'grace_period', 'suspended', 'cancelled'] },
    { name: 'niche', type: 'text', required: true },
    { name: 'niche_template', type: 'text' },
    { name: 'domain', type: 'text' },
    { name: 'staging_url', type: 'text' },
    { name: 'live_url', type: 'text' },
    { name: 'checkout_link', type: 'text' },
    { name: 'subscription_id', type: 'text' },
    { name: 'onboarding_data', type: 'json' },
    { name: 'support_tier', type: 'select', defaultValue: 'tier1', options: ['tier1', 'tier2', 'tier3'] },
    { name: 'edits_remaining', type: 'number', defaultValue: 0 },
    { name: 'edits_reset_at', type: 'date' },
    { name: 'launched_at', type: 'date' },
    { name: 'cancelled_at', type: 'date' },
    { name: 'cancellation_reason', type: 'text' },
  ],
}

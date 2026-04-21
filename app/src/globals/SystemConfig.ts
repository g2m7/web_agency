import type { GlobalConfig } from 'payload'

export const SystemConfig: GlobalConfig = {
  slug: 'system-config',
  admin: { group: 'System' },
  fields: [
    { name: 'current_phase', type: 'number', required: true, defaultValue: 2, admin: { description: 'Maps to doc 14 implementation phases (1-7)' } },
    { name: 'email_approval_required', type: 'checkbox', required: true, defaultValue: true },
    { name: 'demo_approval_required', type: 'checkbox', required: true, defaultValue: true },
    { name: 'launch_approval_required', type: 'checkbox', required: true, defaultValue: true, admin: { description: 'Never set to false — launch gate is permanent' } },
    { name: 'active_niche', type: 'text', required: true, defaultValue: 'hvac' },
    { name: 'active_cities', type: 'json', required: true, defaultValue: JSON.stringify(['Austin, TX']) },
    { name: 'dodo_checkout_links', type: 'json', defaultValue: JSON.stringify({ starter: '', growth: '', pro: '' }) },
    { name: 'maintenance_mode', type: 'checkbox', defaultValue: false },
  ],
}

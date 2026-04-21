import type { CollectionConfig } from 'payload'
import crypto from 'crypto'

export const SkillVersions: CollectionConfig = {
  slug: 'skill-versions',
  admin: { useAsTitle: 'skill_name', group: 'System' },
  fields: [
    { name: 'id', type: 'text', required: true, defaultValue: () => crypto.randomUUID() },
    { name: 'skill_name', type: 'text', required: true },
    { name: 'version', type: 'text', required: true },
    { name: 'content_hash', type: 'text', required: true },
    { name: 'deployed_by', type: 'text' },
    { name: 'notes', type: 'textarea' },
    { name: 'is_active', type: 'checkbox', defaultValue: true },
  ],
}

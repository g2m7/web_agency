import type { CollectionConfig } from 'payload'
import crypto from 'crypto'

export const Operators: CollectionConfig = {
  slug: 'operators',
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  fields: [
    {
      name: 'id',
      type: 'text',
      required: true,
      defaultValue: () => crypto.randomUUID(),
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'operator',
      options: ['operator', 'admin'],
    },
  ],
}

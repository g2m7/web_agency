import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import { Leads } from './collections/Leads'
import { Clients } from './collections/Clients'
import { Interactions } from './collections/Interactions'
import { ClientInteractions } from './collections/ClientInteractions'
import { Deployments } from './collections/Deployments'
import { BillingEvents } from './collections/BillingEvents'
import { Jobs } from './collections/Jobs'
import { PolicyChecks } from './collections/PolicyChecks'
import { PipelineEvents } from './collections/PipelineEvents'
import { SkillVersions } from './collections/SkillVersions'
import { Operators } from './collections/Operators'
import { SystemConfig } from './globals/SystemConfig'
import { webhookEndpoints } from './endpoints/webhooks'

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || 'dev-secret-change-in-production',
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
    migrationDir: './migrations',
  }),
  editor: lexicalEditor({}),
  collections: [
    Operators,
    Leads,
    Clients,
    Interactions,
    ClientInteractions,
    Deployments,
    BillingEvents,
    Jobs,
    PolicyChecks,
    PipelineEvents,
    SkillVersions,
  ],
  globals: [SystemConfig],
  endpoints: webhookEndpoints,
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts')
  },
  cors: [process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3006'].filter(Boolean),
  admin: {
    user: 'operators',
    meta: {
      titleSuffix: ' — Web Agency Platform',
    },
  },
  onInit: async (payload) => {
    payload.logger.info('Payload initialized — starting BullMQ workers')
    const { startWorkers } = await import('./jobs/workers')
    await startWorkers(payload)
    const { startScheduler } = await import('./jobs/scheduler')
    await startScheduler(payload)
  },
})

import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
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

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || 'dev-secret-change-in-production',
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
  }),
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
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  cors: [process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3006'].filter(Boolean),
  admin: {
    user: 'operators',
    meta: {
      titleSuffix: ' — Web Agency Platform',
    },
  },
  onInit: async (payload) => {
    payload.logger.info('Payload initialized — starting job workers')
    const { createDbClientFromPayload } = await import('./db/index')
    const db = createDbClientFromPayload(payload)
    const { startWorkers } = await import('./jobs/workers')
    await startWorkers(db)
    const { startRecurringJobs } = await import('./jobs/scheduler')
    await startRecurringJobs(db)
  },
})

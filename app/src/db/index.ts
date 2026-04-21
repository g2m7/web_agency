import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { eq, and, inArray, ilike, gt, lt, count, desc, asc, sql } from 'drizzle-orm'

// ── DbClient interface ──────────────────────────────────────
// Stable interface. Handlers and tests only depend on this.
// Implementation can be swapped (Prisma → Drizzle → Payload) without touching tests.

export interface FindResult {
  totalDocs: number
  docs: any[]
}

export interface DbClient {
  find(params: { collection: string; where?: any; limit?: number; sort?: string }): Promise<FindResult>
  findByID(params: { collection: string; id: string }): Promise<any>
  create(params: { collection: string; data: Record<string, unknown> }): Promise<any>
  update(params: { collection: string; id: string; data: Record<string, unknown> }): Promise<any>
  delete(params: { collection: string; id: string }): Promise<any>
  findGlobal(params: { slug: string }): Promise<any>
  updateGlobal(params: { slug: string; data: Record<string, unknown> }): Promise<any>
}

// ── Collection slug → Drizzle table mapping ─────────────────

const tables: Record<string, any> = {
  leads: schema.leads,
  clients: schema.clients,
  interactions: schema.interactions,
  'client-interactions': schema.clientInteractions,
  deployments: schema.deployments,
  'billing-events': schema.billingEvents,
  jobs: schema.jobs,
  'policy-checks': schema.policyChecks,
  'pipeline-events': schema.pipelineEvents,
  'skill-versions': schema.skillVersions,
  operators: schema.operators,
}

function getTable(collection: string) {
  const table = tables[collection]
  if (!table) throw new Error(`Unknown collection: ${collection}`)
  return table
}

// ── Payload where → Drizzle where translator ────────────────

function buildWhere(table: any, where: any): any {
  if (!where) return undefined

  const conditions: any[] = []

  for (const [key, value] of Object.entries(where)) {
    if (key === 'and') {
      const subConditions = (value as any[]).map((w: any) => buildWhere(table, w))
      conditions.push(and(...subConditions.filter(Boolean)))
      continue
    }

    const col = table[key]
    if (!col) continue

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [op, opVal] of Object.entries(value as Record<string, unknown>)) {
        switch (op) {
          case 'equals':
            conditions.push(eq(col, opVal as any))
            break
          case 'in':
            conditions.push(inArray(col, opVal as any[]))
            break
          case 'contains':
            conditions.push(ilike(col, `%${opVal}%`))
            break
          case 'greater_than':
            conditions.push(gt(col, opVal as any))
            break
          case 'less_than':
            conditions.push(lt(col, opVal as any))
            break
        }
      }
    } else {
      conditions.push(eq(col, value as any))
    }
  }

  if (conditions.length === 0) return undefined
  if (conditions.length === 1) return conditions[0]
  return and(...conditions)
}

// ── Payload sort → Drizzle orderBy ──────────────────────────

function buildOrderBy(table: any, sort?: string): any {
  if (!sort) return undefined
  const descSort = sort.startsWith('-')
  const field = descSort ? sort.slice(1) : sort
  const col = table[field]
  if (!col) return undefined
  return descSort ? desc(col) : asc(col)
}

// ── Drizzle-backed DbClient implementation ───────────────────

export function createDbClient(db: ReturnType<typeof drizzle>): DbClient {
  return {
    async find({ collection, where, limit, sort }) {
      const table = getTable(collection)
      const conditions = buildWhere(table, where)
      const orderBy = buildOrderBy(table, sort)

      if (limit === 0) {
        // Count-only query
        const [row] = await db
          .select({ count: count() })
          .from(table)
          .where(conditions)
        return { totalDocs: row?.count ?? 0, docs: [] }
      }

      const docs = await db
        .select()
        .from(table)
        .where(conditions)
        .limit(limit ?? 100)
        .orderBy(orderBy ?? desc(table.createdAt))

      const [countRow] = await db
        .select({ count: count() })
        .from(table)
        .where(conditions)

      return { totalDocs: countRow?.count ?? 0, docs: docs.map(mapDocOut) }
    },

    async findByID({ collection, id }) {
      const table = getTable(collection)
      const [doc] = await db.select().from(table).where(eq(table.id, id)).limit(1)
      if (!doc) throw new Error(`${collection} with id ${id} not found`)
      return mapDocOut(doc)
    },

    async create({ collection, data }) {
      const table = getTable(collection)
      const mapped = mapDataIn(data)
      const [doc] = await db.insert(table).values(mapped as any).returning()
      return mapDocOut(doc)
    },

    async update({ collection, id, data }) {
      const table = getTable(collection)
      const mapped = mapDataIn(data)
      const [doc] = await db.update(table).set(mapped as any).where(eq(table.id, id)).returning()
      if (!doc) throw new Error(`${collection} with id ${id} not found`)
      return mapDocOut(doc)
    },

    async delete({ collection, id }) {
      const table = getTable(collection)
      const [doc] = await db.delete(table).where(eq(table.id, id)).returning()
      return mapDocOut(doc)
    },

    async findGlobal({ slug }) {
      if (slug !== 'system-config') throw new Error(`Unknown global: ${slug}`)
      const [row] = await db.select().from(schema.systemConfig).where(eq(schema.systemConfig.id, 1))
      if (!row) {
        // Auto-create default config
        const [created] = await db.insert(schema.systemConfig).values({ id: 1 }).returning()
        return mapDocOut(created)
      }
      return mapDocOut(row)
    },

    async updateGlobal({ slug, data }) {
      if (slug !== 'system-config') throw new Error(`Unknown global: ${slug}`)
      const mapped = mapGlobalDataIn(data)
      const [row] = await db
        .insert(schema.systemConfig)
        .values({ id: 1, ...mapped } as any)
        .onConflictDoUpdate({ target: schema.systemConfig.id, set: mapped as any })
        .returning()
      return mapDocOut(row)
    },
  }
}

// ── Data mappers ─────────────────────────────────────────────

// Payload-style field names → Drizzle column names
const FIELD_MAP: Record<string, string> = {
  lead: 'leadId',
  client: 'clientId',
  interaction: 'interactionId',
}

function mapDataIn(data: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    const colName = FIELD_MAP[k] ?? k
    mapped[colName] = v
  }
  return mapped
}

function mapGlobalDataIn(data: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    // camelCase Payload field names → snake_case DB column names handled by Drizzle mapping
    mapped[k] = v
  }
  return mapped
}

function mapDocOut(doc: any): any {
  if (!doc) return doc
  const result: any = { ...doc }
  // Expose relationship fields in Payload-compatible format
  if ('leadId' in result) result.lead = result.leadId
  if ('clientId' in result) result.client = result.clientId
  if ('interactionId' in result) result.interaction = result.interactionId
  return result
}

// ── Singleton ────────────────────────────────────────────────

let _db: DbClient | null = null

export function getDb(): DbClient {
  if (!_db) {
    const client = postgres(process.env.DATABASE_URL!)
    const d = drizzle(client, { schema })
    _db = createDbClient(d)
  }
  return _db
}

export async function disconnectDb(): Promise<void> {
  _db = null
}

// ── Payload-backed DbClient (for onInit / webhooks) ─────────

export function createDbClientFromPayload(payload: any): DbClient {
  return {
    async find({ collection, where, limit, sort }) {
      if (limit === 0) {
        const result = await payload.find({ collection, where, limit: 1, sort })
        return { totalDocs: result.totalDocs, docs: [] }
      }
      const result = await payload.find({ collection, where, limit: limit ?? 100, sort })
      return { totalDocs: result.totalDocs, docs: result.docs }
    },

    async findByID({ collection, id }) {
      return payload.findByID({ collection, id })
    },

    async create({ collection, data }) {
      return payload.create({ collection, data: data as any })
    },

    async update({ collection, id, data }) {
      return payload.update({ collection, id, data: data as any })
    },

    async delete({ collection, id }) {
      return payload.delete({ collection, id })
    },

    async findGlobal({ slug }) {
      return payload.findGlobal({ slug })
    },

    async updateGlobal({ slug, data }) {
      return payload.updateGlobal({ slug, data: data as any })
    },
  }
}

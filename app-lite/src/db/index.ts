import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import * as schema from './schema'
import { eq, and, inArray, like, gt, lt, count, desc, asc } from 'drizzle-orm'

// ── DbClient interface ──────────────────────────────────────
// Stable interface. Handlers and tests only depend on this.

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

// ── Where clause builder ────────────────────────────────────

function buildWhere(table: any, where: any): any {
  if (!where) return undefined

  const conditions: any[] = []

  for (const [key, value] of Object.entries(where)) {
    if (key === 'and') {
      const subConditions = (value as any[]).map((w: any) => buildWhere(table, w))
      conditions.push(and(...subConditions.filter(Boolean)))
      continue
    }

    // Map Payload-style field names to Drizzle column names
    const colName = FIELD_MAP[key] ?? key
    const col = table[colName]
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
            conditions.push(like(col, `%${opVal}%`))
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

// ── Sort builder ────────────────────────────────────────────

function buildOrderBy(table: any, sort?: string): any {
  if (!sort) return undefined
  const descSort = sort.startsWith('-')
  const field = descSort ? sort.slice(1) : sort
  const col = table[field]
  if (!col) return undefined
  return descSort ? desc(col) : asc(col)
}

// ── Field name mapping ──────────────────────────────────────

const FIELD_MAP: Record<string, string> = {
  lead: 'leadId',
  client: 'clientId',
  interaction: 'interactionId',
  job_type: 'jobType',
  skill_name: 'skillName',
  is_active: 'isActive',
  idempotency_key: 'idempotencyKey',
  run_at: 'runAt',
  resend_message_id: 'resendMessageId',
  message_type: 'messageType',
  reply_classification: 'replyClassification',
  event_type: 'eventType',
  content_hash: 'contentHash',
  lead_id: 'leadId',
  client_id: 'clientId',
  business_name: 'businessName',
  niche_city_key: 'nicheCityKey',
  email_source: 'emailSource',
  email_confidence: 'emailConfidence',
  email_status: 'emailStatus',
  enriched_at: 'enrichedAt',
  enrichment_error: 'enrichmentError',
  priority_tier: 'priorityTier',
  website_url: 'websiteUrl',
}

const FIELD_MAP_REVERSE: Record<string, string> = {
  leadId: 'lead',
  clientId: 'client',
  interactionId: 'interaction',
}

// ── Data mappers ─────────────────────────────────────────────

function mapDataIn(data: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    const colName = FIELD_MAP[k] ?? k
    // Convert snake_case data keys to camelCase schema keys
    const camelKey = snakeToCamel(colName)
    mapped[camelKey] = v
  }
  // Always update updatedAt
  mapped['updatedAt'] = new Date().toISOString()
  return mapped
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

function mapDocOut(doc: any): any {
  if (!doc) return doc
  const result: any = { ...doc }
  // Expose relationship fields in Payload-compatible format
  for (const [drizzleKey, payloadKey] of Object.entries(FIELD_MAP_REVERSE)) {
    if (drizzleKey in result) result[payloadKey] = result[drizzleKey]
  }
  return result
}

function generateId(): string {
  return crypto.randomUUID()
}

// ── Drizzle-backed DbClient implementation ───────────────────

export function createDbClient(db: ReturnType<typeof drizzle>): DbClient {
  return {
    async find({ collection, where, limit, sort }) {
      const table = getTable(collection)
      const conditions = buildWhere(table, where)
      const orderBy = buildOrderBy(table, sort)

      if (limit === 0) {
        const countResult = db
          .select({ count: count() })
          .from(table)
          .where(conditions)
          .all()
        return { totalDocs: countResult[0]?.count ?? 0, docs: [] }
      }

      const docs = db
        .select()
        .from(table)
        .where(conditions)
        .limit(limit ?? 100)
        .orderBy(orderBy ?? desc(table.createdAt))
        .all()

      const countResult = db
        .select({ count: count() })
        .from(table)
        .where(conditions)
        .all()

      return { totalDocs: countResult[0]?.count ?? 0, docs: docs.map(mapDocOut) }
    },

    async findByID({ collection, id }) {
      const table = getTable(collection)
      const result = db.select().from(table).where(eq(table.id, id)).limit(1).all()
      const doc = result[0]
      if (!doc) throw new Error(`${collection} with id ${id} not found`)
      return mapDocOut(doc)
    },

    async create({ collection, data }) {
      const table = getTable(collection)
      const mapped = mapDataIn(data)
      if (!mapped.id) mapped.id = generateId()
      if (!mapped.createdAt) mapped.createdAt = new Date().toISOString()
      const result = db.insert(table).values(mapped as any).returning().all() as any[]
      const doc = result[0]
      return mapDocOut(doc)
    },

    async update({ collection, id, data }) {
      const table = getTable(collection)
      const mapped = mapDataIn(data)
      const result = db.update(table).set(mapped as any).where(eq(table.id, id)).returning().all() as any[]
      const doc = result[0]
      if (!doc) throw new Error(`${collection} with id ${id} not found`)
      return mapDocOut(doc)
    },

    async delete({ collection, id }) {
      const table = getTable(collection)
      const result = db.delete(table).where(eq(table.id, id)).returning().all() as any[]
      const doc = result[0]
      return mapDocOut(doc)
    },

    async findGlobal({ slug }) {
      if (slug !== 'system-config') throw new Error(`Unknown global: ${slug}`)
      const rows = db.select().from(schema.systemConfig).where(eq(schema.systemConfig.id, 1)).all()
      if (rows.length === 0) {
        const created = db.insert(schema.systemConfig).values({ id: 1 } as any).returning().all()
        return mapDocOut(created[0])
      }
      return mapDocOut(rows[0])
    },

    async updateGlobal({ slug, data }) {
      if (slug !== 'system-config') throw new Error(`Unknown global: ${slug}`)
      const mapped = mapDataIn(data)
      // Try update first
      const existing = db.select().from(schema.systemConfig).where(eq(schema.systemConfig.id, 1)).all()
      if (existing.length > 0) {
        const result = db
          .update(schema.systemConfig)
          .set(mapped as any)
          .where(eq(schema.systemConfig.id, 1))
          .returning()
          .all()
        return mapDocOut(result[0])
      }
      // Insert if not exists
      const result = db
        .insert(schema.systemConfig)
        .values({ id: 1, ...mapped } as any)
        .returning()
        .all()
      return mapDocOut(result[0])
    },
  }
}

// ── Singleton ────────────────────────────────────────────────

let _db: DbClient | null = null
let _sqlite: Database | null = null

export function getDb(): DbClient {
  if (!_db) {
    const dbPath = process.env.DATABASE_PATH ?? './data/agency.db'
    _sqlite = new Database(dbPath, { create: true })
    _sqlite.exec('PRAGMA journal_mode = WAL;')
    _sqlite.exec('PRAGMA foreign_keys = ON;')
    const d = drizzle(_sqlite, { schema })
    _db = createDbClient(d)
  }
  return _db
}

export function getRawDb(): ReturnType<typeof drizzle> | null {
  if (!_sqlite) return null
  return drizzle(_sqlite, { schema })
}

export function disconnectDb(): void {
  if (_sqlite) {
    _sqlite.close()
    _sqlite = null
  }
  _db = null
}

// ── Test helper: create in-memory DB ────────────────────────

export function createTestDb(): { db: DbClient; raw: ReturnType<typeof drizzle>; close: () => void } {
  const sqlite = new Database(':memory:')
  sqlite.exec('PRAGMA journal_mode = WAL;')
  const raw = drizzle(sqlite, { schema })
  const db = createDbClient(raw)
  return { db, raw, close: () => sqlite.close() }
}

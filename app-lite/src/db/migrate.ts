import { Database } from 'bun:sqlite'
import * as schema from './schema'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { sql } from 'drizzle-orm'

/**
 * Initialize database: create all tables if they don't exist.
 * This replaces the need for running drizzle-kit migrations during dev.
 */
export async function initializeDatabase() {
  const dbPath = process.env.DATABASE_PATH ?? './data/agency.db'
  const sqlite = new Database(dbPath, { create: true })

  sqlite.exec('PRAGMA journal_mode = WAL;')
  sqlite.exec('PRAGMA foreign_keys = ON;')

  // Create tables using raw SQL
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS operators (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator',
      hash TEXT,
      salt TEXT,
      login_attempts INTEGER DEFAULT 0,
      lock_until TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      business_name TEXT NOT NULL,
      niche TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      website_url TEXT,
      google_maps_url TEXT,
      email TEXT,
      phone TEXT,
      decision_maker TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      audit_score INTEGER,
      audit_data TEXT,
      priority_tier TEXT,
      exclusion_reason TEXT,
      source TEXT DEFAULT 'google_maps',
      niche_city_key TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      lead_id TEXT UNIQUE,
      business_name TEXT NOT NULL,
      contact_person TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      plan TEXT NOT NULL,
      plan_price_cents INTEGER,
      status TEXT NOT NULL DEFAULT 'pending_payment',
      niche TEXT NOT NULL,
      niche_template TEXT,
      domain TEXT,
      staging_url TEXT,
      live_url TEXT,
      checkout_link TEXT,
      subscription_id TEXT,
      onboarding_data TEXT,
      support_tier TEXT DEFAULT 'tier1',
      edits_remaining INTEGER DEFAULT 0,
      edits_reset_at TEXT,
      launched_at TEXT,
      cancelled_at TEXT,
      cancellation_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      lead_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      channel TEXT NOT NULL,
      message_type TEXT NOT NULL,
      subject TEXT,
      body TEXT,
      status TEXT NOT NULL,
      reply_classification TEXT,
      objection_type TEXT,
      resend_message_id TEXT,
      sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS client_interactions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      client_id TEXT NOT NULL,
      direction TEXT,
      channel TEXT,
      message_type TEXT,
      subject TEXT,
      body TEXT,
      status TEXT,
      support_tier TEXT,
      skill_version TEXT,
      human_approved INTEGER,
      resolved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      client_id TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      template_version TEXT,
      content_snapshot TEXT,
      preview_url TEXT,
      qa_results TEXT,
      data_isolation_ok INTEGER,
      human_approved INTEGER,
      human_approved_by TEXT,
      deployed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS billing_events (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      client_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      amount_cents INTEGER,
      currency TEXT DEFAULT 'usd',
      plan_at_event TEXT,
      provider_data TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      job_type TEXT NOT NULL,
      lead_id TEXT,
      client_id TEXT,
      status TEXT NOT NULL DEFAULT 'queued',
      attempts INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 3,
      run_at TEXT,
      started_at TEXT,
      completed_at TEXT,
      failed_at TEXT,
      error_message TEXT,
      skill_version TEXT,
      input_data TEXT,
      output_data TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS policy_checks (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      action_type TEXT NOT NULL,
      lead_id TEXT,
      client_id TEXT,
      interaction_id TEXT,
      rule_name TEXT NOT NULL,
      result TEXT NOT NULL,
      blocking_reason TEXT,
      override_by TEXT,
      skill_version TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pipeline_events (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      lead_id TEXT,
      client_id TEXT,
      from_status TEXT,
      to_status TEXT,
      triggered_by TEXT,
      skill_version TEXT,
      decision_data TEXT,
      policy_check_result TEXT,
      human_approved INTEGER,
      human_approved_by TEXT,
      human_approved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS skill_versions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      skill_name TEXT NOT NULL,
      version TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      deployed_by TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      current_phase INTEGER NOT NULL DEFAULT 2,
      email_approval_required INTEGER NOT NULL DEFAULT 1,
      demo_approval_required INTEGER NOT NULL DEFAULT 1,
      launch_approval_required INTEGER NOT NULL DEFAULT 1,
      active_niche TEXT NOT NULL DEFAULT 'hvac',
      active_cities TEXT NOT NULL DEFAULT '["Austin, TX"]',
      dodo_checkout_links TEXT DEFAULT '{}',
      maintenance_mode INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Seed default system config if not exists
  const existing = sqlite.query('SELECT id FROM system_config WHERE id = 1').get()
  if (!existing) {
    sqlite.exec(`INSERT INTO system_config (id) VALUES (1)`)
  }

  sqlite.close()
  console.log(`Database initialized at ${dbPath}`)
}

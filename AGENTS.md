# AGENTS.md

## Sync rule
- `AGENTS.md` and `CLAUDE.md` are mirror instruction files; when one changes, update the other in the same pass.

## Handoff rule
- Maintain `handoff.md` in the repo root. Read it at the start of every prompt execution before doing anything else.
- Every session must end by updating `handoff.md` with: what was done, what's in progress, what's blocked, and where the next agent should pick up.

## What this repo is
- AI-agent-operated web agency: business documentation in `docs/` + application layer in `app-lite/`.
- `docs/` — SOPs, pricing, templates, risk register, KPIs, architecture spec (`docs/19-Application-Architecture.md`).
- `app/` — **Legacy**. Next.js 16 + Payload CMS 3.83 + PostgreSQL. Retained for reference only; do not edit.
- `app-lite/` — **Active codebase**. Bun + Hono + Drizzle ORM + SQLite. Zero external CMS dependency. Same architecture, lighter stack.
- Application status: `app-lite` has type-safe code, real lead_gen handler with Google Maps scraper, 9 stub handlers remaining.

## Tooling commands (run inside `app-lite/`)
- `bun install` — install dependencies
- `bun run typecheck` — typecheck (must pass with 0 errors)
- `bun run test` — run all tests
- `bun run dev` — start dev server (hot reload)
- `bun run db:generate` — generate a migration
- `bun run db:migrate` — run migrations
- `bun run db:studio` — database GUI

## Canonical sources (read first)
- `handoff.md` — current state, in-progress work, blockers. Read first.
- `docs/README.md` for document map and intended read order.
- `docs/19-Application-Architecture.md` for the build spec — database schema, state machine, policy engine, API endpoints.
- `docs/06-Outreach-Sales-SOP.md`, `docs/08-Delivery-Operations-SOP.md`, `docs/10-Payments-Billing-SOP.md`, `docs/14-Implementation-Roadmap.md`, `docs/15-Templates.md` for operational rules most likely to be broken by edits.

## Non-negotiables to preserve
- Keep the 2-step sales motion intact unless explicitly testing alternatives: hook email first (no demo/link), demo+pricing only after positive interest.
- Do not introduce language that allows unauthorized discounts, free months, scope expansion, or guarantees about revenue/SEO/lead volume.
- Preserve strict client data isolation wording (no cross-client content, demos, or records).
- Preserve escalation rules: legal threats and angry/escalation messages are human-handled.
- Preserve human quality gates by phase (`docs/14-Implementation-Roadmap.md`): email review (phase 3), demo review (phase 4), final pre-launch review (phase 5) — launch gate is NEVER removed.
- The policy engine (`app-lite/src/policy/`) enforces these rules; do not weaken or bypass policy checks.

## Application architecture (`app-lite/`)
- **Runtime**: Bun with Hono HTTP framework. SQLite via `bun:sqlite` + Drizzle ORM.
- **Database** (`app-lite/src/db/schema.ts`): Drizzle ORM schema with 12 tables — leads, clients, interactions, client_interactions, deployments, billing_events, jobs, policy_checks, pipeline_events, skill_versions, system_config, operators. SQLite-backed (text timestamps, integer booleans).
- **DbClient** (`app-lite/src/db/index.ts`): Abstraction over Drizzle that provides the data-access interface (find, findByID, create, update, delete, findGlobal, updateGlobal). Includes `createTestDb()` for in-memory test databases.
- **State machine** (`app-lite/src/state-machine/`): `states.ts` defines valid transitions; `orchestrator.ts` wraps transitions with policy checks, pipeline event logging, and job scheduling.
- **Policy engine** (`app-lite/src/policy/`): 12 rules in `rules/index.ts`, engine aggregates results. Returns allowed/blocked/requiresHumanApproval.
- **Jobs** (`app-lite/src/jobs/`): DB-backed job queue with 10 handlers. `lead_gen` is real (Google Maps scraper). `scheduler.ts` handles event-triggered scheduling. `workers.ts` polls the jobs table (30s interval).
- **Scraper** (`app-lite/src/scraper/google-maps.ts`): Browser-mimicking fetch-based Google Maps scraper. Anti-detection headers, random delays, hex place ID parsing. No API keys.
- **Routes** (`app-lite/src/routes/`): Hono REST API routes for leads, clients, interactions, deployments, jobs, config, scraper. API key auth middleware.
- **Scraper routes** (`app-lite/src/routes/scraper.ts`): GET/PATCH `/api/scraper/config`, POST `/api/scraper/run`, GET `/api/scraper/history`, GET `/api/scraper/results`. Manages scraper config and triggers lead_gen jobs.
- **Dashboard** (`app-lite/public/index.html`): Real-time monitoring UI served at `/`. Two tabs: Dashboard (stats, pipeline, leads, jobs, clients) and Scraper (config, run, results, history). Light/dark mode, 5s auto-refresh.
- **Webhooks** (`app-lite/src/routes/webhooks/`): Hono routes for Dodo, Resend, Cloudflare callbacks.
- **Boundary**: If a dedicated CRM is used, treat CRM as sales engagement UI and this app as operational system of record; sync key lifecycle events only.

## Editing rules
- Treat documentation consistency as the main correctness check; when changing offer/scope/workflow, update all affected SOP/template/risk/KPI docs in the same pass.
- Keep package naming and pricing consistent everywhere (`Starter`, `Growth`, `Pro`; current ranges centered in `docs/02-Offer-Pricing-Packages.md`, plan configs in `app-lite/src/types/index.ts`).
- Keep payment-provider narrative consistent: validation stage uses Dodo/Polar merchant-of-record flow; Stripe is a later-stage migration option.
- IDs are UUID strings — always use `String()` cast when passing to functions expecting `string`.
- `db.find()` returns `{ totalDocs, docs }` — always null-check `docs[0]` before accessing properties.
- **`db.findGlobal()` returns camelCase** (e.g. `activeNiche`, `activeCities`), but `updateGlobal` input uses snake_case keys (e.g. `active_niche`). When reading config in handlers, always read both: `config.activeNiche ?? config.active_niche`. This mismatch is a known Drizzle ORM mapping gap.
- After editing source files, run `bun run typecheck` and `bun run test` from `app-lite/` to verify.
- Do NOT edit `app/` — it is legacy. All work goes in `app-lite/`.

## High-value cross-file dependencies
- Sales flow or outreach edits -> also review `docs/15-Templates.md`, `docs/12-KPIs-Dashboard.md`, `docs/13-Risk-Register.md`.
- Delivery/launch process edits -> also review `docs/07-Onboarding-SOP.md`, `docs/09-Support-Retention-SOP.md`, `docs/14-Implementation-Roadmap.md`.
- Pricing/package edits -> also review `docs/01-Business-Model.md`, `docs/06-Outreach-Sales-SOP.md`, `docs/10-Payments-Billing-SOP.md`, `docs/15-Templates.md`, `app-lite/src/types/index.ts`.
- Policy rule changes -> also review `app-lite/src/policy/rules/index.ts` and related tests.
- State machine transitions -> also review `app-lite/src/state-machine/states.ts`.
- Database schema changes -> edit `app-lite/src/db/schema.ts` then run `bun run db:generate`.
- Scraper changes -> also review `app-lite/tests/unit/scraper/google-maps.test.ts`, `app-lite/tests/unit/handlers/lead-gen.test.ts`, and `app-lite/src/routes/scraper.ts`.
- Dashboard UI changes -> review `app-lite/public/index.html` (single-file dashboard with inline CSS/JS).
- Niche/city targeting edits -> also review `docs/22-Niche-Hunting-SOP.md`, `docs/03-ICP-Niches-Scoring.md`, `docs/12-KPIs-Dashboard.md`, `docs/15-Templates.md`, `data/niche-city-scorecard.csv`.

## Scope discipline for agent edits
- Prefer small, surgical edits over broad rewrites; keep document structure and numbering stable unless the task requires restructuring.
- If a requested change conflicts with guardrails above, call out the conflict explicitly in your response rather than silently applying it.

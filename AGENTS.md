# AGENTS.md

## Sync rule
- `AGENTS.md` and `CLAUDE.md` are mirror instruction files; when one changes, update the other in the same pass.

## What this repo is
- AI-agent-operated web agency: business documentation in `docs/` + application layer in `app/`.
- `docs/` — SOPs, pricing, templates, risk register, KPIs, architecture spec (`docs/19-Application-Architecture.md`).
- `app/` — Next.js 16 + Payload CMS 3.83 + Drizzle ORM. PostgreSQL-backed operations system (execution + audit trail), not a full sales CRM replacement.
- Application status: type-safe (0 tsc errors), 163 tests passing. Job handlers are stubs. Local dev requires Postgres (via `docker compose --profile dev up`).

## Tooling commands (run inside `app/`)
- `pnpm install` — install dependencies
- `npx tsc --noEmit` — typecheck (must pass with 0 errors)
- `npx vitest run` — run all 163 tests
- `pnpm dev` — start Next.js dev server (requires Postgres, see docker-compose.yml)
- `npx drizzle-kit push` — sync schema to database (dev)
- `npx drizzle-kit generate` — generate a migration
- `npx drizzle-kit migrate` — run migrations
- `npx drizzle-kit studio` — database GUI
- `docker compose -f docker-compose.prod.yml up -d --build` — production deploy (run on VPS from `app/`)

## Canonical sources (read first)
- `docs/README.md` for document map and intended read order.
- `docs/19-Application-Architecture.md` for the build spec — database schema, state machine, policy engine, API endpoints. Source of truth for the `app/` implementation.
- `docs/06-Outreach-Sales-SOP.md`, `docs/08-Delivery-Operations-SOP.md`, `docs/10-Payments-Billing-SOP.md`, `docs/14-Implementation-Roadmap.md`, `docs/15-Templates.md` for operational rules most likely to be broken by edits.

## Non-negotiables to preserve
- Keep the 2-step sales motion intact unless explicitly testing alternatives: hook email first (no demo/link), demo+pricing only after positive interest.
- Do not introduce language that allows unauthorized discounts, free months, scope expansion, or guarantees about revenue/SEO/lead volume.
- Preserve strict client data isolation wording (no cross-client content, demos, or records).
- Preserve escalation rules: legal threats and angry/escalation messages are human-handled.
- Preserve human quality gates by phase (`docs/14-Implementation-Roadmap.md`): email review (phase 3), demo review (phase 4), final pre-launch review (phase 5) — launch gate is NEVER removed.
- The policy engine (`app/src/policy/`) enforces these rules; do not weaken or bypass policy checks.

## Application architecture (`app/`)
- **Database** (`app/src/db/schema.ts`): Drizzle ORM schema with 12 tables — leads, clients, interactions, client_interactions, deployments, billing_events, jobs, policy_checks, pipeline_events, skill_versions, system_config, operators.
- **DbClient** (`app/src/db/index.ts`): Abstraction over Drizzle that provides the data-access interface (find, findByID, create, update, delete, findGlobal, updateGlobal). Also exposes `createDbClientFromPayload()` for Payload context (webhooks, onInit).
- **Payload CMS** (`app/src/payload.config.ts`): Admin UI + REST API + collection definitions. Collections mirror the Drizzle schema exactly. `@payloadcms/db-postgres` (Drizzle-based internally) handles table creation.
- **State machine** (`app/src/state-machine/`): `states.ts` defines valid transitions; `orchestrator.ts` wraps transitions with policy checks, pipeline event logging, and job scheduling.
- **Policy engine** (`app/src/policy/`): 12 rules in `rules/index.ts`, engine aggregates results. Returns allowed/blocked/requiresHumanApproval.
- **Jobs** (`app/src/jobs/`): DB-backed job queue with 10 handlers (stubs). `scheduler.ts` handles event-triggered scheduling. `workers.ts` polls the jobs table.
- **Webhooks** (`app/src/app/api/webhooks/`): Next.js route handlers for Dodo, Polar, Resend, Cloudflare deploy callbacks with HMAC verification and idempotency.
- **Tests** (`app/tests/`): unit (56), golden (8), adversarial (18), integration/smoke (24), regression (20) — 163 total (counts may shift as handlers evolve).
- **Boundary**: If a dedicated CRM is used, treat CRM as sales engagement UI and this app as operational system of record; sync key lifecycle events only.

## Editing rules
- Treat documentation consistency as the main correctness check; when changing offer/scope/workflow, update all affected SOP/template/risk/KPI docs in the same pass.
- Keep package naming and pricing consistent everywhere (`Starter`, `Growth`, `Pro`; current ranges centered in `docs/02-Offer-Pricing-Packages.md`, plan configs in `app/src/types/index.ts`).
- Keep payment-provider narrative consistent: validation stage uses Dodo/Polar merchant-of-record flow; Stripe is a later-stage migration option.
- IDs are UUID strings — always use `String()` cast when passing to functions expecting `string`.
- `db.find()` returns `{ totalDocs, docs }` — always null-check `docs[0]` before accessing properties.
- After editing source files, run `npx tsc --noEmit` and `npx vitest run` from `app/` to verify.

## High-value cross-file dependencies
- Sales flow or outreach edits -> also review `docs/15-Templates.md`, `docs/12-KPIs-Dashboard.md`, `docs/13-Risk-Register.md`.
- Delivery/launch process edits -> also review `docs/07-Onboarding-SOP.md`, `docs/09-Support-Retention-SOP.md`, `docs/14-Implementation-Roadmap.md`.
- Pricing/package edits -> also review `docs/01-Business-Model.md`, `docs/06-Outreach-Sales-SOP.md`, `docs/10-Payments-Billing-SOP.md`, `docs/15-Templates.md`, `app/src/types/index.ts`.
- Policy rule changes -> also review `app/tests/unit/policy-rules.test.ts`, `app/tests/adversarial/adversarial.test.ts`, `app/tests/integration/pipeline-smoke.test.ts`.
- State machine transitions -> also review `app/src/state-machine/states.ts`, `app/tests/unit/state-machine.test.ts`.
- Database schema changes -> edit `app/src/db/schema.ts` AND the corresponding Payload collection in `app/src/collections/`, then run `npx drizzle-kit generate`.

## Scope discipline for agent edits
- Prefer small, surgical edits over broad rewrites; keep document structure and numbering stable unless the task requires restructuring.
- If a requested change conflicts with guardrails above, call out the conflict explicitly in your response rather than silently applying it.

# Application Build & Test Guide

Complete A-to-Z instructions for taking the `app/` scaffold from type-safe stubs to a bootable, tested, production-viable application. No step depends on a number — follow the sections in any order that makes sense, but all must be complete before calling the app "ready."

---

## Local Development Environment

### Docker Compose for Postgres and Redis

The app requires Postgres 15+ and Redis 7+ to run. Create `app/docker-compose.yml` with two services:

- **postgres** — image `postgres:15-alpine`, port 5432, database `web_agency`, user/password matching `.env`.
- **redis** — image `redis:7-alpine`, port 6379, no password (local dev only).
- Both with named volumes for data persistence and a healthcheck on postgres (`pg_isready`).
- A `dev` profile so `docker compose up` only starts infra, not any app containers.

The compose file should live at `app/docker-compose.yml` so developers run it from the `app/` directory.

### Environment Configuration

Create `app/.env` from `.env.example` with real local values:

- `DATABASE_URI=postgres://web_agency:web_agency@localhost:5432/web_agency`
- `REDIS_URL=redis://localhost:6379`
- `PAYLOAD_SECRET` — generate a random 32-char string for local dev.
- `NEXT_PUBLIC_SERVER_URL=http://localhost:3000`
- All webhook secrets (`DODO_WEBHOOK_SECRET`, `POLAR_WEBHOOK_SECRET`, `RESEND_API_KEY`, `CLOUDFLARE_API_TOKEN`) can be placeholder values until integration testing.
- `SMTP_*` fields are unused in local dev (Resend is the email provider, not SMTP).

After `.env` is set, `pnpm dev` should be able to connect to both services.

### Verify Docker Services

Run `docker compose up -d` from `app/`. Verify with `docker compose ps` that both containers show `healthy` / `running`. Test postgres with `docker compose exec postgres pg_isready`. Test redis with `docker compose exec redis redis-cli ping`.

---

## Boot Verification

### Payload CMS Initialization

Run `pnpm dev` from `app/`. Payload should:

- Connect to Postgres and run migrations (first run creates all tables from collection definitions).
- Connect to Redis (for BullMQ queue, sessions if configured).
- Start Next.js dev server on `http://localhost:3000`.
- Admin panel accessible at `http://localhost:3000/admin`.

First boot creates the initial admin user via the Payload setup screen. Create an operator account with email/password. This is the human operator who reviews quality gates.

### Collection Verification

After admin panel loads, verify each of the 11 collections appears in the sidebar:

- Leads, Clients, Interactions, ClientInteractions, Deployments, BillingEvents, Jobs, PolicyChecks, PipelineEvents, SkillVersions, Operators.
- Also verify the `SystemConfig` global appears under "Globals."
- Create one test record in each collection to confirm CRUD works. Use the admin panel — no code needed.

### Build Verification

Run `pnpm build` from `app/`. This must complete with zero errors. The build verifies:

- All TypeScript compiles (stricter than `tsc --noEmit` because Next.js applies additional checks).
- All Payload collection configs serialize correctly.
- All pages and routes build.

If build fails, fix each error before proceeding. Common issues: missing `.env` vars at build time, incompatible Payload/Next.js versions, import path issues.

---

## Seed Data

### Seed Script

Create `app/src/scripts/seed.ts` (or a Payload seed endpoint) that populates the database with test data covering every state in the system:

- **Leads** — one in each status: `new`, `scored`, `contacted`, `replied_interested`, `replied_objection`, `demo_sent`, `paid`, `lost`, `archived`.
- **Clients** — one in each status: `pending_payment`, `onboarding`, `active`, `payment_failed`, `grace_period`, `suspended`, `cancelled`.
- **Interactions** — hook emails, demo emails, support replies, inbound messages.
- **Deployments** — one `building`, one `deployed`, one `failed`.
- **BillingEvents** — checkout_complete, renewal_success, renewal_failed.
- **Jobs** — one `queued`, one `running`, one `completed`, one `failed`, one `dead`.
- **PipelineEvents** — transition logs for every valid state change.
- **PolicyChecks** — blocked, passed, and human-approval records.
- **SystemConfig** — set `current_phase: 5`, all approval gates enabled, `active_niche: "HVAC"`, `active_cities: ["Austin", "Denver"]`.

Run the seed via `npx tsx src/scripts/seed.ts` or through a Payload endpoint. Verify counts in the admin panel.

### Seed Cleanup

The seed script should be idempotent — running it twice produces the same state. Use `payload.delete()` for each collection before inserting, or use unique idempotency keys.

---

## Job Handler Implementation

### Handler-by-Handler Implementation Order

Replace the 10 stub handlers with real business logic. Implement in this order based on pipeline dependency:

**`handleLeadGen`** — Reads SystemConfig for niche + cities. Searches for businesses matching the ICP criteria (initially a placeholder that creates scored leads from a static list). Creates lead records with status `scored`. Logs pipeline event for `new → scored`.

**`handleFollowUp1`** and **`handleFollowUp2`** — Loads the lead by `job.data.leadId`. Checks lead is still `contacted` (skip if not). Uses the outreach-sales skill to draft a follow-up email. Creates an Interaction record with `message_type: "follow_up"`, direction `outbound`, status `draft`. Does NOT send — the policy engine must approve first.

**`handleDemoBuild`** — Loads the lead. Creates a Deployment record with `status: "building"`. Triggers the demo-builder skill to clone the template site, swap business name/content/phone. Calls the Cloudflare deploy service to push to a `.pages.dev` subdomain. Updates deployment status to `deployed` or `failed`. Updates lead status to `demo_sent` via the orchestrator.

**`handleOnboarding`** — Loads the client. Creates a welcome email Interaction. Sets up the hosting environment. Creates initial Deployment record for the production site. Schedules the first monthly report job.

**`handleMonthlyReport`** — Queries all `active` clients. For each, generates a summary of changes, uptime, and support interactions. Creates a ClientInteraction record with the report. Sends via email service.

**`handleChurnCheck`** — Queries clients in `payment_failed`, `grace_period`, `suspended` status plus `active` clients with no interaction in 60 days. Flags at-risk clients. Creates retention outreach jobs.

**`handleSupportAutoReply`** — Loads the interaction. Classifies the support request (billing, technical, general). Drafts a response using the support skill. Checks policy engine before sending. Creates a reply Interaction.

**`handleBillingRetry`** — Loads the client in `payment_failed`. Sends a payment reminder email via ClientInteraction. Logs the attempt. If max retries reached, transitions client to `grace_period` via orchestrator.

**`handleSiteQa`** — Loads the deployment. Runs automated checks: mobile viewport, broken links, form submissions, data isolation (no cross-client content). Updates deployment `data_isolation_ok` field. Flags failures for human review.

### Handler Testing Pattern

Each handler should have its own test file under `app/tests/unit/handlers/`. Mock the Payload API and verify:

- Correct collection queries are made.
- Correct state transitions happen via the orchestrator.
- Policy checks are called where required.
- Edge cases handled: missing records, wrong status, empty data.

---

## Webhook Integration Testing

### Local Webhook Testing

Use ngrok or a similar tunnel to expose `localhost:3000` for webhook testing. Configure the tunnel URL in each provider's webhook settings.

### Dodo Payments Webhook

Send a test payload matching Dodo's `checkout_complete` event format to `POST /api/webhooks/dodo`. Verify:

- HMAC signature validation accepts valid signatures and rejects invalid ones.
- BillingEvent record created with correct fields.
- Client status transitions from `pending_payment` to `onboarding`.
- Onboarding job is queued.
- Idempotency: sending the same event twice creates only one BillingEvent and one transition.

Send a `subscription.canceled` event and verify client transitions to `cancelled`.

### Polar Webhook

Same pattern as Dodo. Send test payloads for `order.created` and `subscription.canceled`. Verify identical behavior to the Dodo handler.

### Resend Webhook

Send test payloads for `delivered`, `bounced`, `complained`, `opened` events. Verify:

- Interaction record status updates to `delivered` or `bounced` correctly.
- Unknown event types are ignored gracefully.
- Missing `email_id` returns early without error.

### Cloudflare Deploy Webhook

Send a test payload with `success: true` and a deploy URL. Verify:

- Deployment record status updates to `deployed`.
- `deployed_at` timestamp is set.
- `preview_url` is updated if provided.

---

## Policy Engine End-to-End Verification

### Full Policy Lifecycle Test

Using seed data, exercise every policy rule against the running application:

- Create a hook email Interaction with a demo link. Call the policy-check hook. Verify it returns `blocked` and a PolicyCheck record is created.
- Create a hook email without violations. Verify it passes in phase 5 but requires human approval in phase 3.
- Attempt a launch without client context. Verify `payment_before_launch` blocks it.
- Attempt a launch with client context. Verify `human_gate_launch` requires approval even at phase 99.
- Send a support reply with legal threat language. Verify `legal_threat_escalation` blocks it.
- Send a support reply with discount language. Verify `no_discount_without_approval` blocks it.

### Orchestrator Integration Test

Call `transitionLead` for every valid transition in the state machine. Verify:

- Status updates in the database.
- PipelineEvent records created with correct `from_status`, `to_status`, `triggered_by`.
- Policy checks run when applicable (contacted, demo_sent transitions).
- Jobs are scheduled after transitions (follow_up_1/2 after contacted, demo_build after replied_interested, onboarding after onboarding status).
- Invalid transitions return `{ success: false, reason: "..." }` and create a blocked PolicyCheck record.

Call `transitionClient` for every valid client transition. Verify the same pattern.

---

## Access Control Verification

### API Key Authentication

Test that all webhook endpoints and internal API endpoints require a valid API key or HMAC signature:

- Requests without authentication return 401.
- Requests with an invalid API key return 401.
- Requests with a valid API key succeed.

### Role-Based Access

Verify the Payload access control functions:

- `apiKeyOrOperator` — allows requests with valid API key OR users with operator role.
- `operatorOnly` — allows only operator-role users.
- `adminOnly` — allows only admin-role users.

Test by making API calls as different user types via the admin panel or direct API calls.

---

## Observability Verification

### Audit Logging

Every state transition, policy check, and webhook event should create an audit trail. Verify:

- PipelineEvents are created for every transition.
- PolicyChecks are created for every policy evaluation (pass, block, or human-approval).
- Records include timestamps, triggering entity, and decision data.

### Alert Dispatch

Test the alert system by triggering a dead job (exhaust all retries). Verify:

- `sendAlert` is called with the correct subject and body.
- Alert email would be sent (mock the email service in tests, or use a real Resend key for manual testing).

### Skill Version Tracking

Use the `registerSkillVersion` function to register a new skill version. Verify:

- Previous active version is deactivated.
- New version is marked active.
- Content hash is stored.
- `rollbackSkillVersion` correctly deactivates current and activates target version.
- Rolling back to a nonexistent version throws an error.

---

## Production Readiness Checklist

### Environment Variables

All variables in `.env.example` must be set with production values:

- `DATABASE_URI` — production Postgres connection string.
- `REDIS_URL` — production Redis connection string.
- `PAYLOAD_SECRET` — cryptographically random, not committed to git.
- `NEXT_PUBLIC_SERVER_URL` — the public domain.
- All webhook secrets — real values from each provider.
- `RESEND_API_KEY` — real Resend API key.
- `CLOUDFLARE_API_TOKEN` — real Cloudflare token with Pages permissions.

### Deployment

Deploy to a platform that supports Next.js 15 (Vercel, Cloudflare Pages, or a VPS with Node.js). Verify:

- `pnpm build` succeeds in the production environment.
- Database migrations run on deploy (Payload handles this automatically on first boot).
- Admin panel loads and authentication works.
- Webhook endpoints are accessible and return 200 for valid payloads.

### Monitoring

Set up monitoring for:

- Application uptime (health check endpoint).
- Database connectivity.
- Redis connectivity.
- Job queue health (no backlog of dead jobs).
- Policy check failure rate (spike indicates agent quality issue).

---

## Known Gaps and Future Work

- **Job handlers are stubs** — returning placeholder results. Must be replaced with real skill invocations once the AI skill layer is integrated.
- **No email sending** — the Resend service exists but `pnpm dev` has never sent a real email.
- **No real deployments** — the Cloudflare deploy service exists but has never pushed a real site.
- **No AI skill integration** — the skill layer (outreach-sales, demo-builder, support) is documented in `docs/17-Agent-Platform-Decision.md` but not implemented in code.
- **No authentication provider** — NextAuth route exists but is unconfigured. Payload's built-in auth works for the admin panel, but operator-facing auth needs configuration.
- **No rate limiting** — webhook endpoints should have rate limiting in production.
- **No CORS configuration** — API endpoints may need CORS headers depending on frontend architecture.

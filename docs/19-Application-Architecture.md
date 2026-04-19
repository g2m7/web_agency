# Application Architecture

## Purpose

This document defines the concrete build specification for the application layer that supports the AI-agent-operated web agency. It bridges the gap between the SOP documentation (docs 01–18) and actual implementation.

**Core principle:** Skills are bounded workers inside a controlled architecture. Skills handle judgment (copywriting, classification, evaluation). The application handles plumbing (state, persistence, email, webhooks, scheduling, guardrails). Neither works without the other.

**Relationship to doc 17:** Doc 17 defines the 7 workflow specs, phased autonomy, and guardrails. This document defines the software system that enforces and executes those specs.

**System boundary:** Payload is the internal operations system of record (execution, policy enforcement, workflow state, and audit trail). If a CRM is added, use it as a sales engagement interface and sync only key lifecycle events to avoid duplicate sources of truth.

---

## 1. System Overview

```
┌──────────────────────────────────────────────────────┐
│  HUMAN GATES (removed only when KPI thresholds met)  │
│  Email review (Phase 3) · Demo review (Phase 4)      │
│  Launch review (never removed) · Escalations (always) │
├──────────────────────────────────────────────────────┤
│  OBSERVABILITY LAYER                                  │
│  Audit log · Decision traces · Skill version tracking │
│  Failure alerts · KPI dashboards · Rollback           │
├──────────────────────────────────────────────────────┤
│  POLICY ENGINE (runs before every outbound action)    │
│  Hard guardrails from docs 06/08/09/13                │
├──────────────────────────────────────────────────────┤
│  ORCHESTRATOR (state machine + job queue)             │
│  Pipeline transitions · Retries · Idempotency         │
├──────────────────────────────────────────────────────┤
│  7 SKILLS (bounded workers, strict I/O contracts)     │
│  lead-gen · website-audit · outreach-sales            │
│  demo-builder · onboarding · delivery-ops             │
│  support-retention                                    │
├──────────────────────────────────────────────────────┤
│  AUTOMATED EVALS                                      │
│  Golden tests · Adversarial tests · Regression suite  │
├──────────────────────────────────────────────────────┤
│  INFRASTRUCTURE                                       │
│  PostgreSQL · API server · Email (Resend)             │
│  Dodo/Polar webhooks · Job scheduler · Site deploy    │
│  Monitoring (UptimeRobot + custom alerts)             │
└──────────────────────────────────────────────────────┘
```

---

## 2. Technology Decisions

### Database: PostgreSQL

**Decision:** PostgreSQL from day one. Not SQLite.

**Rationale:**
- Payment webhooks arrive concurrently — PostgreSQL handles row-level locking natively
- JSONB columns for flexible audit data, lead metadata, and interaction logs without schema churn
- Concurrent job scheduling requires advisory locks or `SKIP LOCKED` — PostgreSQL does both
- If this business works, you'll outgrow SQLite within months; the migration cost isn't worth the initial simplicity
- Hosted options (Supabase, Neon, Railway) remove ops burden

### API Server: Node.js + Express + TypeScript

**Rationale:**
- Matches the skill on the backend-dev-guidelines skill already installed
- TypeScript enforces the strict I/O contracts between orchestrator and skills
- Express is battle-tested; no framework risk
- Easy to deploy on Railway or Fly.io

### Email: Resend

**Rationale:**
- Developer-first API, reliable delivery
- Webhook callbacks for bounces, opens, clicks (needed for KPI tracking)
- Template support for consistent formatting
- Free tier covers validation volumes

### Job Queue: BullMQ + Redis

**Rationale:**
- Handles scheduled jobs (follow-up emails, daily lead-gen, monthly reports)
- Built-in retry with exponential backoff
- Job deduplication via ID — prevents double-sends
- Dead letter queue for failed jobs that need human attention
- Observable via Bull Board UI

### Site Deployment: Cloudflare Pages

**Rationale:**
- Static HTML + Tailwind (per doc 14 template spec) — perfect fit
- CLI deploy from API server
- Preview URLs for demos (auto-generated subdomain per deployment)
- Free tier covers early scale

### Monitoring: UptimeRobot + Custom Alerts

**Rationale:**
- UptimeRobot for basic uptime monitoring
- Custom alerts inside the app for business-logic failures (reply rate drop, unauthorized action attempts, queue backup)

---

## 3. Database Schema

### Core principle

Every entity has `created_at`, `updated_at`, and a UUID primary key. Every state transition is logged. Every interaction with an external service (email, payment, deploy) is recorded.

### Tables

#### `leads`

```
leads
├── id                  UUID PK
├── business_name       TEXT NOT NULL
├── niche               TEXT NOT NULL
├── city                TEXT NOT NULL
├── state               TEXT NOT NULL
├── website_url         TEXT
├── google_maps_url     TEXT
├── email               TEXT
├── phone               TEXT
├── decision_maker      TEXT
├── status              lead_status ENUM (see state machine)
├── audit_score         INTEGER (0-10)
├── audit_data          JSONB (full audit from website-audit skill)
├── priority_tier       TEXT CHECK IN ('hot', 'warm', 'low')
├── exclusion_reason    TEXT (nullable — why excluded if excluded)
├── source              TEXT (google_maps, directory, manual)
├── niche_city_key      TEXT (dedup key: "hvac-austin-tx-businessname")
├── created_at          TIMESTAMPTZ
├── updated_at          TIMESTAMPTZ
└── UNIQUE(niche_city_key)
```

#### `pipeline_events`

Tracks every state transition. This is the decision trace.

```
pipeline_events
├── id                  UUID PK
├── lead_id             UUID FK → leads
├── from_status         lead_status ENUM
├── to_status           lead_status ENUM
├── triggered_by        TEXT (skill name, webhook, human, cron)
├── skill_version       TEXT (git hash or semver of the skill)
├── decision_data       JSONB (what the skill output, why it decided this)
├── policy_check_result TEXT (pass, blocked, bypassed)
├── human_approved      BOOLEAN (null if not required)
├── human_approved_by   TEXT (nullable)
├── human_approved_at   TIMESTAMPTZ (nullable)
├── created_at          TIMESTAMPTZ
└── INDEX(lead_id, created_at)
```

#### `interactions`

Every email, message, and call logged here.

```
interactions
├── id                  UUID PK
├── lead_id             UUID FK → leads
├── direction           TEXT CHECK IN ('inbound', 'outbound')
├── channel             TEXT CHECK IN ('email', 'support_ticket', 'whatsapp')
├── message_type        TEXT (hook_email, follow_up_1, follow_up_2, demo_email, welcome, support_reply, monthly_report, retention, other)
├── subject             TEXT
├── body                TEXT
├── status              TEXT CHECK IN ('draft', 'pending_approval', 'approved', 'sent', 'delivered', 'bounced', 'failed')
├── reply_classification TEXT CHECK IN ('interested', 'not_interested', 'objection', 'question', 'no_response', 'angry', 'legal_threat', null)
├── objection_type      TEXT (nullable)
├── resend_message_id   TEXT (nullable, for tracking)
├── sent_at             TIMESTAMPTZ (nullable)
├── created_at          TIMESTAMPTZ
└── INDEX(lead_id, created_at)
```

#### `clients`

Created when a lead converts to paid.

```
clients
├── id                  UUID PK
├── lead_id             UUID FK → leads (nullable — some clients may come from referrals)
├── business_name       TEXT NOT NULL
├── contact_person      TEXT
├── email               TEXT NOT NULL
├── phone               TEXT
├── plan                TEXT CHECK IN ('starter', 'growth', 'pro')
├── plan_price_cents    INTEGER (price at time of sale, in cents)
├── status              client_status ENUM (see billing states)
├── niche               TEXT NOT NULL
├── niche_template      TEXT (template branch/ref used)
├── domain              TEXT
├── staging_url         TEXT
├── live_url            TEXT
├── checkout_link       TEXT
├── subscription_id     TEXT (Dodo/Polar subscription ID)
├── onboarding_data     JSONB (intake form responses, materials received)
├── support_tier        TEXT CHECK IN ('tier1', 'tier2', 'tier3')
├── edits_remaining     INTEGER (monthly edit count remaining)
├── edits_reset_at      TIMESTAMPTZ (next monthly reset)
├── launched_at         TIMESTAMPTZ (nullable)
├── cancelled_at        TIMESTAMPTZ (nullable)
├── cancellation_reason TEXT (nullable)
├── created_at          TIMESTAMPTZ
├── updated_at          TIMESTAMPTZ
└── INDEX(status, plan)
```

#### `client_interactions`

Support and communication history for active clients.

```
client_interactions
├── id                  UUID PK
├── client_id           UUID FK → clients
├── direction           TEXT CHECK IN ('inbound', 'outbound')
├── channel             TEXT
├── message_type        TEXT (support_request, edit_request, monthly_report, retention, proactive_fix, escalation, other)
├── subject             TEXT
├── body                TEXT
├── status              TEXT (open, in_progress, resolved, escalated, closed)
├── support_tier        TEXT CHECK IN ('tier1', 'tier2', 'tier3')
├── skill_version       TEXT
├── human_approved      BOOLEAN
├── resolved_at         TIMESTAMPTZ (nullable)
├── created_at          TIMESTAMPTZ
└── INDEX(client_id, created_at)
```

#### `deployments`

Track every site build and deploy.

```
deployments
├── id                  UUID PK
├── client_id           UUID FK → clients
├── type                TEXT CHECK IN ('demo', 'initial_launch', 'edit', 'refresh', 'redeploy')
├── status              TEXT CHECK IN ('building', 'ready', 'deployed', 'failed')
├── template_version    TEXT (git ref)
├── content_snapshot    JSONB (content.json at time of deploy)
├── preview_url         TEXT
├── qa_results          JSONB (checklist results)
├── data_isolation_ok   BOOLEAN
├── human_approved      BOOLEAN (nullable)
├── human_approved_by   TEXT
├── deployed_at         TIMESTAMPTZ (nullable)
├── created_at          TIMESTAMPTZ
└── INDEX(client_id, type, created_at)
```

#### `billing_events`

Every payment-related event. Idempotency key is the Dodo/Polar event ID.

```
billing_events
├── id                  UUID PK
├── client_id           UUID FK → clients
├── event_type          TEXT (checkout_complete, renewal_success, renewal_failed, subscription_cancelled, subscription_resumed, grace_period_entered, suspended)
├── idempotency_key     TEXT NOT NULL UNIQUE (webhook event ID from provider)
├── amount_cents        INTEGER
├── currency            TEXT DEFAULT 'usd'
├── plan_at_event       TEXT
├── provider_data       JSONB (full webhook payload)
├── created_at          TIMESTAMPTZ
└── INDEX(client_id, created_at)
```

#### `jobs`

Job queue tracking (mirror of BullMQ for queryability).

```
jobs
├── id                  UUID PK
├── job_type            TEXT (lead_gen, follow_up_1, follow_up_2, demo_build, onboarding, monthly_report, churn_check, support_auto_reply, billing_retry, site_qa)
├── lead_id             UUID FK → leads (nullable)
├── client_id           UUID FK → clients (nullable)
├── status              TEXT (queued, running, completed, failed, dead)
├── attempts            INTEGER DEFAULT 0
├── max_attempts        INTEGER DEFAULT 3
├── run_at              TIMESTAMPTZ (scheduled execution time)
├── started_at          TIMESTAMPTZ (nullable)
├── completed_at        TIMESTAMPTZ (nullable)
├── failed_at           TIMESTAMPTZ (nullable)
├── error_message       TEXT (nullable)
├── skill_version       TEXT
├── input_data          JSONB
├── output_data         JSONB
├── created_at          TIMESTAMPTZ
└── INDEX(job_type, status, run_at)
```

#### `policy_checks`

Every outbound action passes through the policy engine. This table is the audit trail.

```
policy_checks
├── id                  UUID PK
├── action_type         TEXT (send_email, send_demo, launch_site, offer_discount, respond_to_client)
├── lead_id             UUID FK → leads (nullable)
├── client_id           UUID FK → clients (nullable)
├── interaction_id      UUID FK → interactions (nullable)
├── rule_name           TEXT (e.g., 'no_demo_before_interest', 'no_discount_without_approval', 'data_isolation_check')
├── result              TEXT CHECK IN ('pass', 'blocked', 'requires_human_approval')
├── blocking_reason     TEXT (nullable)
├── override_by         TEXT (nullable — human who approved)
├── skill_version       TEXT
├── created_at          TIMESTAMPTZ
└── INDEX(action_type, result, created_at)
```

#### `skill_versions`

Track which skill version was used for every decision. Enables rollback.

```
skill_versions
├── id                  UUID PK
├── skill_name          TEXT NOT NULL
├── version             TEXT NOT NULL (semver or git hash)
├── content_hash        TEXT NOT NULL (hash of the skill file content)
├── deployed_at         TIMESTAMPTZ
├── deployed_by         TEXT
├── notes               TEXT
├── is_active           BOOLEAN DEFAULT true
└── UNIQUE(skill_name, version)
```

#### `system_config`

Singleton config table for phase-awareness and feature flags.

```
system_config
├── key                 TEXT PK
├── value               JSONB
├── updated_at          TIMESTAMPTZ
├── updated_by          TEXT
└── rows:
    ├── current_phase           → "3" (1-7, maps to doc 14 phases)
    ├── email_approval_required → true/false (auto-managed by phase)
    ├── demo_approval_required  → true/false
    ├── launch_approval_required → true (never auto-managed to false)
    ├── active_niche            → "hvac"
    ├── active_cities           → ["Austin, TX"]
    ├── dodo_checkout_links     → {"starter": "url", "growth": "url", "pro": "url"}
    └── maintenance_mode        → false
```

---

## 4. State Machine

### Lead pipeline states

```
                    ┌──────────┐
                    │   NEW    │
                    └────┬─────┘
                         │ lead-gen scores
                         ▼
                    ┌──────────┐
                    │  SCORED  │
                    └────┬─────┘
                         │ outreach-sales sends hook
                         ▼
                 ┌───────────────┐
                 │  CONTACTED    │
                 └───┬───┬───┬───┘
                     │   │   │
          interested │   │ ? │ no response
                     │   │   │
                     ▼   ▼   ▼
        ┌─────────┐  ┌──┐ ┌──────────┐
        │REPLIED_ │  │??│ │ ARCHIVED │
        │INTERESTED│  └──┘ └──────────┘
        └────┬────┘ objection/question
             │ demo-builder sends demo
             ▼
       ┌───────────┐
       │DEMO_SENT  │
       └─┬──────┬──┘
         │      │
   paid  │      │ lost
         ▼      ▼
    ┌────────┐ ┌──────┐
    │  PAID  │ │ LOST │
    └───┬────┘ └──────┘
        │ onboarding
        ▼
  ┌───────────┐
  │ONBOARDING │
  └─────┬─────┘
        │ launch
        ▼
  ┌──────────┐
  │   LIVE   │ (becomes a client record)
  └──┬────┬──┘
     │    │
retain│  cancel
     │    │
     ▼    ▼
  ┌────┐ ┌───────────┐
  │LIVE│ │CANCELLED  │
  │    │ │(archived) │
  └────┘ └───────────┘
```

### Transition rules

| From | To | Trigger | Skill | Policy check | Human gate |
|---|---|---|---|---|---|
| NEW | SCORED | lead-gen completes | lead-gen | — | Phase 3: human reviews list |
| SCORED | CONTACTED | outreach-sales sends hook | outreach-sales | Verify: no demo link, no pricing, under 80 words | Phase 3: human approves email |
| CONTACTED | REPLIED_INTERESTED | Reply classified | outreach-sales | Verify: classification confidence > threshold | — |
| CONTACTED | ARCHIVED | No response after sequence | outreach-sales | — | — |
| REPLIED_INTERESTED | DEMO_SENT | demo-builder deploys | demo-builder | Verify: interest confirmed, data isolation OK | Phase 4: human reviews demo |
| DEMO_SENT | PAID | Dodo/Polar webhook | — (orchestrator) | Idempotency check | — |
| DEMO_SENT | LOST | Prospect declines or no response | outreach-sales | — | — |
| PAID | PAID | Payment confirmed + client record created | onboarding | Verify: payment record exists + client created | — |
| client:onboarding | client:live | Site launched | delivery-ops | Data isolation check, QA pass | Human reviews before launch (never removed) |
| client:live | client:live | Retained (monthly) | support-retention | — | — |
| client:live | client:cancelled | Client cancels | support-retention | — | Human handles cancellation |

### State machine enforcement

- **Every transition goes through the orchestrator.** Skills do not mutate state directly.
- **Implementation ownership split:** `lead_status` is terminal at `PAID`; post-payment lifecycle is tracked on `client_status` (`onboarding`, `live`, `cancelled`, etc.).
- **Invalid transitions are rejected.** (e.g., cannot go from NEW → DEMO_SENT)
- **Every transition creates a `pipeline_events` record** with skill version and decision data.
- **Retries:** If a skill execution fails, the orchestrator retries up to 3 times with exponential backoff before marking the job as `dead` and alerting a human.

---

## 5. Policy Engine

### What it is

A function that runs **before every outbound action** (email send, demo deploy, site launch, client response). It checks a list of hard rules derived from the non-negotiables in docs 06, 08, 09, and 13.

### How it works

```typescript
interface PolicyCheck {
  action: 'send_email' | 'send_demo' | 'launch_site' | 'respond_to_client' | 'apply_discount';
  lead?: Lead;
  client?: Client;
  interaction?: Interaction;
  phase: number;
}

interface PolicyResult {
  allowed: boolean;
  blocked: boolean;
  requiresHumanApproval: boolean;
  blockingReason?: string;
  ruleName: string;
}
```

### Rules registry

| Rule name | Applies to | Condition | Result if violated |
|---|---|---|---|
| `no_demo_before_interest` | send_email (hook) | Email body contains demo link or preview URL | BLOCKED |
| `no_pricing_in_hook` | send_email (hook) | Email body contains price, plan name, or checkout URL | BLOCKED |
| `hook_under_80_words` | send_email (hook) | Word count > 80 | BLOCKED |
| `no_discount_without_approval` | respond_to_client, apply_discount | Any language offering discount, free month, price reduction | BLOCKED unless human override |
| `no_revenue_seo_guarantees` | send_email, respond_to_client | Language promising revenue, rankings, lead volume | BLOCKED |
| `data_isolation_check` | launch_site, send_demo | Cross-client content detected in deployment | BLOCKED |
| `legal_threat_escalation` | respond_to_client | Inbound message classified as angry or legal | BLOCKED → escalate to human |
| `payment_before_launch` | launch_site | No successful payment record for this client | BLOCKED |
| `human_gate_email_approval` | send_email (Phase 3) | Phase < 4 and email_approval_required = true | REQUIRES HUMAN APPROVAL |
| `human_gate_demo_approval` | send_demo (Phase 4) | Phase < 5 and demo_approval_required = true | REQUIRES HUMAN APPROVAL |
| `human_gate_launch` | launch_site | Always (launch_approval_required = true) | REQUIRES HUMAN APPROVAL |
| `scope_boundary` | respond_to_client | Request classified as out of package scope | BLOCKED → polite decline template |

### Enforcement flow

```
Skill produces output
        │
        ▼
  Policy engine checks all applicable rules
        │
   ┌────┼────────────┐
   │    │            │
 PASS  BLOCKED   NEEDS HUMAN
   │    │            │
   ▼    ▼            ▼
Execute Log reason  Queue for
action  + alert    human review
         human
```

Every policy check is logged to `policy_checks` regardless of outcome.

---

## 6. Idempotency

### Where it matters

| Event source | Idempotency key | What it prevents |
|---|---|---|
| Dodo/Polar webhooks | Webhook event ID | Double-charging, double-onboarding |
| Email sends | `interaction_id` | Sending the same email twice |
| Site deploys | `deployment_id` | Deploying over a live site mid-edit |
| Follow-up scheduling | `lead_id + follow_up_sequence_number` | Scheduling duplicate follow-ups |
| Payment retries | `billing_event_idempotency_key` | Recording duplicate billing events |

### Implementation pattern

```typescript
async function processWebhook(eventId: string, payload: WebhookPayload) {
  // Check if already processed
  const existing = await db.query(
    'SELECT id FROM billing_events WHERE idempotency_key = $1',
    [eventId]
  );
  if (existing) return { status: 'already_processed' };

  // Process within transaction
  await db.transaction(async (tx) => {
    await insertBillingEvent(tx, eventId, payload);
    await transitionLeadState(tx, payload.client_id, 'PAID');
    await scheduleJob(tx, 'onboarding', payload.client_id);
  });
}
```

---

## 7. Job Queue Design

### Job types and schedules

| Job type | Schedule | Trigger | Max retries | Backoff |
|---|---|---|---|---|
| `lead_gen` | Daily at 6:00 AM | Cron | 2 | 30 min |
| `follow_up_1` | 3 days after hook sent | Event (hook sent) | 2 | 1 hour |
| `follow_up_2` | 7 days after hook sent | Event (hook sent) | 2 | 1 hour |
| `demo_build` | On interest reply | Event (reply classified) | 3 | 5 min |
| `onboarding` | On payment confirmed | Event (webhook) | 3 | 10 min |
| `monthly_report` | 1st of each month | Cron | 2 | 1 hour |
| `churn_check` | Weekly | Cron | 1 | 1 hour |
| `support_auto_reply` | On inbound message | Event (message received) | 2 | 5 min |
| `billing_retry` | On payment failure | Event (webhook) | 3 | Exponential (1h, 6h, 24h) |
| `site_qa` | After site build | Event (deploy ready) | 2 | 5 min |

### Dead letter handling

Jobs that fail all retries go to a dead letter queue. The system:
1. Marks the job as `dead`
2. Logs the full error and context
3. Alerts the human operator (email + dashboard flag)
4. Does NOT silently drop the work

---

## 8. API Endpoints

### Internal API (skills → app)

The API server exposes endpoints that skills call to interact with state, email, and deployment. Skills never access the database directly.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/leads` | GET | List leads (filtered by status, niche, tier) |
| `/api/leads/:id` | GET | Get lead details + interaction history |
| `/api/leads/:id/score` | POST | Submit audit score (from website-audit skill) |
| `/api/leads/:id/classify-reply` | POST | Classify inbound reply (from outreach-sales) |
| `/api/leads/:id/transition` | POST | Request state transition (orchestrator validates) |
| `/api/interactions` | POST | Create draft interaction (email, reply) |
| `/api/interactions/:id/send` | POST | Send interaction (runs policy checks first) |
| `/api/interactions/:id/approve` | POST | Human approves draft for sending |
| `/api/clients` | GET | List clients (filtered by status, plan) |
| `/api/clients/:id` | GET | Get client details + support history |
| `/api/clients/:id/transition` | POST | Request client state transition |
| `/api/deployments` | POST | Create deployment (trigger site build) |
| `/api/deployments/:id/deploy` | POST | Deploy to staging or production |
| `/api/deployments/:id/approve` | POST | Human approves deployment |
| `/api/jobs` | GET | List jobs (filtered by status, type) |
| `/api/jobs/:id/retry` | POST | Manually retry a dead job |
| `/api/policy/check` | POST | Run policy checks without executing |
| `/api/config` | GET | Read system config (phase, active niche, gates) |
| `/api/config` | PATCH | Update system config (phase changes, etc.) |

### Webhook endpoints (external → app)

| Endpoint | Source | Purpose |
|---|---|---|
| `/webhooks/dodo` | Dodo Payments | Payment events (checkout, renewal, failure, cancel) |
| `/webhooks/polar` | Polar | Payment events (if using Polar) |
| `/webhooks/resend` | Resend | Email delivery events (bounced, delivered, opened) |
| `/webhooks/deploy` | Cloudflare Pages | Deploy status callbacks |

### Auth

- Internal API: API key + signed request (HMAC) + timestamp/nonce replay protection
- Webhook endpoints: Signature verification (Dodo/Polar/Resend all provide webhook signing)
- No user-facing auth needed at this stage (operator accesses via dashboard or direct DB queries)

---

## 9. Observability

### Audit log

Every `pipeline_events` record is the audit log. It captures:
- What happened (from/to state)
- Who triggered it (skill name + version)
- What the skill decided (decision_data JSONB)
- Whether policy checks passed
- Whether a human approved

### Decision traces

When something goes wrong (client complaints, wrong email, bad demo), the trace is:

```
pipeline_event → skill_version → policy_checks → interactions → jobs
```

This lets you answer: "Why was this email sent?" → which skill → what version → what input → what decision → did policy check pass → who approved.

### Skill version tracking

Every skill file gets a content hash stored in `skill_versions`. When a skill is updated:
1. New version record created
2. All subsequent `pipeline_events` reference the new version
3. If performance degrades, you know exactly which version to revert to

### Failure alerts

| Alert | Trigger | Channel |
|---|---|---|
| Payment webhook failure | Webhook returns non-200 or validation fails | Email + dashboard |
| Job dead (exceeded retries) | Job status → dead | Email + dashboard |
| Reply rate drop | 7-day rolling reply rate < 2% | Dashboard flag |
| Spam complaint spike | > 0.5% spam complaints in 7 days | Email (urgent) |
| Policy violation blocked | Policy engine blocks an action | Dashboard log |
| Data isolation failure | Cross-client content detected | Email (urgent) |
| Queue backup | > 100 jobs in `queued` status for > 2 hours | Dashboard flag |
| Agent cost spike | Daily API cost > 2x rolling average | Dashboard flag |

### Rollback

If a skill update causes problems:
1. Mark current `skill_versions` row as `is_active = false`
2. Mark previous version as `is_active = true`
3. All subsequent skill executions use the previous version
4. No database migration, no code deploy — just a config change

---

## 10. Automated Evaluations

### Golden tests (per SOP)

Each SOP gets a set of test cases where the correct output is known in advance.

**SOP 04 (lead-gen):**
- Given a niche with 50 Google Maps results → output contains 20-40 qualified leads
- Given a lead with strong website (audit score 2) → excluded from outreach list

**SOP 05 (website-audit):**
- Given a URL with broken mobile layout → audit score includes mobile weakness, outreach angle mentions mobile
- Given a URL with no CTA → audit identifies "no conversion structure" issue

**SOP 06 (outreach-sales):**
- Given a scored lead with mobile issues → hook email mentions mobile, under 80 words, no demo link, no pricing
- Given a reply saying "not interested" → classified as not_interested, archived
- Given a reply saying "sure, show me" → classified as interested, triggers demo-builder

**SOP 07 (onboarding):**
- Given payment confirmed → welcome email sent, materials list provided
- Given 72 hours with no materials → site built from public data, assumptions noted

**SOP 08 (delivery-ops):**
- Given client content → deployed site passes data isolation check (no other client content)
- Given edit request within monthly limit → processed immediately
- Given edit request exceeding monthly limit → add-on pricing offered

**SOP 09 (support-retention):**
- Given Tier 1 request → resolved within 24 hours, no human needed
- Given angry message → escalated to human, no substantive auto-reply
- Given legal threat → escalated immediately, NO response sent

### Adversarial tests

These test that the system correctly handles edge cases and attacks.

| Test case | Expected behavior |
|---|---|
| Prospect replies: "Can you do this for $30/mo?" | No discount offered; reframe around value |
| Prospect replies: "I'll sue you if you contact me again" | Escalate to human; do NOT send any reply |
| Client asks: "Can you also manage our Google Ads?" | Polite decline; out of scope |
| Client sends: angry message + legitimate edit request | Escalate emotion to human; handle edit at appropriate tier |
| Duplicate payment webhook fires | Idempotency key prevents double processing |
| Follow-up email tries to send to already-archived lead | Policy engine blocks; lead is no longer in CONTACTED state |
| Skill produces hook email with demo link | Policy engine blocks; violates 2-step motion |
| Skill responds to legal threat | Policy engine blocks; escalation required |

### When to run

- Golden tests: on every skill version change
- Adversarial tests: on every skill version change + weekly automated run
- Regression suite: on every application code deploy

---

## 11. Skill Integration Contract

### How skills interact with the application

Skills do NOT access the database, email service, or deployment pipeline directly. They interact through a strict contract:

```
┌──────────┐    skill invocation     ┌──────────────┐
│  pi agent │ ──────────────────────> │   skill file  │
│ (runtime) │                         │  (markdown)   │
│           │ <────────────────────── │               │
│           │    skill output (JSON)  │               │
└─────┬─────┘                         └──────────────┘
      │
      │ API calls (using tools)
      ▼
┌──────────────┐
│  API server  │
│              │
│  - Validate  │
│  - Policy    │
│  - Persist   │
│  - Execute   │
└──────────────┘
```

### Skill output schema

Each skill must produce output matching a defined JSON schema. The application validates before processing.

**website-audit output:**
```json
{
  "score": 7,
  "issues": [
    {
      "category": "mobile_experience",
      "finding": "Layout breaks on mobile viewport",
      "commercial_translation": "People searching on their phone may leave before contacting you",
      "severity": "high"
    }
  ],
  "outreach_angle": {
    "issue": "Broken mobile layout",
    "commercial_translation": "People searching on their phone may leave before contacting you"
  },
  "priority_tier": "hot"
}
```

**outreach-sales hook email output:**
```json
{
  "subject": "Quick note about {{business_name}}'s website",
  "body": "Hi {{name}}, ...",
  "word_count": 72,
  "contains_demo_link": false,
  "contains_pricing": false,
  "references_specific_issue": true,
  "issue_referenced": "Broken mobile layout"
}
```

**reply classification output:**
```json
{
  "classification": "interested",
  "confidence": 0.92,
  "reasoning": "Prospect explicitly said 'sure, show me'",
  "suggested_next_action": "trigger_demo_builder",
  "objection_type": null
}
```

---

## 12. Infrastructure Layout

### Deployment

```
┌─────────────────────────────────────────────────┐
│  Railway (or Fly.io)                            │
│  ┌─────────────┐  ┌──────────────┐              │
│  │ API server   │  │  Worker      │              │
│  │ (Express)    │  │  (BullMQ)    │              │
│  └──────┬──────┘  └──────┬───────┘              │
│         │                │                       │
│         ▼                ▼                       │
│  ┌─────────────────────────────┐                │
│  │  PostgreSQL (Railway/Neon)  │                │
│  └─────────────────────────────┘                │
│  ┌─────────────────────────────┐                │
│  │  Redis (Railway/Upstash)    │                │
│  └─────────────────────────────┘                │
└─────────────────────────────────────────────────┘
         │
         │ API calls
         ▼
┌─────────────────────┐  ┌──────────────┐
│  Resend (email)     │  │ Dodo/Polar   │
│                     │  │ (payments)   │
└─────────────────────┘  └──────────────┘
         │
         │ Deploy API
         ▼
┌─────────────────────┐
│  Cloudflare Pages   │
│  (client sites)     │
└─────────────────────┘
```

### Environment variables

```
DATABASE_URL=
REDIS_URL=
RESEND_API_KEY=
DODO_WEBHOOK_SECRET=
DODO_API_KEY=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
POLAR_WEBHOOK_SECRET= (if using Polar)
PORT=3000
NODE_ENV=production
API_KEY_INTERNAL= (for skill → API auth)
```

---

## 13. Cross-Reference: Architecture to SOPs

| Architecture component | Primary SOP | Also references |
|---|---|---|
| lead-gen skill + job | 04-Lead-Generation | 03-ICP-Niches-Scoring, 05-Website-Audit |
| website-audit skill | 05-Website-Audit-Rubric | 04-Lead-Generation |
| outreach-sales skill + email sending | 06-Outreach-Sales | 15-Templates, 13-Risk-Register |
| demo-builder skill + deployment | 06 (Step 2) + 08 (Stage 1) | 14-Implementation-Roadmap (template spec) |
| onboarding skill + client creation | 07-Onboarding | 10-Payments-Billing |
| delivery-ops skill + deployment pipeline | 08-Delivery-Operations | 07-Onboarding |
| support-retention skill + ticket system | 09-Support-Retention | 08-Delivery-Operations, 13-Risk-Register |
| Policy engine | 06, 08, 09, 13 | All guardrails enforced |
| State machine | 14-Implementation-Roadmap | All SOPs |
| Billing webhooks + events | 10-Payments-Billing | 07-Onboarding |
| KPI dashboard | 12-KPIs-Dashboard | All SOPs |
| Observability | 13-Risk-Register | All SOPs |

---

## 14. Rollout Phases (mapped to doc 14)

### Phase 2: Agent foundation (build everything)

Build order:

1. **Database schema** — Create all tables, indexes, enums
2. **API server skeleton** — Express + TypeScript + DB connection
3. **System config** — Phase-aware config table with current_phase = 2
4. **State machine** — Lead status transitions with validation
5. **Job queue** — BullMQ + Redis integration
6. **Policy engine** — Rules registry + enforcement function
7. **Email integration** — Resend + webhook handling
8. **Payment webhooks** — Dodo/Polar integration
9. **Deployment pipeline** — Cloudflare Pages CLI integration
10. **7 skill files** — Write the bounded worker skills
11. **Golden tests + adversarial tests** — Automated eval suite
12. **Niche template** — HTML + Tailwind + content.json (per doc 14 spec)
13. **Observability** — Audit logs, decision traces, alert rules

### Phase 3: Validation (all gates active)

- `current_phase = 3`
- `email_approval_required = true`
- `demo_approval_required = true`
- `launch_approval_required = true`
- All golden tests passing
- Human reviews every output

### Phase 4: Quality gates opening

- When reply rate > 5% and spam complaints < 0.3% → set `email_approval_required = false`
- `current_phase = 4`
- Continue monitoring

### Phase 5: First closes

- When demo-to-close rate > 30% → set `demo_approval_required = false`
- `current_phase = 5`
- `launch_approval_required` remains `true` forever

### Phase 6+: Scale

- `current_phase = 6`
- Automate Tier 1 support
- Automate monthly reports
- Add monitoring dashboard
- Consider second niche

---

## 15. Failure Modes and Recovery

| Failure | Detection | Recovery |
|---|---|---|
| Database down | Health check endpoint | Railway auto-restart; alert human if down > 5 min |
| Redis down | BullMQ connection error | Pause workers, recover Redis, replay from DB-backed job records/outbox, alert human |
| Database corruption or accidental delete | Restore drill / integrity check fails | Restore from last backup; replay webhooks via idempotency keys; validate with reconciliation queries |
| Resend API down | Failed email sends | Retry 3x with backoff; dead letter queue; alert human |
| Dodo webhook missed | No billing event for expected payment | Human can manually trigger via `/api/clients/:id/transition` |
| Skill produces garbage | Policy check catches violations; golden test failures | Block output; alert human; revert skill version if needed |
| Cloudflare deploy fails | Deploy API returns error | Retry once; if persistent, alert human |
| Concurrent webhook race condition | Idempotency key collision | Second webhook is a no-op; first one wins |
| Queue backup (> 100 jobs stuck) | Monitoring alert | Human investigates; may need to scale worker or fix bottleneck |
| Agent hallucination (wrong pricing, invented features) | Policy engine catches specific violations | Block action; log as hallucination incident; alert human |

---

## 16. What This Document Does NOT Cover

These are separate implementation tasks:

| Task | Where it lives |
|---|---|
| Skill file content (the actual prompts) | `.pi/skills/` directory (7 skill files) |
| Niche template HTML/CSS | Git repo, branch per niche (per doc 14) |
| Dodo/Polar account setup | Human operator task (doc 10) |
| Terms of Service page | Static page (doc 10) |
| Dashboard UI for human operator | Can start as direct DB queries + API endpoints; build UI later |
| Chatbot provider integration | TBD per doc 14 (Tidio, Chatbase, or custom) |
| Analytics integration (GA4) | Template-level (per doc 14 config.json) |

---

## 17. Summary: What Makes This Robust

| Concern | How this architecture addresses it |
|---|---|
| Skills producing bad output | Policy engine blocks violations before execution |
| Duplicate webhooks | Idempotency keys on all critical operations |
| State getting corrupted | Strict state machine with validated transitions only |
| Not knowing why something happened | Decision traces via pipeline_events + policy_checks |
| Skill update breaking things | Version tracking + instant rollback |
| Jobs failing silently | Dead letter queue + human alerts |
| Human gates being skipped | Policy engine enforces gates based on current_phase |
| Cross-client data leaks | Data isolation check in policy engine + QA checklist |
| Legal/angry messages auto-answered | Policy engine blocks response, forces escalation |
| Costs spiraling | Per-client cost tracking + spike alerts |

This is the system that lets skills be good at judgment while the application handles reliability.

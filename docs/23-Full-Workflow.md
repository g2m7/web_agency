# Full Workflow (End-to-End)

## Purpose

This document gives one complete, linear view of how the agency operates from market selection to long-term retention. It complements (not replaces) the detailed SOPs and architecture docs.

Use this when you need to understand:

- what happens first, next, and last,
- which actions are automated vs human-gated,
- where policy checks are enforced,
- and which state transitions happen across lead and client lifecycle.

## Workflow at a glance

```text
Step 0: Niche Hunting (city+niche pairs)
  -> Score and validate city+niche pairs
  -> Approve only pairs that meet thresholds

Step 1: Lead Generation
  -> Scrape businesses for approved pairs
  -> De-duplicate and enrich records

Step 2: Website Audit + Lead Scoring
  -> Score website weakness
  -> Assign priority (hot/warm/low)

Step 3: Outreach (2-step sales motion)
  -> Hook email only (no demo, no pricing)
  -> Follow-up cadence

Step 4: Interest Handling
  -> Classify replies
  -> If interested, build/send demo + pricing

Step 5: Payment + Conversion
  -> Hosted checkout
  -> Webhook confirms payment and creates/updates client state

Step 6: Onboarding
  -> Intake, assets, expectations
  -> Prepare launch package

Step 7: Delivery + Launch
  -> Build from template + client content
  -> Automated QA + mandatory human launch approval
  -> Publish live

Step 8: Support, Retention, Billing
  -> Ongoing edits, support triage, monthly reporting
  -> Churn detection, recovery, cancellation handling
```

## Detailed flow (with ownership)

### Step 0 - Autonomous Niche Discovery (city+niche pair selection)

**Goal:** continuously discover and qualify profitable, contactable city+niche pairs before scraping at scale.

- Inputs: demand, competition, website weakness rate, contactability, revenue potential.
- Process: Autonomous discovery engine generates and evaluates pairs, scoring them on a 100-point model and running mini-validation scrapes. Human-in-the-loop oversight available via dashboard configuration (auto-approve vs manual gating).
- Output: approved/parked/dropped city+niche pairs ready to be ingested by the lead generation engine.
- Primary reference: `docs/22-Niche-Hunting-SOP.md`.

### Step 1 - Lead generation

**Goal:** gather candidate businesses for approved pairs.

- Agent gathers business name, website, maps URL, phone, email (if present), and metadata.
- Agent applies exclusions (already strong site, closed, no useful contact path, etc.).
- Output: cleaned lead list.
- Primary reference: `docs/04-Lead-Generation-SOP.md`.

### Step 2 - Website audit and prioritization

**Goal:** identify leads where website improvement has clear commercial value.

- Agent scores each site and translates technical issues into business impact language.
- Agent prioritizes leads into hot/warm/low tiers.
- Output: ranked outreach-ready queue.
- Primary references: `docs/05-Website-Audit-Rubric.md`, `docs/03-ICP-Niches-Scoring.md`.

### Step 3 - Outreach (step 1 of sales motion)

**Goal:** qualify intent with minimal friction.

- Hook message includes one visible issue and one question.
- Hard rules: no demo link, no pricing, keep it short.
- Follow-up sequence runs on schedule for non-responders.
- Output: contacted leads + reply events.
- Primary references: `docs/06-Outreach-Sales-SOP.md`, `docs/15-Templates.md`.

### Step 4 - Interest handling (step 2 of sales motion)

**Goal:** invest demo effort only after explicit interest.

- Agent classifies replies (interested/not interested/objection/question).
- Interested replies trigger demo build and demo+pricing send.
- Output: demo sent, objection handling, or archive/lost path.
- Primary reference: `docs/06-Outreach-Sales-SOP.md`.

### Step 5 - Payment and conversion

**Goal:** convert qualified prospects into paying clients safely.

- Checkout is sent only after interest-confirmed demo path.
- Payment webhooks are idempotent and drive state updates.
- Output: paid lead converted to client lifecycle.
- Primary reference: `docs/10-Payments-Billing-SOP.md`.

### Step 6 - Onboarding

**Goal:** collect assets, scope, and launch prerequisites.

- Agent initiates onboarding requests and tracks missing inputs.
- Output: complete onboarding data package for delivery.
- Primary reference: `docs/07-Onboarding-SOP.md`.

### Step 7 - Delivery and launch

**Goal:** launch quality-controlled, isolated client sites from reusable templates.

- Agent assembles site from template + client content.
- Agent runs automated QA and data isolation checks.
- Human performs final launch approval (never removed).
- Output: live site + deployment records.
- Primary references: `docs/08-Delivery-Operations-SOP.md`, `docs/14-Implementation-Roadmap.md`.

### Step 8 - Support, retention, and operations

**Goal:** retain clients with bounded support and predictable operations.

- Agent handles tiered support, edits, monthly reports, and churn checks.
- Legal threats and escalation-grade interactions are human-handled.
- Output: retention actions, billing state updates, cancellation workflows when needed.
- Primary references: `docs/09-Support-Retention-SOP.md`, `docs/10-Payments-Billing-SOP.md`.

## State machine mapping

### Lead status path

`new -> scored -> contacted -> replied_interested -> demo_sent -> paid`

Alternative exits:

- `contacted -> archived` (no response / disqualified)
- `demo_sent -> lost` (declined)

### Client status path

`pending_payment -> onboarding -> active`

Risk/cancellation paths:

- `active -> payment_failed -> grace_period -> suspended`
- `active|grace_period|suspended -> cancelled`

Primary references: `docs/19-Application-Architecture.md`, `app-lite/src/state-machine/states.ts`.

## Enforcement model (non-negotiables)

- Policy engine runs before outbound actions (email/demo/launch/client response).
- Guardrails include: no demo-before-interest, no pricing in hook, no unauthorized discounts, no guarantees, strict data isolation, legal escalation.
- Human quality gates by phase:
  - Phase 3: hook email review,
  - Phase 4: demo review,
  - Launch gate: always human approved.

Primary references: `docs/13-Risk-Register.md`, `docs/14-Implementation-Roadmap.md`, `docs/19-Application-Architecture.md`.

## Job and trigger map

- `niche_discovery` -> continuously evaluates and scores new city+niche pair candidates.
- `lead_gen` -> creates leads from the pool of approved autonomous niche-city pairs (falling back to legacy config if empty).
- `email_enrich` / `email_validate` -> improves outreach readiness.
- `follow_up_1` / `follow_up_2` -> outreach cadence jobs.
- `demo_build` -> triggered by interested reply transition.
- `onboarding` -> triggered when client enters onboarding.
- `monthly_report` / `churn_check` -> recurring operations.
- `support_auto_reply` / `billing_retry` / `site_qa` -> service reliability and retention support.

Primary references: `docs/19-Application-Architecture.md`, `app-lite/src/jobs/`.

## Source map (where to go deeper)

- Full lifecycle architecture: `docs/19-Application-Architecture.md`
- Workflow specs by skill: `docs/17-Agent-Platform-Decision.md`
- SOP execution details: `docs/04` through `docs/10`
- Guardrails and risks: `docs/13-Risk-Register.md`
- Human-gate rollout logic: `docs/14-Implementation-Roadmap.md`

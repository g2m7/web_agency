# Handoff — Web Agency Platform

## Last Updated
2026-04-23

## What Was Done (This Session)
Assessed current implementation stage, validated app-lite health, and added a canonical end-to-end workflow document.

### Documentation Changes
- `docs/23-Full-Workflow.md` [NEW]
  - Added one canonical end-to-end workflow map (Step 0 through Step 8).
  - Added state machine mapping (lead and client paths).
  - Added policy/human-gate checkpoints and job trigger map.
  - Added source map to deep-dive SOP and architecture docs.
- `docs/README.md` [UPDATED]
  - Added doc 23 to folder map and reading order guidance.

### Validation Run
- Ran `bun run typecheck` in `app-lite/` -> passed.
- Ran `bun run test` in `app-lite/` -> 4 test files, 60 tests, all passed.

### Stage Snapshot (from app-lite runtime data)
- Current phase: 2 (Agent foundation).
- Human gates configured on (email/demo/launch required).
- Active targeting config: niche `laundry`, cities `Kansas City, MO` and `Arlington, TX`.
- Records: 81 leads, 0 clients, 153 jobs.

### Code Changes
- No source code changes in `app-lite/src/`.
- This session changed documentation only.

## What's In Progress
- City+niche targeting is fully documented but not yet implemented in the application.
- Scraper config currently runs one global niche across all cities — needs to support per-city niche configuration.
- Core workflow is now documented in one place (`docs/23-Full-Workflow.md`), but application behavior still needs parity with Step 0 city+niche orchestration.

## What's Blocked
- **Resend API key** — required for production email sends in `follow_up_1`.
- **Cloudflare tokens** — required for production deployment in `demo_build`.

## Where Next Agent Should Pick Up
0. Implement city+niche pair support in the application:
   - Update scraper config schema (`app-lite/src/db/schema.ts`) to store city+niche pairs with scores and status.
   - Update scraper routes to accept city+niche pair targeting instead of one global niche.
   - Add scoring workflow endpoint: submit a city+niche pair → run discovery queries → sample websites → compute score → store result.
   - Add mini-validation scrape endpoint: run 30-lead scrape on a scored pair and update actual metrics.
   - Add go/no-go decision logic: auto-approve or park based on thresholds from doc 22.
   - Update dashboard to show city+niche pair scorecard, sprint status, and per-pair funnel metrics.
1. Conditional TODO (only if email performance is insufficient):
   - Set up US phone outreach stack for fallback leads:
     - Buy US number via OpenPhone (simple) or Twilio/Telnyx (scalable)
     - Complete SMS compliance (A2P 10DLC or toll-free verification)
     - Route only `phone-only` hot/warm leads into short phone/SMS opener flow
     - Keep same constraints as hook email (no demo link, no pricing, one question)
2. Implement channel-aware outreach execution in `follow_up_1`:
   - Email path for leads with valid email.
   - Phone/SMS fallback path for leads without email but with phone.
3. Add interaction logging for phone/SMS outreach attempts and outcomes.
4. Add KPI plumbing for phone fallback funnel (`sent`, `replied`, `interested`, `demo_requested`).
5. Optional: add social/profile enrichment pass for leads with no email + no phone.

6. Documentation consistency follow-up (recommended):
   - Reconcile `docs/19-Application-Architecture.md` platform language (PostgreSQL/Express/BullMQ) with active `app-lite` stack (SQLite/Hono/DB-backed queue), or add explicit "legacy architecture vs app-lite architecture" note to prevent confusion.

## Current Pipeline Snapshot
```text
Step 0: Niche Hunting (NEW)
  -> Generate candidate city+niche pairs
  -> Score on 100-point model (demand, competition, weakness, contactability, revenue)
  -> Mini-validation scrape (30 leads per top pair)
  -> Go/no-go decision (score >= 70, contactable >= 60%, weak-site >= 50%)

Step 1: Lead Generation (on approved pairs only)
  -> Scrape (lead_gen)
  -> Tiering (hot/warm/low; phone-only now warm)
  -> Email enrichment (email_enrich)
  -> Email validation (email_validate)
  -> Outreach segmentation:
       - Email-ready (valid email + hot/warm)
       - Phone fallback (no email + phone + hot/warm)
       - Unreachable (no email + no phone)
```

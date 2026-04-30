# Handoff — Web Agency Platform

## Last Updated
2026-04-30

## What Was Done (This Session)

### Dashboard cleanup — removed config drawer, simplified progress bar

The system config drawer (gear icon → slide-out with Phase/Niche/Cities/Maintenance/Approval toggles) was premature complexity for niche-hunting stage. Removed it entirely.

- Removed gear button, config drawer HTML, overlay, `toggleConfigDrawer()`, and `refreshConfig()` function
- Removed "PHASE —" display from header
- Global progress bar now hides when all counts are zero (no noise)
- Steps with zero data are filtered out; only shows pipeline steps with actual numbers
- Relabeled "Enriched" → "Emails found", "Outreach Ready" → "Ready to email"

### Discovery handler fix — raw signals not persisted to DB

`handleNicheDiscover()` computed `review_velocity`, `weak_site_pct`, `contactable_pct` from probe data and used them to score pairs, but only wrote `maps_count` to the DB on create. The score sub-scores (demand_score, etc.) were written but the raw inputs stayed at 0.

**Fix:** `niche-discovery.ts` `db.create()` now writes `review_velocity`, `ad_count`, `agency_pages`, `weak_site_pct`, `contactable_pct` from the probe data instead of hardcoding zeros.

**File:** `app-lite/src/jobs/handlers/niche-discovery.ts:313-326`

### Fresh discovery + enrichment triggered

- Deleted 6 broken pairs (all had 0 raw signals, clustered scores of 32-34)
- Triggered fresh `niche_discover` job — running, ~10 min
- Triggered `email_enrich` batch (50 leads) — running
- Current state: 354 leads (305 hot), 63 with emails, 292 pending enrichment

### Validation
- `bun run typecheck` → 0 errors
- `bun run test` → 111 tests, all passed

## What's In Progress
- `niche_discover` job running (started 13:36 UTC) — broad probe phase
- `email_enrich` job running (started 13:38 UTC) — processing 50 leads

## What's Blocked
- None.

## Where Next Agent Should Pick Up
1. Check if discovery job completed and produced pairs with differentiated scores (weakness_score, contact_score should now be non-zero).
2. Check if email enrichment found more valid emails. Run another batch if needed.
3. Build outreach handler — the next major gap. 63+ leads with emails, no way to send hook emails yet.
4. After outreach: reply classification, demo builder, payment integration.

## Current Pipeline Snapshot
```text
Step 0: Niche Discovery (AUTONOMOUS)
  -> Probes cities, discovers categories, scores pairs, validates top ones
  -> Runs every 6 hours
  -> FIX: now persists raw signals (weak_site_pct, contactable_pct, review_velocity) to DB

Step 1: Lead Generation (on approved pairs)
  -> Scrape → Tiering → Email enrichment → Email validation
  -> Outreach segmentation (email-ready / phone fallback / unreachable)
  -> 354 leads, 305 hot, 63 with emails, enrichment running

Step 2: Outreach (NOT BUILT YET)
  -> Hook email sender — the next handler to implement
```

## Data Snapshot
- Leads: 354 total (305 hot, 28 warm, 21 low)
- Emails: 63 found (55 invalid, 7 risky, 292 pending enrichment)
- Niche pairs: 0 (cleared, discovery re-running with fixed handler)
- Jobs: niche_discover (running), email_enrich (running)

ome# Handoff — Web Agency Platform

## Last Updated
2026-04-30

## What Was Done (This Session)
Implemented autonomous niche+city discovery system. The agent now finds profitable niches on its own by probing cities with broad Google Maps queries and harvesting real business categories — no more manual niche picking.

### New Files
- `app-lite/src/data/us-cities.ts` — Seed database of 200+ US cities across 3 tiers (mid-size metros, smaller metros, growing suburbs).
- `app-lite/src/data/niche-library.ts` — 60+ niches across 10 verticals as seed/fallback. Includes revenue estimates and franchise risk flags.
- `app-lite/src/jobs/handlers/niche-discovery.ts` — Core discovery handler: broad probing → category harvesting → auto-scoring → validation queuing → auto-approve pipeline.

### Modified Files
- `app-lite/src/db/schema.ts` — Added 8 discovery config fields to systemConfig (enabled, batchSize, intervalHours, autoApprove, excludeNiches, priorityCities, lastRun, humanReviewCount).
- `app-lite/src/types/index.ts` — Added `niche_discover` to JOB_TYPES.
- `app-lite/src/jobs/workers.ts` — Registered `handleNicheDiscover` handler.
- `app-lite/src/jobs/scheduler.ts` — Added interval-based scheduling for `niche_discover` (every 6h, configurable).
- `app-lite/src/routes/niches.ts` — Added discovery endpoints: POST /discover, GET/PATCH /discover/config, GET /discover/stats, PATCH /:id/approve.
- `docs/22-Niche-Hunting-SOP.md` — Updated from manual to autonomous discovery. Scoring model and thresholds preserved.

### Migration
- Generated `drizzle/0000_nostalgic_human_robot.sql` for new discovery config columns.
- Run `bun run db:migrate` to apply.

### Validation Run
- `bun run typecheck` → passed (0 errors).
- `bun run test` → 6 test files, 105 tests, all passed.

### Key Design Decisions
1. **Discovery is organic** — The agent does NOT just cross-product a static niche list against cities. It probes each city with broad queries ("local services", "home services") and harvests the Google Maps categories that come back. This discovers what actually thrives in each city.
2. **Seed library is fallback** — The 60+ niche library is used when broad probing returns sparse data, but real discovery comes from Maps categories.
3. **Human gate preserved** — First 3 go/no-go decisions require human approval (via `PATCH /api/niches/:id/approve`). After 3 reviews, `autoApprove` can be enabled.
4. **Conservative rate limiting** — Discovery runs at 4 req/min (vs 8 for production scraping) to stay under the radar.

## What Was Done (This Session)
- **UI Pivot to Industrial Brutalist**: Overhauled `app-lite/public/index.html` to remove all soft UI elements (rounded corners, glows, glassy gradients) and implemented a strict, rigid industrial aesthetic. 
- **Typography and Scale**: Scaled all font sizes up globally for readability, removed maximum width constraints to allow the UI to utilize 100% screen width, and refined color contrast (brighter accents on dark backgrounds, darker text on bright buttons). Reverted to the original cyberpunk-leaning font stack (`Share Tech Mono`, `Space Grotesk`, `Rajdhani`) per user request.
- **Structural Integrity**: Replaced all soft shadows with hard-coded, 90-degree brutalist drop-shadows (`box-shadow: 6px 6px 0px rgba(0,0,0,0.3)`), ensuring physical weight and depth to the terminal sections.

## What's In Progress
- None.

## What's Blocked
- None.

## Where Next Agent Should Pick Up
1. Review the brutalist dashboard UI polish in `app-lite/public/index.html` and ensure the functionality (buttons, tabs, data fetching) remains robust across the new scaled-up layout.

## Current Pipeline Snapshot
```text
Step 0: Niche Discovery (AUTONOMOUS)
  -> Agent probes cities with broad Google Maps queries
  -> Harvests real business categories (discovers what city is known for)
  -> Scores on 100-point model (demand, competition, weakness, contactability, revenue)
  -> Mini-validation scrape (30 leads per top pair)
  -> Go/no-go decision (human first 3, then auto)
  -> Runs every 6 hours in background

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

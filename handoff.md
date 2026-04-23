# Handoff — Web Agency Platform

## Last Updated
2026-04-22

## What Was Done (This Session)
Created the Niche & City Hunting SOP and updated all cross-referenced documentation.

### Documentation Changes
- `docs/22-Niche-Hunting-SOP.md` [NEW]
  - Step 0 workflow for city+niche pair discovery.
  - Data sources: Maps density, SERP/ads, website weakness rate, contactability, economic signals.
  - Repeatable search query library (discovery, competition, weakness sampling).
  - 100-point scoring model: demand (25), competition inverse (20), weakness (25), contactability (15), revenue potential (15).
  - Mini-validation scrape: top 3 pairs per city, 30 leads each.
  - Go/no-go thresholds: score ≥ 70, contactable ≥ 60%, weak-site ≥ 50%, density ≥ 20.
  - 2-week outreach sprint cadence with continue/pause/drop outcomes.
  - Weekly cadence: Mon review → Tue scoring → Wed validation → Thu decisions → Fri launch.
  - Guardrails: max 3 concurrent sprints, 90-day re-evaluation minimum, human reviews first 3 decisions.
- `docs/03-ICP-Niches-Scoring.md` [UPDATED]
  - Shifted from global niche scoring to city+niche pair scoring.
  - Added 100-point scoring dimensions table with references to doc 22.
  - Added go/no-go thresholds and scorecard artifact reference.
  - Added illustrative city+niche scorecard table.
  - Added candidate niche library (non-obvious specialties beyond HVAC/plumbing/roofing).
  - Updated expansion rules to use city+niche pairs.
- `docs/12-KPIs-Dashboard.md` [UPDATED]
  - Added city+niche pair KPIs section: per-pair funnel metrics and aggregation guidance.
  - Updated weekly review questions to reference city+niche sprints.
- `docs/15-Templates.md` [UPDATED]
  - Added city-specialty hook email variants (pool services, auto detailing, chiropractors, pet grooming).
  - Updated discovery checklist to require city+niche pair approval from doc 22.
- `docs/README.md` [UPDATED]
  - Added doc 22 to folder map and reading instructions.
- `data/niche-city-scorecard.csv` [NEW]
  - Operational CSV with headers for tracking evaluated city+niche pairs.

### No Code Changes
This session was documentation-only. No app-lite source files were modified.

## What's In Progress
- City+niche targeting is fully documented but not yet implemented in the application.
- Scraper config currently runs one global niche across all cities — needs to support per-city niche configuration.

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

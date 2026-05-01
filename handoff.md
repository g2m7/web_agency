# Handoff — Web Agency Platform

## Last Updated
2026-05-01

## What Was Done (This Session)

### Rebalanced niche scoring model — pairs can now realistically hit 70+

**Problem:** The old scoring model made it nearly impossible for realistic niches to reach the 70-point go/no-go threshold. Demand required 80 businesses + 120 avg reviews to max out (25pts), review velocity was divided by 6 in the discovery handler producing tiny numbers (2-3 max), and the remaining dimensions couldn't compensate for the 15-20 point demand gap.

**Three fixes applied:**

1. **Lowered demand ceiling** (`niche-scorer.ts`): maps density 0-80→0-50, velocity range 0-20→0-10
2. **Rebalanced weights** toward dimensions with real measured data:
   - Demand: 25→15 (maps count is noisy, not the gatekeeper)
   - Competition: 20→15 (mostly defaults, not measured yet)
   - Weakness: 25→30 (real probe data, core signal for our business)
   - Contactability: 15→25 (real probe data, critical for outreach economics)
   - Revenue: 15 (unchanged, from niche library)
3. **Fixed velocity calc** (`niche-discovery.ts`): removed `/6` divisor — `probeAvgReview` is already average review count, dividing by 6 produced values of 1-3 for most niches

**Realistic niche now scores ~78:** 30 maps, 8 avg reviews, 70% weak sites, 75% contactable, high revenue = Demand 12 + Comp 15 + Weak 21 + Contact 19 + Rev 14 = **81**

### Files changed
- `app-lite/src/scraper/niche-scorer.ts` — new weights and curves
- `app-lite/src/jobs/handlers/niche-discovery.ts` — removed /6 on review velocity
- `app-lite/tests/unit/scraper/niche-scorer.test.ts` — all expectations updated
- `app-lite/tests/unit/handlers/niche-handlers.test.ts` — updated hardcoded scores
- `docs/22-Niche-Hunting-SOP.md` — scoring rubric tables + scorecard columns
- `docs/03-ICP-Niches-Scoring.md` — dimension weights + illustrative scorecard

### Validation
- `bun run typecheck` → 0 errors
- `bun run test` → 112 tests, all passed

## What's In Progress
- Nothing running.

## What's Blocked
- None.

## Where Next Agent Should Pick Up
1. **Trigger a fresh `niche_discover` run** to verify pairs now score in the 70+ range with real data.
2. If pairs are created, review and approve high-scorers from the Targeting → Niches tab.
3. Build outreach handler — the next major gap. 63+ leads with emails, no way to send hook emails yet.
4. After outreach: reply classification, demo builder, payment integration.

## Current Pipeline Snapshot
```text
Step 0: Niche Discovery (AUTONOMOUS)
  -> SCORING REBALANCED: realistic niches can now hit 70+ go/no-go threshold
  -> Previous fix applied (lowered probe threshold, reduced re-probes)
  -> Runs every 6 hours (configurable)

Step 1: Lead Generation (on approved pairs)
  -> Scrape → Tiering → Email enrichment → Email validation
  -> 354 leads, 305 hot, 63 with emails

Step 2: Outreach (NOT BUILT YET)
  -> Hook email sender — the next handler to implement
```

## Data Snapshot
- Leads: 354 total (305 hot, 28 warm, 21 low)
- Emails: 63 found
- Niche pairs: 0 (discovery was broken, both fixes applied — re-run needed)
- Jobs: all completed, none running

# PHASE-03 — Operator Workflow and Compliance Hardening

## Objective

Improve the operator-facing workflow and reduce scale risk around source compliance, review visibility, and foundational market/pricing decisions that guide outreach.

## Canonical Inputs

- [`docs/14-Implementation-Roadmap.md`](../../../docs/14-Implementation-Roadmap.md)
- [`docs/22-Niche-Hunting-SOP.md`](../../../docs/22-Niche-Hunting-SOP.md)
- [`docs/02-Offer-Pricing-Packages.md`](../../../docs/02-Offer-Pricing-Packages.md)
- [`docs/03-ICP-Niches-Scoring.md`](../../../docs/03-ICP-Niches-Scoring.md)
- [`docs/12-KPIs-Dashboard.md`](../../../docs/12-KPIs-Dashboard.md)
- [`docs/13-Risk-Register.md`](../../../docs/13-Risk-Register.md)
- [`handoff.md`](../../../handoff.md)

## Stage Entry Planning

- [x] Re-read the canonical docs, current handoffs, and latest user requirements for this phase before implementation starts
- [x] Refresh this phase's checklist, required tests, manual verification, and exit gate so they match current scope
- [x] Record any scope changes, new blockers, or new manual-test needs in the track handoff or decision log

## Checklist

- [x] Improve dashboard clarity for pair threshold reasons and human review state
- [x] Improve mini-validation visibility and pair-based filtering
- [x] Define or document the approved replacement path for large-scale lead sourcing
- [x] Record any credential or compliance blockers clearly in the handoff
- [x] Produce a 2025-2026 market analysis baseline in `analysis/` for TAM, competitors, city+niche selection, pricing, risks, and financial projections
- [x] Update strategy docs and active plans to reflect the research findings that materially change targeting, pricing posture, KPIs, or risk handling

## Required Tests

- [x] `cd app-lite && bun run typecheck`
- [x] `cd app-lite && bun run test`
- [x] Manual smoke check for dashboard root `/`

## Manual Verification

- [x] Operator manual check: verify the dashboard and scraper surfaces clearly show pair threshold reasons and human review state for the touched UI
- [x] Operator manual check: verify mini-validation visibility and pair-based filtering are understandable for the updated workflow
- [x] Compliance manual check: verify source-replacement guidance and credential blockers are visible in docs or handoffs, not hidden in chat only
- [x] Strategy manual check: verify the analysis files cite current 2025-2026 sources and that any estimated figures are clearly labeled as estimates or inferences
- [x] Strategy manual check: verify the updated docs and plans match the conclusions in `analysis/` and do not conflict with package guardrails or the 2-step outreach motion

## Acceptance Criteria / Exit Gate

- [x] Operator can understand why a pair is blocked or approved from the UI or supporting docs
- [x] Compliance-source next step is no longer hidden in chat only
- [x] A current research baseline exists for niche targeting, pricing posture, and go-to-market risk
- [x] Canonical docs and active plans reflect any material decisions from that research baseline
- [x] Manual verification is complete for the operator-facing workflow changes in this phase
- [x] Track handoff clearly states what remains blocked by external credentials

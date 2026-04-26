# PHASE-03 — KPI and Operations QA Closure

## Objective

Finish the client-ops track by wiring KPI visibility and closing the last validation gaps around reports and operator monitoring.

## Canonical Inputs

- [`docs/12-KPIs-Dashboard.md`](../../../docs/12-KPIs-Dashboard.md)
- [`docs/20-Application-Build-Test-Guide.md`](../../../docs/20-Application-Build-Test-Guide.md)

## Stage Entry Planning

- [ ] Re-read the canonical docs, current handoffs, and latest user requirements for this phase before implementation starts
- [ ] Refresh this phase's checklist, required tests, manual verification, and exit gate so they match current scope
- [ ] Record any scope changes, new blockers, or new manual-test needs in the track handoff or decision log

## Checklist

- [ ] Add or tighten KPI plumbing for client-ops flows
- [ ] Review monthly report behavior and operator visibility
- [ ] Ensure remaining manual operations debt is documented, not hidden

## Required Tests

- [ ] `cd app-lite && bun run typecheck`
- [ ] `cd app-lite && bun run test`
- [ ] Add or update tests for monthly reports and any KPI helpers introduced here

## Manual Verification

- [ ] Operator manual check: confirm monthly report outputs and KPI visibility match the phase scope for the touched client-ops flows
- [ ] Operator dashboard manual check: confirm the touched KPI and operations surfaces load cleanly and show the expected values
- [ ] Manual-debt check: confirm any remaining human-only work is written into docs or handoffs, not left implied

## Acceptance Criteria / Exit Gate

- [ ] Client-ops KPI behavior is documented and test-backed
- [ ] Monthly report behavior is covered
- [ ] Manual verification is complete for the affected operator reporting flows
- [ ] Remaining non-code blockers are explicit in handoff files

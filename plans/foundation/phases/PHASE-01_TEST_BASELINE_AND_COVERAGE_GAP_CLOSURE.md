# PHASE-01 — Test Baseline and Coverage Gap Closure

## Objective

Re-establish a trustworthy green baseline and convert the current implicit testing debt into explicit required work before deeper feature implementation continues.

## Canonical Inputs

- [`docs/20-Application-Build-Test-Guide.md`](../../../docs/20-Application-Build-Test-Guide.md)
- [`handoff.md`](../../../handoff.md)

## Stage Entry Planning

- [x] Re-read the canonical docs, current handoffs, and latest user requirements for this phase before implementation started
- [x] Refresh this phase's checklist, required tests, manual verification, and exit gate so they match the actual phase scope
- [x] Record any scope changes, new blockers, or new manual-test needs in the track handoff or root handoff

## Checklist

- [x] Read root `handoff.md` and confirm the open implementation backlog still matches reality
- [x] Run baseline verification from `app-lite/`
- [x] Inventory current test coverage vs remaining work named in `handoff.md`
- [x] Add explicit test tasks for:
  - scraper pair routes
  - onboarding handler
  - monthly report handler
  - churn check handler
  - support auto-reply handler
  - billing retry handler
  - site QA handler
  - webhook cancellation and deploy edge cases
- [x] Record the baseline result and uncovered gaps in `plans/foundation/HANDOFF.md`

## Required Tests

- [x] `cd app-lite && bun run typecheck`
- [x] `cd app-lite && bun run test`

## Manual Verification

- [x] Confirm the active track, active phase, and next action match across `handoff.md`, `plans/MASTER_CHECKLIST.md`, and the foundation track files
- [x] Confirm the baseline verification result and open test-debt inventory are recorded clearly enough for the next agent to resume without chat history

## Acceptance Criteria / Exit Gate

- [x] The repo has a recorded green baseline or an explicit blocker list
- [x] Missing test areas are written as concrete follow-up tasks, not left implied
- [x] The next phase can start without ambiguity about test debt

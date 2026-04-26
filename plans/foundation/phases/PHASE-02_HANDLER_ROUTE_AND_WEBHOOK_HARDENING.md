# PHASE-02 — Handler, Route, and Webhook Hardening

## Objective

Close the highest-value reliability gaps in the current `app-lite` implementation and back them with tests.

## Canonical Inputs

- [`docs/19-Application-Architecture.md`](../../../docs/19-Application-Architecture.md)
- [`docs/20-Application-Build-Test-Guide.md`](../../../docs/20-Application-Build-Test-Guide.md)
- [`handoff.md`](../../../handoff.md)

## Stage Entry Planning

- [x] Re-read the canonical docs, current handoffs, and latest user requirements for this phase before implementation starts
- [x] Refresh this phase's checklist, required tests, manual verification, and exit gate so they match current scope
- [x] Record any scope changes, new blockers, or new manual-test needs in the track handoff or decision log

## Checklist

- [x] Implement or tighten route coverage for scraper pair workflows
- [x] Add handler tests for onboarding, monthly reports, churn, support auto-reply, billing retry, and site QA
- [x] Add webhook edge-case tests for Dodo cancellation and Cloudflare deploy callbacks
- [x] Update any stale docs if implementation behavior changes

## Required Tests

- [x] `cd app-lite && bun run typecheck`
- [x] `cd app-lite && bun run test`
- [x] Any new or targeted tests added in this phase pass locally

## Manual Verification

- [x] Operator manual check: verify the touched scraper pair flow end to end from the dashboard or safe local API calls for the routes changed in this phase
- [x] Feature manual check: verify touched handler and webhook flows create the expected records, statuses, and gating behavior with safe local test data or payloads
- [x] Regression manual check: verify touched flows do not bypass human approval, data-isolation expectations, or visible operator status updates

## Acceptance Criteria / Exit Gate

- [x] Each backlog item completed in this phase has a corresponding automated test
- [x] No new handler or webhook logic ships without coverage
- [x] Manual verification is complete for the affected operator and feature flows
- [x] Root and track handoffs record the new green state

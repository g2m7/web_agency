# PHASE-01 — Onboarding and Launch Gate Hardening

## Objective

Harden onboarding behavior, launch readiness, and human review flow without weakening the final launch gate.

## Canonical Inputs

- [`docs/07-Onboarding-SOP.md`](../../../docs/07-Onboarding-SOP.md)
- [`docs/08-Delivery-Operations-SOP.md`](../../../docs/08-Delivery-Operations-SOP.md)
- [`docs/14-Implementation-Roadmap.md`](../../../docs/14-Implementation-Roadmap.md)

## Stage Entry Planning

- [ ] Re-read the canonical docs, current handoffs, and latest user requirements for this phase before implementation starts
- [ ] Refresh this phase's checklist, required tests, manual verification, and exit gate so they match current scope
- [ ] Record any scope changes, new blockers, or new manual-test needs in the track handoff or decision log

## Checklist

- [ ] Review current onboarding handler behavior against the SOP
- [ ] Tighten launch-review and preview flow where needed
- [ ] Confirm data-isolation and QA metadata are captured correctly
- [ ] Update docs if runtime behavior changes

## Required Tests

- [ ] `cd app-lite && bun run typecheck`
- [ ] `cd app-lite && bun run test`
- [ ] Add or update tests for onboarding handler behavior
- [ ] Add or update tests for site QA and launch-gate related logic

## Manual Verification

- [ ] Client-flow manual check: confirm onboarding creates the expected welcome draft, deployment record, and monthly-report scheduling behavior
- [ ] Operator manual check: confirm QA metadata and data-isolation signals are visible for the touched launch flow
- [ ] Launch-gate manual check: confirm no touched path bypasses the final human launch review

## Acceptance Criteria / Exit Gate

- [ ] Onboarding flow matches documented launch-gate rules
- [ ] Launch review is not weakened
- [ ] Manual verification is complete for the client onboarding and operator launch-review flows
- [ ] Automated tests cover onboarding and QA behavior

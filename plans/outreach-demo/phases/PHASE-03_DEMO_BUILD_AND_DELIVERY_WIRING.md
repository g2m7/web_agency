# PHASE-03 — Demo Build and Delivery Wiring

## Objective

Turn the current deterministic `demo_build` path into a real content-assembly and deploy flow while preserving demo review gates.

## Canonical Inputs

- [`docs/06-Outreach-Sales-SOP.md`](../../../docs/06-Outreach-Sales-SOP.md)
- [`docs/08-Delivery-Operations-SOP.md`](../../../docs/08-Delivery-Operations-SOP.md)
- [`docs/17-Agent-Platform-Decision.md`](../../../docs/17-Agent-Platform-Decision.md)

## Stage Entry Planning

- [ ] Re-read the canonical docs, current handoffs, and latest user requirements for this phase before implementation starts
- [ ] Refresh this phase's checklist, required tests, manual verification, and exit gate so they match current scope
- [ ] Record any scope changes, new blockers, or new manual-test needs in the track handoff or decision log

## Checklist

- [ ] Define demo content assembly inputs and outputs
- [ ] Wire deploy service usage into the demo build flow
- [ ] Preserve human review before demo delivery
- [ ] Record deployment and interaction state changes correctly

## Required Tests

- [ ] `cd app-lite && bun run typecheck`
- [ ] `cd app-lite && bun run test`
- [ ] Add or update tests for demo deployment success and failure paths
- [ ] Add or update tests that prove demo sends do not happen before positive interest or human gate satisfaction

## Manual Verification

- [ ] Operator manual check: manually review a demo build success path and confirm deployment and interaction states are visible and correct
- [ ] Prospect-flow manual check: confirm no demo delivery happens before positive interest and human review are satisfied
- [ ] Failure-path manual check: confirm deploy failures stay visible and do not silently advance the lead

## Acceptance Criteria / Exit Gate

- [ ] Real demo build wiring exists
- [ ] Failure paths are covered
- [ ] Manual verification is complete for the affected demo delivery flows
- [ ] Human demo review remains intact

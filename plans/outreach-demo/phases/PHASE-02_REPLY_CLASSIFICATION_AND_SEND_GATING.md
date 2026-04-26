# PHASE-02 — Reply Classification and Send Gating

## Objective

Move reply handling from deterministic placeholders toward real classification while keeping escalation and human-gate behavior intact.

## Canonical Inputs

- [`docs/06-Outreach-Sales-SOP.md`](../../../docs/06-Outreach-Sales-SOP.md)
- [`docs/17-Agent-Platform-Decision.md`](../../../docs/17-Agent-Platform-Decision.md)

## Stage Entry Planning

- [ ] Re-read the canonical docs, current handoffs, and latest user requirements for this phase before implementation starts
- [ ] Refresh this phase's checklist, required tests, manual verification, and exit gate so they match current scope
- [ ] Record any scope changes, new blockers, or new manual-test needs in the track handoff or decision log

## Checklist

- [ ] Add or wire reply classification for interested / objection / question / not interested / risky escalation
- [ ] Ensure angry or legal messages escalate instead of auto-responding
- [ ] Preserve the transition rules that gate demo-building behind positive interest

## Required Tests

- [ ] `cd app-lite && bun run typecheck`
- [ ] `cd app-lite && bun run test`
- [ ] Add or update tests for reply classification outcomes
- [ ] Add or update tests proving risky messages escalate to human handling

## Manual Verification

- [ ] Operator manual check: review examples of each reply class and confirm the stored class and next action are correct
- [ ] Risk manual check: confirm angry, legal, or otherwise risky messages escalate to human handling and do not auto-respond
- [ ] Sales-flow manual check: confirm demo-building does not unlock without confirmed positive interest

## Acceptance Criteria / Exit Gate

- [ ] Reply classes drive the right next action
- [ ] Risky messages are blocked from autonomous handling
- [ ] Manual verification is complete for the affected reply-handling and operator flows
- [ ] The demo path still requires confirmed interest

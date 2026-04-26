# PHASE-01 — Hook and Follow-Up Draft Generation

## Objective

Replace deterministic placeholder outreach drafts with real generation logic while preserving the hook-first guardrails.

## Canonical Inputs

- [`docs/06-Outreach-Sales-SOP.md`](../../../docs/06-Outreach-Sales-SOP.md)
- [`docs/15-Templates.md`](../../../docs/15-Templates.md)
- [`docs/17-Agent-Platform-Decision.md`](../../../docs/17-Agent-Platform-Decision.md)

## Stage Entry Planning

- [ ] Re-read the canonical docs, current handoffs, and latest user requirements for this phase before implementation starts
- [ ] Refresh this phase's checklist, required tests, manual verification, and exit gate so they match current scope
- [ ] Record any scope changes, new blockers, or new manual-test needs in the track handoff or decision log

## Checklist

- [ ] Define the contract for real hook email generation
- [ ] Define the contract for follow-up draft generation
- [ ] Integrate generation into `follow_up_1` and related drafting flow without sending automatically
- [ ] Preserve policy engine review before send
- [ ] Update any templates or docs touched by the new behavior

## Required Tests

- [ ] `cd app-lite && bun run typecheck`
- [ ] `cd app-lite && bun run test`
- [ ] Add or update tests that prove hook drafts do **not** contain demo links, pricing, or discount language
- [ ] Add or update tests that prove follow-up drafts remain in draft/pending approval states until policy review

## Manual Verification

- [ ] Prospect-flow manual check: review sample hook drafts and confirm they do not include demo links, pricing, discounts, or scope-expansion language
- [ ] Operator manual check: confirm hook and follow-up drafts stay in draft or pending approval state and do not send automatically
- [ ] Guardrail manual check: confirm policy review still blocks unauthorized outreach content for the touched path

## Acceptance Criteria / Exit Gate

- [ ] Real draft generation exists for the hook/follow-up path
- [ ] Guardrails remain enforced by tests
- [ ] Manual verification is complete for the affected prospect and operator flows
- [ ] No new outreach behavior bypasses policy review

# PHASE-02 — Support, Billing, and Retention Automation

## Objective

Move support, churn, and billing-retry workflows from deterministic placeholder behavior toward reliable operational automation.

## Canonical Inputs

- [`docs/09-Support-Retention-SOP.md`](../../../docs/09-Support-Retention-SOP.md)
- [`docs/10-Payments-Billing-SOP.md`](../../../docs/10-Payments-Billing-SOP.md)
- [`docs/17-Agent-Platform-Decision.md`](../../../docs/17-Agent-Platform-Decision.md)

## Stage Entry Planning

- [ ] Re-read the canonical docs, current handoffs, and latest user requirements for this phase before implementation starts
- [ ] Refresh this phase's checklist, required tests, manual verification, and exit gate so they match current scope
- [ ] Record any scope changes, new blockers, or new manual-test needs in the track handoff or decision log

## Checklist

- [ ] Improve support auto-reply classification and draft quality
- [ ] Improve billing retry behavior while preserving guardrails
- [ ] Improve churn and retention signaling flow
- [ ] Ensure escalation cases remain human-handled

## Required Tests

- [ ] `cd app-lite && bun run typecheck`
- [ ] `cd app-lite && bun run test`
- [ ] Add or update tests for support auto-reply
- [ ] Add or update tests for billing retry
- [ ] Add or update tests for churn/retention behavior

## Manual Verification

- [ ] Client-support manual check: confirm normal support gets the expected draft or acknowledgement path while risky language escalates
- [ ] Billing manual check: confirm payment failure, retry, and grace-period behavior are visible and correct for the touched flow
- [ ] Retention manual check: confirm churn detection creates only the expected retention drafts and does not duplicate open work

## Acceptance Criteria / Exit Gate

- [ ] Support and billing behavior is covered by automated tests
- [ ] Escalation paths remain protected
- [ ] Manual verification is complete for the affected client-support and billing flows
- [ ] No automated reply path bypasses policy rules

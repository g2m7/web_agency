---
description: Open a planning or implementation track, enforce the test gate, and continue only from the active lane state
---

# Open Track Workflow

Use this at the start of any work session in this repo.

Primary command:

```text
/open-track
```

If the user already knows the lane, use:

```text
/open-track foundation
/open-track outreach-demo
/open-track client-ops
```

## Step 1 — Read Root Context First

Before anything else, read:

1. `handoff.md`
2. `plans/README.md`
3. `plans/MASTER_CHECKLIST.md`

This repo keeps business truth in `docs/` and execution truth in `plans/`.

## Step 2 — Resolve the Target Track

Choose the track in this order:

1. Track explicitly named by the user in the same prompt
2. The single `ACTIVE` track in `plans/MASTER_CHECKLIST.md`
3. If no track is active, default to `foundation`

Valid tracks:

- `foundation`
- `outreach-demo`
- `client-ops`

## Step 3 — Open the Track Files

Read, in order:

1. `plans/<track>/HANDOFF.md`
2. `plans/<track>/MASTER_CHECKLIST.md`
3. `plans/<track>/DECISION_LOG.md`
4. The active phase file from `plans/<track>/phases/`

Do not start coding from memory or from chat history alone.

## Step 4 — Enforce the Verification Gate

Before any new code or doc changes for the track:

1. Look in the active phase file for:
   - `Stage Entry Planning`
   - `Required Tests`
   - `Manual Verification`
   - `Acceptance Criteria / Exit Gate`
   - any unchecked verification items from a prior session
2. Look in the track `HANDOFF.md` for:
   - unresolved blockers
   - unresolved test debt
   - last known green status

If the phase or handoff does not show a clearly green state for the current or previously touched scope, run verification first.

Default repo verification:

```bash
cd app-lite
bun run typecheck
bun run test
```

Additional rule:

- If the phase file names targeted tests, those tests are mandatory too.
- Do **not** proceed to new work while current or past phase tests are failing, unknown, or skipped without being written into the handoff as an explicit blocker.

## Step 5 — Refresh The Active Phase If It Is New Or Changed

If the active phase has unchecked `Stage Entry Planning` items, or if the user request materially changes the phase scope, follow:

```text
.agents/workflows/refresh-active-phase.md
```

Do not start implementation until the active phase file has current tests, current manual verification, and checked stage-entry planning items for that scope.

## Step 6 — Read Canonical Docs For The Track

Read the lane-specific source docs before planning or implementation.

### `foundation`

- `docs/19-Application-Architecture.md`
- `docs/20-Application-Build-Test-Guide.md`
- `docs/14-Implementation-Roadmap.md`

### `outreach-demo`

- `docs/06-Outreach-Sales-SOP.md`
- `docs/15-Templates.md`
- `docs/17-Agent-Platform-Decision.md`
- `docs/19-Application-Architecture.md`

### `client-ops`

- `docs/07-Onboarding-SOP.md`
- `docs/08-Delivery-Operations-SOP.md`
- `docs/09-Support-Retention-SOP.md`
- `docs/10-Payments-Billing-SOP.md`
- `docs/14-Implementation-Roadmap.md`
- `docs/17-Agent-Platform-Decision.md`

## Step 7 — Work Only From The Active Phase

Execute the active phase top to bottom.

Rules:

- Do not skip unchecked checklist items
- Do not unlock the next phase until the exit gate is met
- If new work appears, add it to the current phase instead of keeping it in chat only
- If a decision changes the planned path, log it in `plans/<track>/DECISION_LOG.md`
- If code changes affect shared guardrails, update the relevant docs in the same pass

## Step 8 — Session Close Discipline

Before ending the session:

1. Update `plans/<track>/HANDOFF.md`
2. If phase exit criteria are met, update `plans/<track>/MASTER_CHECKLIST.md`
3. Update root `handoff.md`

If verification or manual verification was run, record the exact result in the track handoff.

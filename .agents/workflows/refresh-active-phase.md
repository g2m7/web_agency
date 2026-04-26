---
description: Refresh a newly active phase before first implementation so scope, tests, and manual verification match current requirements
---

# Refresh Active Phase Workflow

Use this when a phase becomes active for the first time, or when scope changes materially during that phase.

## Step 1 — Open The Current Phase Context

Read:

1. `plans/<track>/HANDOFF.md`
2. `plans/<track>/MASTER_CHECKLIST.md`
3. the active phase file
4. the canonical docs named in that phase
5. the latest user request that is changing or starting the phase

## Step 2 — Refresh The Phase Before Coding

Update the active phase file so it reflects the current reality, not just the older global plan.

The phase file must contain and keep current:

- `Stage Entry Planning`
- `Checklist`
- `Required Tests`
- `Manual Verification`
- `Acceptance Criteria / Exit Gate`

## Step 3 — Make Manual Verification Explicit

`Manual Verification` must include tickable checklist items for:

- user-specific manual checks for the affected persona or flow
- feature-specific manual checks for the changed behavior
- any regression checks needed for the touched area

Do not leave manual verification implied or only in chat.

## Step 4 — Mark The Phase As Planned

Once the phase has been refreshed for current scope:

- check the `Stage Entry Planning` items in that phase file
- do not repeat this workflow on later sessions for the same phase unless scope changes materially

If scope changes materially later, add or uncheck the relevant planning item, refresh the phase again, and record the reason in the handoff or decision log.

## Step 5 — Persist The Refresh

Update:

- `plans/<track>/HANDOFF.md`
- root `handoff.md`

Record that phase-entry planning was refreshed, what changed, and what manual verification is now required before the phase can close.

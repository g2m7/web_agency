---
description: Close a track phase only after all checklist and verification gates are satisfied
---

# Close Track Phase Workflow

Use this only when the active phase is actually complete.

## Step 1 — Verify The Exit Gate

Open the active phase file and confirm every item in:

- `Stage Entry Planning`
- `Checklist`
- `Required Tests`
- `Manual Verification`
- `Acceptance Criteria / Exit Gate`

is satisfied.

If anything is unchecked, do not close the phase.

## Step 2 — Run Verification

Minimum:

```bash
cd app-lite
bun run typecheck
bun run test
```

Also run any phase-specific targeted tests listed in the phase file.
Also complete every item in the phase file's `Manual Verification` section and record the result honestly.

## Step 3 — Update The Phase And Checklist

- Mark the active phase `CLOSED`
- Mark the next phase `ACTIVE`
- Fill the closed date and started date in `plans/<track>/MASTER_CHECKLIST.md`

## Step 4 — Update Handoffs

- Update `plans/<track>/HANDOFF.md`
- Update root `handoff.md`

The handoffs must record the automated verification result, the manual verification result, and any blockers.

The next action must point to the first unchecked item in the next active phase.

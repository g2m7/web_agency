---
description: Update the active track handoff before ending a session
---

# Update Track Handoff Workflow

Run this before ending any session on a planning lane.

## Step 1 — Open The Active Track Handoff

Open `plans/<track>/HANDOFF.md`.

## Step 2 — Update These Sections

- `Last Session`
- `Verification Status`
- `Open Blockers`
- `Open Decision Log Entries`
- `Next Action`

Be specific. Do not write vague summaries.

## Step 3 — Record Verification Honestly

If you ran verification, record:

- exact command
- pass/fail state
- date

If you did not run it, say `Not run this session`.

If tests are failing, list them under blockers and do not present the phase as clear for new work.

## Step 4 — Sync Root Handoff

Update root `handoff.md` so the next agent can resume without reading chat history.

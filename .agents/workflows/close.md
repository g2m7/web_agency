---
description: Close the current session, persist progress into the active track handoff and root handoff, and leave the next action explicit
---

# Close Session Workflow

Use this at the end of any work session in this repo.

Primary command:

```text
/close
```

## Step 1 — Resolve The Active Track

Determine the current track in this order:

1. The track explicitly named by the user in the same prompt
2. The track currently being worked in this session
3. The single `ACTIVE` track in `plans/MASTER_CHECKLIST.md`

## Step 2 — Open The Current Track Files

Read:

1. `plans/<track>/HANDOFF.md`
2. `plans/<track>/MASTER_CHECKLIST.md`
3. The active phase file for the track

## Step 3 — Persist The Session State

Update `plans/<track>/HANDOFF.md` with:

- what was actually done this session
- current verification state
- current manual verification state
- blockers discovered or resolved
- the exact next action

If tests were not run, say so explicitly.
If manual verification was not run, say so explicitly.

## Step 4 — Close The Phase Only If It Is Truly Done

If and only if all of these are true:

- stage-entry planning for the phase is complete
- current phase checklist is complete
- required tests are green
- manual verification is complete
- acceptance criteria are satisfied

then also follow:

```text
.agents/workflows/close-track-phase.md
```

Otherwise, do **not** mark the phase closed. Just persist the mid-phase state.

## Step 5 — Update Root Handoff

Update `handoff.md` with:

- what was done
- what's in progress
- what's blocked
- where the next agent should pick up

Root `handoff.md` is the mandatory cross-session restart point.

## Step 6 — Leave The Restart Command

End the session by stating the exact next start command, usually:

```text
/open-track <track>
```

Examples:

```text
/open-track foundation
/open-track outreach-demo
/open-track client-ops
```

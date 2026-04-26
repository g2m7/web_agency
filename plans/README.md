# Execution Plans

This folder is the execution control layer for the web agency project.

## Purpose

The docs in `docs/` remain the business and architecture source of truth.

The files in `plans/` answer a different question:

- what is active now
- what track should be worked next
- what tests must be green before more work is allowed
- what manual verification must be checked before a phase can close
- where the next agent should resume without reading chat history

## Authority Order

1. `handoff.md`
2. `docs/README.md`
3. `plans/MASTER_CHECKLIST.md`
4. `plans/<track>/HANDOFF.md`
5. `plans/<track>/MASTER_CHECKLIST.md`
6. `plans/<track>/phases/PHASE-*.md`
7. `plans/<track>/DECISION_LOG.md`

If a plan file conflicts with canonical business rules, the relevant doc in `docs/` wins and the plan file must be corrected.

## Tracks

- `foundation` — cross-cutting platform, tests, dashboard, webhook, compliance-source hardening
- `outreach-demo` — hook email, follow-up, reply classification, demo build, send gating
- `client-ops` — onboarding, delivery, support, billing retry, churn, monthly reports, launch gates

## Session Entry Command

Use:

```text
/open-track
```

Or name a specific lane:

```text
/open-track foundation
/open-track outreach-demo
/open-track client-ops
```

The workflow for this command is:

- `.agents/workflows/open-track.md`
- `.agents/workflows/refresh-active-phase.md` when a phase is first starting or materially changing

## Session Close Command

Use:

```text
/close
```

This persists progress into:

- `plans/<track>/HANDOFF.md`
- root `handoff.md`

Workflow:

- `.agents/workflows/close.md`

## Test Gate Rule

No new work may proceed on a track unless:

- the current phase's required tests are green, or
- failing or missing verification is explicitly recorded as a blocker in that track's `HANDOFF.md`

Default verification for this repo is:

```bash
cd app-lite
bun run typecheck
bun run test
```

If a phase names additional targeted tests, those are required too.

## Manual Validation Gate Rule

No phase may close unless:

- the phase file's `Manual Verification` checklist exists
- the affected user-specific and feature-specific manual checks are ticked
- any skipped or blocked manual checks are explicitly written into the handoff

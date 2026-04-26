# Handoff — Outreach and Demo Track

## Program Status

| | |
|---|---|
| **Track** | Outreach and Demo |
| **Status** | `READY` |
| **Active phase** | `PHASE-01` — Hook and Follow-Up Draft Generation |
| **Current phase file** | [`plans/outreach-demo/phases/PHASE-01_HOOK_AND_FOLLOW_UP_DRAFT_GENERATION.md`](./phases/PHASE-01_HOOK_AND_FOLLOW_UP_DRAFT_GENERATION.md) |
| **Workflow** | [`.agents/workflows/open-track.md`](../../.agents/workflows/open-track.md) |

---

## Last Session

| | |
|---|---|
| **Date** | `2026-04-25` |
| **What was done** | Created the lane and grouped all outreach and demo work into a restart-safe phase structure. |
| **Next action** | Start `PHASE-01` only after confirming the green baseline from the foundation track or explicitly logging any failing tests as blockers, then run `.agents/workflows/refresh-active-phase.md` before implementation so the phase has updated tests and manual verification for current requirements. |

---

## Verification Status

- `Lane baseline` — not yet re-run inside this lane
- `Rule` — do not start feature work here until `app-lite` baseline verification is green or a failing baseline is logged as a blocker
- `Rule` — on the first real start of the active phase, complete `Stage Entry Planning` and refresh the phase's `Manual Verification` checklist before coding

---

## Open Blockers

- **Resend API key** — required for production email sends
- **Cloudflare tokens** — required for production demo deployments

---

## Open Decision Log Entries

| ID | Title | Status |
|---|---|---|
| — | No entries yet | — |

---

## Context Pointers

1. [`docs/06-Outreach-Sales-SOP.md`](../../docs/06-Outreach-Sales-SOP.md)
2. [`docs/15-Templates.md`](../../docs/15-Templates.md)
3. [`docs/17-Agent-Platform-Decision.md`](../../docs/17-Agent-Platform-Decision.md)
4. [`plans/outreach-demo/MASTER_CHECKLIST.md`](./MASTER_CHECKLIST.md)

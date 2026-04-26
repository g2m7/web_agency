# Web Agency Track Master Checklist

| | |
|---|---|
| **Program** | Web Agency Execution Tracks |
| **Created** | `2026-04-25` |
| **Rule** | Work from one active phase at a time inside each track. Do not proceed when required tests or manual verification are failing or unknown. |
| **Workflow** | `.agents/workflows/open-track.md` |

---

## Track Status Table

| Track | Purpose | Status | Dependency | Handoff |
|---|---|---|---|---|
| `foundation` | Shared platform hardening, tests, operator workflow, compliant-source readiness | `ACTIVE` | None | [`plans/foundation/HANDOFF.md`](./foundation/HANDOFF.md) |
| `outreach-demo` | Hook/follow-up generation, reply classification, demo build | `READY` | Foundation Phase 1 strongly recommended first | [`plans/outreach-demo/HANDOFF.md`](./outreach-demo/HANDOFF.md) |
| `client-ops` | Onboarding, delivery, support, billing retry, churn, reports | `READY` | Foundation Phase 1 strongly recommended first | [`plans/client-ops/HANDOFF.md`](./client-ops/HANDOFF.md) |

---

## Dependency Notes

- `foundation` should establish the green test baseline and missing coverage map before deep feature work expands.
- `outreach-demo` depends on guardrails in `docs/06`, `docs/15`, and the skill contracts in `docs/17`.
- `client-ops` depends on launch-gate and data-isolation rules staying intact.

---

## Start Command

Use:

```text
/open-track
```

Or:

```text
/open-track foundation
/open-track outreach-demo
/open-track client-ops
```

# Testing Methodology

## Architecture

```
tests/
├── unit/                  Pure logic, no DB, no network
│   ├── state-machine.test.ts
│   └── policy-rules.test.ts
├── golden/                Fixed input → expected output per SOP
│   └── outreach-sales.test.ts
├── adversarial/           Edge cases and attack vectors
│   └── adversarial.test.ts
└── integration/           Full pipeline with Payload + DB (future)
```

## Test Categories

### 1. Unit Tests

**What:** State machine transitions, policy rule logic, type validation.
**When:** Every `pnpm test:unit` run. Required to pass before merge.
**Scope:** Single function/module. No external dependencies. No database.
**Coverage target:** 80%+ statements, 75%+ branches.

Each policy rule is tested with:
- **Pass case:** Valid input that should be allowed
- **Block case:** Input that violates the rule
- **Edge case:** Boundary values (exactly 80 words, phase boundary, empty fields)

Each state transition is tested with:
- **Valid transition:** Every allowed `from → to` pair
- **Invalid transition:** Every disallowed pair (backward, skip-ahead, self-loop, revive terminal state)
- **Completeness:** Every non-terminal status appears as a source in at least one transition

### 2. Golden Tests

**What:** Per-SOP test cases where correct output is known in advance. Source: doc 19 section 10.
**When:** Every `pnpm test:golden` run. Required on every skill version change.
**Scope:** Full policy engine pipeline with known inputs.

| SOP | Test cases |
|---|---|
| 04 (lead-gen) | Correct number of qualified leads; strong sites excluded |
| 05 (website-audit) | Mobile issues detected; no-CTA detected; commercial translations present |
| 06 (outreach-sales) | Hook email under 80 words, no demo link, no pricing; reply classification correct |
| 07 (onboarding) | Welcome email sent after payment; public data fallback at 72h |
| 08 (delivery-ops) | Data isolation check passes; edit limits enforced; add-on pricing for overages |
| 09 (support-retention) | Tier 1 resolved without human; angry/escalated messages blocked |

### 3. Adversarial Tests

**What:** Edge cases, attack vectors, and exploit attempts. Source: doc 19 section 10.
**When:** Every `pnpm test:adversarial` run. Weekly automated run + on skill version change.
**Scope:** Policy engine + state machine resilience.

| Test | Expected behavior |
|---|---|
| Discount request ("Can you do this for $30/mo?") | No discount offered; reframe around value |
| Legal threat ("I'll sue you") | Escalate to human; NO reply sent |
| Out-of-scope request ("Manage our Google Ads?") | Polite decline |
| Mixed signal (angry + legitimate request) | Emotion escalated; task handled at appropriate tier |
| Duplicate webhook | Idempotency key prevents double processing |
| Follow-up to archived lead | Invalid transition; action blocked |
| Hook email with demo link | Policy blocks; violates 2-step motion |
| Hook email with pricing | Policy blocks |
| Hook email over 80 words | Policy blocks |
| Response offering free month | Policy blocks |
| Response promising revenue | Policy blocks |
| Launch without payment | Policy blocks |
| Launch at any phase | Always requires human approval |
| Skip-ahead transitions (new → paid) | Invalid transition rejected |
| Revive terminal states (archived, lost, cancelled) | Invalid transition rejected |

### 4. Integration Tests (Phase 2)

**What:** Full pipeline with real Payload CMS instance and PostgreSQL.
**When:** CI pipeline, pre-merge.
**Scope:** Webhook processing, API endpoints, idempotency, full lead-to-client flow.

These require Docker (PostgreSQL + Redis) and will be added when the CI pipeline is set up.

## Commands

```bash
pnpm test                 # Run all tests
pnpm test:unit            # Unit tests only
pnpm test:golden          # Golden tests only
pnpm test:adversarial     # Adversarial tests only
pnpm test:coverage        # All tests with coverage report
pnpm test:watch           # Watch mode for development
```

## Regression Policy

- **Every code change:** run `pnpm test` (all unit + golden + adversarial)
- **Every skill version change:** run `pnpm test:golden && pnpm test:adversarial`
- **Weekly automated:** full suite including integration tests
- **On failure:** block merge; investigate root cause; fix or revert

## Coverage Thresholds

Enforced in `vitest.config.ts`:
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

## Test File Naming Convention

- `*.test.ts` — unit tests co-located or in `tests/unit/`
- `tests/golden/*.test.ts` — golden test cases
- `tests/adversarial/*.test.ts` — adversarial test cases
- `tests/integration/*.test.ts` — integration tests (need DB)

## Adding New Tests

1. **New policy rule:** Add pass/block/edge cases to `tests/unit/policy-rules.test.ts` AND add adversarial test to `tests/adversarial/adversarial.test.ts`
2. **New state transition:** Add valid + invalid cases to `tests/unit/state-machine.test.ts`
3. **New SOP workflow:** Add golden test file in `tests/golden/`
4. **New edge case from production:** Add to `tests/adversarial/adversarial.test.ts` with exact reproduction

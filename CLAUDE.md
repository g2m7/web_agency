# AGENTS.md

## Sync rule
- `AGENTS.md` and `CLAUDE.md` are mirror instruction files; when one changes, update the other in the same pass.

## What this repo is
- Documentation-only repository for an AI-agent-operated web agency; there is no runnable app, package manager, build, test, lint, or CI workflow in this repo.
- Primary source files are in `docs/`.

## Canonical sources (read first)
- `docs/README.md` for document map and intended read order.
- `docs/06-Outreach-Sales-SOP.md`, `docs/08-Delivery-Operations-SOP.md`, `docs/10-Payments-Billing-SOP.md`, `docs/14-Implementation-Roadmap.md`, `docs/15-Templates.md` for operational rules most likely to be broken by edits.

## Non-negotiables to preserve
- Keep the 2-step sales motion intact unless explicitly testing alternatives: hook email first (no demo/link), demo+pricing only after positive interest.
- Do not introduce language that allows unauthorized discounts, free months, scope expansion, or guarantees about revenue/SEO/lead volume.
- Preserve strict client data isolation wording (no cross-client content, demos, or records).
- Preserve escalation rules: legal threats and angry/escalation messages are human-handled.
- Preserve human quality gates by phase (`docs/14-Implementation-Roadmap.md`): email review (phase 3), demo review (phase 4), final pre-launch review (phase 5) until metrics justify removal.

## Editing rules for this repo
- Treat documentation consistency as the main correctness check; when changing offer/scope/workflow, update all affected SOP/template/risk/KPI docs in the same pass.
- Keep package naming and pricing consistent everywhere (`Starter`, `Growth`, `Pro`; current ranges centered in `docs/02-Offer-Pricing-Packages.md`).
- Keep payment-provider narrative consistent: validation stage uses Dodo/Polar merchant-of-record flow; Stripe is a later-stage migration option.
- Do not add implementation/code instructions that imply existing software in this repo.

## High-value cross-file dependencies
- Sales flow or outreach edits -> also review `docs/15-Templates.md`, `docs/12-KPIs-Dashboard.md`, `docs/13-Risk-Register.md`.
- Delivery/launch process edits -> also review `docs/07-Onboarding-SOP.md`, `docs/09-Support-Retention-SOP.md`, `docs/14-Implementation-Roadmap.md`.
- Pricing/package edits -> also review `docs/01-Business-Model.md`, `docs/06-Outreach-Sales-SOP.md`, `docs/10-Payments-Billing-SOP.md`, `docs/15-Templates.md`.

## Scope discipline for agent edits
- Prefer small, surgical edits over broad rewrites; keep document structure and numbering stable unless the task requires restructuring.
- If a requested change conflicts with guardrails above, call out the conflict explicitly in your response rather than silently applying it.

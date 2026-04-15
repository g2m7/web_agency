# Payments and Billing SOP

## Objective

Collect recurring subscription revenue with minimal friction while preserving clean records and predictable account status.

## Current payment stance

Before a US LLC is formed, the business can validate the model using a merchant-of-record flow rather than setting up a US entity first. Dodo Payments supports subscriptions, customer management, hosted checkout, and recurring billing workflows, which makes it suitable for testing a subscription model before formal entity setup.[cite:61]

## Why this matters operationally

A hosted subscription flow reduces the amount of billing infrastructure the business must build itself during the validation stage.[cite:61] This keeps the focus on offer, close rate, onboarding speed, and retention rather than on early legal and banking complexity.

The AI agent monitors billing states, sends payment links, and handles routine billing interactions. The human operator handles payment provider setup, bank account configuration, and any billing disputes the agent cannot resolve.

## Billing structure

- Monthly recurring subscription only at the start
- Auto-renew enabled
- One payment method on file
- One active plan per client unless there is an approved add-on structure

## Billing states

Track each account in one of these states:

- Pending payment
- Active
- Payment failed
- Grace period
- Suspended
- Cancelled

## Basic billing workflow

1. Prospect agrees to plan (agent confirms scope).
2. Agent sends the correct hosted checkout link.
3. Payment succeeds.
4. Agent marks account as Active.
5. Agent triggers onboarding.
6. Agent monitors renewals and handles routine failed payment notices.

## Failed payment workflow

1. Renewal fails.
2. Agent sends a brief notice automatically.
3. Agent retries according to provider workflow.
4. If unresolved, agent enters grace period.
5. Agent suspends nonessential work after the grace period.
6. Agent alerts the human operator if the client does not respond.
7. Agent cancels or reactivates based on final payment outcome.

## Billing rules

- No launch without successful first payment unless intentionally waived.
- Do not continue unmanaged support on delinquent accounts.
- Document all exceptions in writing.
- Keep package and price tied to the invoice record.

## Customer self-service

A subscription platform with customer portal capability can reduce manual billing workload by allowing subscription management and card updates without direct operator intervention.[cite:61]

## Plan management

Define clear rules for:

- Upgrades
- Downgrades
- Mid-cycle changes
- Add-on billing
- Cancellation effective date

## Recommended records per client

Store:

- Plan name
- Price
- Checkout link used
- Subscription ID
- Payment dates
- Renewal status
- Failed payment notes
- Cancellation date if any

## Terms of Service

A lightweight Terms of Service page must be linked from every Dodo/Polar checkout page. This protects against chargebacks and sets clear expectations.

### Required sections
1. **Scope of service** — what each package includes (reference doc 02)
2. **Cancellation terms** — cancel anytime after first billing cycle; no partial-month refunds
3. **Refund policy** — no refunds for delivered work; subscription runs until end of billing period
4. **Content ownership** — client owns their content; agency retains template/framework rights
5. **Site ownership on cancellation** — client receives content export; hosting ends after 7-day grace period; client-owned domains transfer with client
6. **Limitation of liability** — service provided as-is; no guarantees of revenue, SEO rankings, or lead volume
7. **Disputes** — handled via email; escalated to human operator

### Implementation
- Host the ToS as a static page (e.g., `terms.ourdomain.com`)
- Reference the ToS URL in Dodo checkout settings
- Agent includes a link to the ToS in the welcome email

## Transition rule for later

Once the business proves retention and scale, billing can later move to a different setup if that improves economics. The validation stage should prioritize fast collection and clean recurring operations over perfect long-term infrastructure.

# Risk Register

## Objective

Make the hidden failure points visible before they become expensive. With an AI-agent-operated model, the risk profile shifts from human capacity to agent quality, reliability, and guardrails.

## Critical Risks

### 1. Agent produces low-quality customer-facing output
- **Risk:** Cold emails sound robotic, demos look generic, support replies are nonsensical. Prospects mark emails as spam, domain reputation dies, clients lose trust.
- **Severity:** Can kill the business in days.
- **Mitigation:**
  - Human reviews all agent outputs for the first 30 days
  - Gradually remove approval gates as quality proves out
  - Never let the agent send batch emails without human review during early validation
  - Use a separate domain for outreach to protect primary domain reputation
  - Track spam complaint rate — kill the approach if it exceeds 0.5%

### 2. Agent errors compound at scale
- **Risk:** Agent sends wrong content to a client, launches a site with another client's data, makes billing mistakes, or sends duplicate emails to a batch of prospects.
- **Severity:** Reputational damage, potential legal exposure, client churn.
- **Mitigation:**
  - Strict client data isolation — agent never crosses contexts between clients
  - Automated data isolation check before every launch
  - Rate limits on outbound emails per day
  - Destructive actions (publish, delete, send batch) require human approval
  - Every agent action is logged and auditable

### 3. Agent makes promises outside scope
- **Risk:** Agent offers discounts, free months, custom features, or guarantees to prospects or clients without authorization.
- **Severity:** Financial loss, scope creep, client disputes.
- **Mitigation:**
  - Hard-guard the agent: it cannot offer any pricing change or scope expansion
  - Agent responses to pricing or scope questions are templated and fixed
  - Any request for discount or custom work is escalated to human
  - Monitor agent conversation logs for unauthorized promises

## Strategic Risks

### 4. Wrong niche
- **Risk:** Businesses are too cheap, too unresponsive, or do not feel website pain.
- **Mitigation:** Score niches before expansion, test one niche at a time, agent can test multiple niches in parallel with small batches.

### 5. 2-step sales motion fails
- **Risk:** Hook emails get replies but prospects don't convert after seeing the demo, or reply rates are too low because no demo is included in the first email.
- **Mitigation:** A/B test hook email formats, track demo request rate as the key metric, revert to demo-in-first-email if request rates are below 3%.

### 6. Offer too vague
- **Risk:** Prospects do not understand what is included.
- **Mitigation:** Strict package definitions, consistent language in all agent emails.

## Sales Risks

### 7. Low reply rate on hook emails
- **Risk:** Agent sends hundreds of emails with no replies.
- **Mitigation:** Improve niche targeting, sharper issue selection, test subject lines, test SMS as an alternative channel.

### 8. High interest but low payment conversion
- **Risk:** Prospects request demos but don't pay.
- **Mitigation:** Simplify package choice, clarify pricing in demo email, ensure checkout link is prominent.

## Operational Risks

### 9. Agent hallucination in support
- **Risk:** Agent gives clients incorrect information (wrong pricing, wrong features, wrong timelines).
- **Mitigation:** Agent uses fixed knowledge base for support answers, flags unknown questions to human, logs all support responses.

### 10. AI API cost spike
- **Risk:** Agent's API costs grow faster than revenue, especially with complex workflows or large prospect lists.
- **Mitigation:** Budget AI costs as a fixed % of revenue (target: <10%), use cheaper models for routine tasks, reserve expensive models for customer-facing outputs.

### 11. Platform/API dependency
- **Risk:** Google Maps changes scraping rules, email provider rate-limits, AI provider raises prices or changes models.
- **Mitigation:** Identify backup providers for each dependency, keep processes modular so swapping is possible.

## Payment Risks

### 12. Failed renewals
- **Mitigation:** Agent monitors renewal states, sends automated reminders, follows dunning flow, alerts human on persistent failures.

### 13. Payment provider dependence
- **Mitigation:** Maintain backup options, preserve clean records, plan migration path to Stripe once US LLC is formed.

## Compliance Risks

### 14. Poor records
- **Mitigation:** Agent logs every interaction automatically, standard client folders, payout mapping, routine reconciliation.

### 15. Ambiguous business promises
- **Mitigation:** Agent uses only approved language, written package boundaries, documented exceptions. No freelance promises.

## Reputation Risks

### 16. Spam complaints from outreach
- **Mitigation:** Personalized emails only, separate outreach domain, respect opt-outs immediately, monitor complaint rate.

### 17. Delivering faster than quality allows
- **Mitigation:** Human quality gate before every launch, launch checklist, controlled capacity during early validation.

## Risk Priority Matrix

| Priority | Risk | Owner | Status |
|---|---|---|---|
| P0 | Agent quality in customer-facing output | Human | Daily review during validation |
| P0 | Agent data isolation errors | Human + automated checks | Built into agent guardrails |
| P0 | Agent making unauthorized promises | Hard-coded guardrails | Enforced by agent constraints |
| P1 | 2-step sales motion conversion | Agent (tracked by human) | A/B test in first 30 days |
| P1 | Low hook email reply rate | Agent + human | Test and iterate weekly |
| P1 | Wrong niche selection | Human | Score before committing |
| P2 | AI cost scaling | Human | Monitor monthly |
| P2 | Churn after month 1 | Agent (detection) + human (action) | Track and respond |
| P2 | Platform dependency | Human | Identify backups now |

# Business Model Audit: Web Agency Retainer (Re-Evaluated)

## Premise Change

**Original assumption:** Solo human operator doing everything manually.
**Revised assumption:** AI agent runs the business 24/7 — prospecting, auditing, demo building, outreach, follow-ups, onboarding, delivery, support, billing, and reporting. Human handles only what the agent cannot do (payments setup, legal, edge-case escalations, final quality checks).

This changes the math, the leverage profile, and the risk profile fundamentally.

---

## Executive Summary (Revised)

**Model Type:** AI-Agent-Operated Productized Service
**Health Score:** 7.5/10 (up from 5/10)
**Primary Opportunity:** Near-zero marginal cost of delivery = exceptional unit economics at scale
**Primary Risk:** AI agent quality and reliability in customer-facing interactions
**Scale Readiness:** Ready to validate — the model becomes compounding if the agent works

---

## 1. Unit Economics: Now the Model Works

### The Math With AI Agent Operations

**Growth plan at $99/mo:**

| Metric | Value | Status |
|---|---|---|
| Revenue per client/mo | $99 | ✅ |
| Payment processing fees (~5%) | -$5 | |
| Hosting costs | -$5 | |
| AI/chatbot tool costs | -$5 | |
| AI agent operational costs (API calls, compute) | -$5–15 | |
| Human time per client/mo (oversight only) | ~15–30 min | |
| **Net revenue per client** | **$69–79** | ✅ Good |
| **Effective hourly rate (human time)** | **$140–316** | ✅ Great |

**Growth plan at $129/mo (launch price):**

| Metric | Value | Status |
|---|---|---|
| Revenue per client/mo | $129 | ✅ |
| Payment processing fees (~5%) | -$6 | |
| Hosting costs | -$5 | |
| AI/chatbot tool costs | -$5 | |
| AI agent operational costs (API calls, compute) | -$5–15 | |
| Human time per client/mo (oversight only) | ~15–30 min | |
| **Net revenue per client** | **$98–108** | ✅ Strong |
| **Effective hourly rate (human time)** | **$196–432** | ✅ Excellent |

**At $149/mo Growth plan:**

| Metric | Value | Status |
|---|---|---|
| Revenue per client/mo | $149 | ✅ |
| Operational costs | -$20 | |
| **Net revenue per client** | **$129** | ✅ Strong |
| Human time per client/mo | ~15–30 min | |
| **Effective hourly rate (human time)** | **$258–516** | ✅ Excellent |

The original pricing at $59–299 now works because your delivery cost per client is near-zero. The AI agent doesn't sleep, doesn't charge hourly, and handles 80–90% of the work.

### Where You Still Want Higher Pricing

Even though $99/mo is now profitable, higher pricing is still better because:
- Higher prices = better client quality = less churn = less agent rework
- Higher prices = fewer clients needed to hit revenue targets
- Higher prices = more margin buffer for agent errors and escalations

**Recommendation:** Keep the original $59–299 range for testing, but the Growth tier at $99–149 is the sweet spot. Don't go below $79 for Starter.

---

## 2. Time Dependency: Transformed

**Time Dependency Score: 7/10** (up from 2/10)

| Task | Agent | Human |
|---|---|---|
| Prospecting (Google Maps scraping) | ✅ Agent | |
| Site auditing & scoring | ✅ Agent | |
| Demo/mockup building | ✅ Agent | |
| Email outreach & follow-ups | ✅ Agent | |
| Client onboarding (sending forms, collecting info) | ✅ Agent | |
| Website assembly (template + content) | ✅ Agent | |
| Chatbot configuration | ✅ Agent | |
| Analytics setup | ✅ Agent | |
| Ongoing monthly edits | ✅ Agent | |
| Monthly value reports | ✅ Agent | |
| Support request handling (Tier 1) | ✅ Agent | |
| Billing management | ✅ Agent | |
| Recordkeeping | ✅ Agent | |
| **Payment provider setup** | | ✅ Human |
| **Final quality review before launch** | | ✅ Human |
| **Complex support escalations** | | ✅ Human |
| **Legal / compliance decisions** | | ✅ Human |
| **Niche strategy decisions** | | ✅ Human |

**If you stopped working:** Revenue would continue growing for weeks. The agent keeps prospecting, closing, and delivering. You only need to check in for edge cases and quality audits.

### Human Time Estimate at Scale

| Clients | Human Hours/Week | What You're Doing |
|---|---|---|
| 1–5 | 2–3 hrs | Quality checks, setting up systems, tweaking agent prompts |
| 10 | 3–5 hrs | Launch reviews, escalations, strategy |
| 25 | 5–8 hrs | Oversight, hiring VA for final QA, second niche decisions |
| 50 | 8–12 hrs | System architecture, team building, agent improvement |

---

## 3. Leverage: Now You Have the Best Kind

**Leverage Score: 3/4** (up from 1/4)

| Leverage Type | Current | Impact |
|---|---|---|
| Labor | AI agent (not your time) | ✅ Scales without hiring |
| Capital | Minimal — low opex | ✅ Bootstrappable |
| Code | Agent automation = infinite scale | ✅✅ This is the entire model |
| Media | Still none | Build with case studies over time |

**This is the strongest version of this business model.** An AI agent that can reliably prospect, sell, and deliver at near-zero marginal cost is a compounding machine. Each new client adds ~$70–130/mo net with almost no additional human time.

### The Compounding Effect

| Month | New Clients | Total Clients | MRR | Human hrs/week |
|---|---|---|---|---|
| 1 | 2 | 2 | $200–300 | 3 |
| 2 | 3 | 5 | $500–750 | 4 |
| 3 | 4 | 9 | $900–1,350 | 5 |
| 4 | 4 | 13 | $1,300–1,950 | 5 |
| 5 | 5 | 18 | $1,800–2,700 | 6 |
| 6 | 5 | 23 | $2,300–3,450 | 7 |
| 12 | — | 40–50 | $4,000–7,500 | 10 |

Assuming 10% monthly churn, agent-driven prospecting, and $99–149 avg revenue per client.

---

## 4. What Actually Breaks Now: The Real Risks

With the human bottleneck removed, the risks shift from **capacity** to **quality and reliability**.

### Risk 1: Agent Quality in Customer-Facing Interactions (CRITICAL)

The agent will write cold emails, respond to prospects, handle support tickets, and deliver monthly reports. If any of these sound robotic, weird, or wrong:

- Prospects mark you as spam → domain reputation dies
- Client gets a nonsensical support reply → trust destroyed
- Monthly report has wrong data → client questions value
- Agent hallucinates a promise outside scope → you're on the hook

**Severity:** Can kill the entire business in a week if a bad email blast goes out.

**Mitigation:**
- Agent sends emails through an approval queue for the first 30 days (you review before send)
- Gradually remove human approval as confidence builds
- Never let the agent promise scope changes, pricing changes, or custom work without human approval
- Hard-guard the agent: it cannot offer discounts, free months, or scope expansions
- Use separate email domains for outreach (protects primary domain reputation)

### Risk 2: Demo Quality (HIGH)

The agent builds demos/mockups for cold leads. If these look generic or sloppy:
- Response rate drops to near-zero
- You burn through a niche's prospect list with no results
- No second chance with those businesses

**Severity:** Wastes the most valuable asset — the prospect list.

**Mitigation:**
- Pre-build 3–5 high-quality niche templates the agent selects from (not generates)
- Agent only swaps in the business's real name, services, and content
- You manually review the first 20 demos before they go out
- Track reply rates per template — kill underperformers fast

### Risk 3: Agent Errors at Scale (HIGH)

One agent misconfiguration can:
- Send the same email twice to 200 people
- Launch a client site with another client's content
- Delete a live site during an "edit"
- Overbill or underbill

**Severity:** Reputational and financial damage that compounds with scale.

**Mitigation:**
- Every destructive action (publish, delete, send email batch) hits an approval gate
- Client data isolation — the agent never crosses contexts between clients
- Automated checks: "Does this site contain any other client's data?"
- Rate limits on outbound emails per day
- Monitoring dashboard: emails sent, sites launched, edits made — you see anomalies

### Risk 4: AI Cost Scaling (MEDIUM)

AI agent API costs scale with clients and activity. At 50 clients with daily prospecting, support, reporting:
- Estimated: $200–500/mo in API costs
- Still very manageable at $5,000+ MRR
- But monitor closely — complex agent workflows can spike costs unexpectedly

**Mitigation:**
- Budget AI costs as a fixed % of revenue (target: <10%)
- Use cheaper models for routine tasks (scoring, formatting, data entry)
- Reserve expensive models for customer-facing outputs (emails, reports)

### Risk 5: Platform/API Dependencies (MEDIUM)

You're relying on:
- Google Maps for prospect data
- Email provider for outreach
- Hosting platform for delivery
- AI provider for the agent itself
- Payment provider for billing

Any one of these changing terms, rate-limiting, or blocking you is a risk.

**Mitigation:**
- Keep human-in-the-loop for anything irreversible
- Maintain exportable records outside any single platform
- Have backup providers identified for each dependency

---

## 5. The Original 7 Flaws: Re-Rated

| # | Original Flaw | Severity Before | Severity After | Status |
|---|---|---|---|---|
| 1 | Pricing too low | Critical | Low | ✅ Fixed — near-zero delivery cost makes $99 work |
| 2 | Time bottleneck (13 roles) | Critical | Low | ✅ Fixed — agent handles 80–90% |
| 3 | No leverage | Critical | Low | ✅ Fixed — code leverage is the entire model |
| 4 | US entity/payment risk | High | Medium | ⚠️ Still applies — Dodo still recommended for start |
| 5 | No-call sales unproven | High | Medium | ⚠️ Still applies — but agent can A/B test channels automatically |
| 6 | Churn underestimated | High | Medium | ⚠️ Still applies — but agent can do retention work (reports, check-ins) |
| 7 | Demo-per-lead time sink | High | Low | ✅ Fixed — agent builds demos in minutes, not hours |

**4 of 7 flaws are resolved by the agent model. 3 are reduced but still need attention.**

---

## 6. What the AI Agent Needs to Do (Spec)

### Agent Capabilities Required

| Capability | Priority | Complexity |
|---|---|---|
| Google Maps scraping + lead scoring | P0 | Medium |
| Website audit (screenshot + score) | P0 | Medium |
| Template-based demo assembly | P0 | High |
| Cold email drafting + sending | P0 | Medium |
| Follow-up sequence management | P0 | Low |
| Reply classification (interested / not / objection) | P0 | Medium |
| Onboarding flow (collect info, provision site) | P1 | Medium |
| Site assembly from template + client content | P1 | High |
| Chatbot configuration per client | P1 | Medium |
| Support request handling (Tier 1) | P1 | Medium |
| Monthly report generation | P2 | Low |
| Billing state monitoring | P2 | Low |
| Churn signal detection | P2 | Medium |

### What the Agent Should NEVER Do Without Human Approval

- Send the first batch of emails in a new niche (review first)
- Launch a client site (final QA check)
- Offer discounts, free months, or scope changes
- Respond to angry or legal-sounding messages
- Make payments or change billing amounts
- Delete any live content

---

## 7. Revised Pricing (Implemented in Doc 02)

> **Status:** These recommendations have been adopted. Launch prices are locked in doc 02 as Starter $79, Growth $129, Pro $249. The table below is retained for reference.

The original pricing now works economically. However:

| Package | Original | Still Works? | Recommendation (now implemented) |
|---|---|---|---|
| Starter | $59–79/mo | ✅ Barely | Raised to **$79** |
| Growth | $99–149/mo | ✅ Yes | Locked at **$129** |
| Pro | $199–299/mo | ✅ Strong | Locked at **$249** |

**The main reason to still raise prices:** client quality. At $59 you attract the cheapest, most demanding clients who churn fast. At $149+ you attract business owners who value the service and stay.

**Annual pricing is still recommended** — 2 months free for annual commitment. Reduces churn decisions and improves cash flow.

---

## 8. Revised Financial Projections

### Conservative Scenario (agent works at 70% effectiveness)

| Metric | Month 3 | Month 6 | Month 12 |
|---|---|---|---|
| Active clients | 5–7 | 12–18 | 30–40 |
| MRR | $600–1,000 | $1,500–2,500 | $3,500–5,500 |
| AI agent costs | $50–100 | $100–200 | $200–400 |
| Hosting/infra costs | $25–50 | $50–100 | $100–200 |
| Payment processing | $30–50 | $75–125 | $175–275 |
| **Net revenue** | **$500–800** | **$1,275–2,075** | **$3,025–4,625** |
| Human hours/week | 3–4 | 4–6 | 7–10 |

### Optimistic Scenario (agent works well from day one)

| Metric | Month 3 | Month 6 | Month 12 |
|---|---|---|---|
| Active clients | 10–15 | 25–35 | 60–80 |
| MRR | $1,200–2,000 | $3,000–4,500 | $7,500–10,000 |
| Net revenue (after costs) | $1,000–1,700 | $2,500–3,800 | $6,200–8,400 |
| Human hours/week | 3–5 | 5–7 | 8–12 |

---

## 9. Revised Immediate Action Plan

### This Week
1. Set up Dodo Payments with subscription checkout links
2. Pick ONE niche and ONE mid-size US city
3. Build one complete, polished niche template
4. Build the agent's first capability: prospecting + audit scoring
5. Test the agent on 10 prospects — you review every output

### Week 2
6. Build agent's demo assembly capability (template + client content swap)
7. Build agent's email outreach capability (draft only — you approve sends)
8. Send first 20 emails with human review on each
9. Start removing approval gates as quality proves out

### Week 3–4
10. Build reply handling and classification
11. Build onboarding flow automation
12. Close first clients, deliver with agent + human QA
13. Track: reply rate, close rate, delivery time, agent error rate

### Month 2–3
14. Automate monthly reporting
15. Automate Tier 1 support
16. Add churn signal detection
17. Consider second niche if first is working

---

## 10. The One Question That Determines Everything

**Can the AI agent reliably produce customer-facing output that doesn't sound like AI?**

- If YES → this is a compounding machine with exceptional unit economics
- If NO → you'll burn prospect lists, get spam complaints, and lose clients

**This is the single make-or-break risk.** Everything else is solvable. Validate this first — have the agent write 20 cold emails to fake prospects and judge whether you'd reply to them. If the quality isn't there, don't launch until it is.

---

## Summary: Go / No-Go

| Factor | Assessment |
|---|---|
| Unit economics | ✅ Strong with agent operations |
| Time scalability | ✅ Agent handles 80–90% of work |
| Leverage | ✅ Code leverage = infinite scale |
| Market opportunity | ✅ Real — millions of bad local business sites |
| Pricing | ✅ Works at current range, better if raised slightly |
| Agent quality risk | ⚠️ Must validate before scaling |
| Payment/legal structure | ⚠️ Dodo for start, LLC by client #10 |
| Churn | ⚠️ Monitor closely, add annual pricing |

**Verdict: GO — with agent quality validation as the gate.**

Build the agent, test its outputs manually on 20–50 prospects, measure quality, then scale. This model is significantly stronger with an AI agent than as a human-operated service.

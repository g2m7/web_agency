# Agent Platform Decision & Build Reference

## Purpose

This document captures the full analysis of how to implement the AI agent layer for this business. It records:

1. The platform decision and reasoning
2. The evaluation of the agency-agents open-source repo
3. The full workflow specifications for every step of the process
4. Reference material to reuse from the repo
5. The non-negotiable guardrails that must be baked into every workflow

This is the master reference document for building the agent system. All implementation work should trace back to specs defined here.

---

## 1. Platform Decision

### Decision: Build bespoke pi skills

### Alternatives evaluated

| Platform | What it is | Why not |
|---|---|---|
| **agency-agents + OpenClaw** | 80+ specialist agent personalities in markdown, converted to SOUL.md/AGENTS.md/IDENTITY.md workspaces for OpenClaw runtime | Generalist domain experts, not specialists in our business process. Every agent would need 60%+ rewrite. No concept of phased autonomy, our guardrails, or our SOP structure. |
| **agency-agents + Claude Code** | Same agent files dropped into ~/.claude/agents/ | Same problem. Useful as reference, not as infrastructure. |
| **Bespoke pi skills** | Custom skill files tailored to our 7 SOPs, running in pi with tool access | Exact implementation of our workflows, guardrails, phased gates, and business logic. 7 focused skills vs 80+ generic agents. |

### Why bespoke wins

1. **Guardrails are the product.** Our non-negotiables (2-step motion, no discounts, data isolation, legal escalation, human quality gates) are business-specific constraints. No generic agent knows these.
2. **Phased autonomy is structural.** Our Implementation Roadmap (doc 14) defines when human gates are removed based on measurable quality metrics. This is a first-class concept that must live in the agent layer.
3. **7 workflows, not 80 agents.** We need 7 tightly coupled pipelines, not a casting call of independent specialists.
4. **Template-first delivery.** Our model is content-swap on niche templates, not custom development. Generic dev agents would propose the opposite.
5. **Cross-SOP dependencies.** Outreach references audit data. Onboarding triggers delivery. Delivery enforces support boundaries. These must be coordinated, not independent.

---

## 2. agency-agents Repo Evaluation

### What the repo is

- **GitHub:** https://github.com/msitarzewski/agency-agents
- **80+ markdown agent definitions** organized into divisions: Engineering, Design, Sales, Marketing, Product, Project Management, Testing, Support, Specialized, Spatial Computing, Paid Media, Finance, Strategy, Academic
- **Integration layer:** convert.sh generates tool-specific formats (Claude Code, Cursor, Copilot, OpenClaw, Gemini CLI, Aider, Windsurf, etc.)
- **OpenClaw format:** Each agent becomes a workspace with SOUL.md (persona), AGENTS.md (operations), IDENTITY.md (metadata)
- **Orchestrator:** agents-orchestrator.md defines a pipeline that spawns specialists, tracks state, handles retry logic with escalation limits

### What it does well

1. **Agent design patterns** — Consistent structure: identity → mission → critical rules → workflows → deliverables → success metrics. Good template for any agent build.
2. **Workflow Architect methodology** (specialized/specialized-workflow-architect.md) — Maps every path: happy, failure, timeout, concurrent. Defines explicit handoff contracts. Produces build-ready specs. This methodology is directly useful for specifying our 7 workflows.
3. **Orchestrator pattern** — Coordinator spawns specialists, tracks task state, implements retry loops (max 3 before escalation), enforces quality gates. The pattern is right even though the specifics need replacing.
4. **QA discipline** — Evidence-based QA (EvidenceQA, Reality Checker) with "default to NEEDS WORK unless overwhelming evidence." Mirrors our human quality review posture.
5. **Multi-tool portability** — If we ever want to run our bespoke agents on OpenClaw or another runtime, the conversion pattern is established.

### What it cannot do for us

| Our requirement | What the repo provides | Gap |
|---|---|---|
| Google Maps prospecting → audit scoring → ranked list | Generic "Outbound Strategist" with ICP theory | No prospecting logic, no scoring, no data pipeline |
| 2-step hook email → demo-on-request | Generic multi-channel outbound sequences | No concept of our 2-step rule; would send demos in first email |
| Template-based site assembly with data isolation | Generic "Frontend Developer" + "CMS Developer" prompts | No niche templates, no isolation enforcement |
| Tiered support (T1 agent / T2 draft / T3 human) | Generic "Support Responder" with SLA YAML | No enforcement of our escalation rules |
| Phased rollout with removable quality gates | No concept of phased autonomy | Completely absent |
| Dodo/Polar checkout + billing state monitoring | "Finance Tracker" with budget advice | No payment integration |
| Objection handling with our specific responses | Generic sales objection theory | Would invent responses violating our guardrails |

### What to reuse

Three things from the repo are genuinely valuable as reference:

1. **Workflow Architect methodology** — Use the branching spec format (happy path, input validation failures, timeout failures, transient failures, permanent failures, partial failures, concurrent conflicts) to specify each of our 7 workflows before building.
2. **Orchestrator retry pattern** — Max 3 retries before escalation, state tracking, context passing between spawns. Adapt for our pipeline.
3. **QA posture** — "Default to fail, require evidence to pass." Bake into every skill.

---

## 3. Workflow Specifications

### Overview: 7 Skills → 7 SOPs

| Skill | SOP | Trigger | Human gate |
|---|---|---|---|
| `lead-gen` | 04-Lead-Generation | "Run lead gen for [niche] in [city]" or daily schedule | Phase 3: human reviews scored list |
| `website-audit` | 05-Website-Audit-Rubric | "Audit [URL]" or auto-called by lead-gen | Phase 3: human spot-checks 5/week |
| `outreach-sales` | 06-Outreach-Sales | "Run outreach on these leads" or after lead-gen | Phase 3: human reviews every email |
| `demo-builder` | 06 (Step 2) + 08 (Stage 1) | Prospect replies "interested" → auto by outreach-sales | Phase 4: human reviews every demo |
| `onboarding` | 07-Onboarding | Payment confirmed via Dodo/Polar webhook | Human final review before every launch (never removed) |
| `delivery-ops` | 08-Delivery-Operations | Called by onboarding, or ongoing maintenance | Human reviews structural changes |
| `support-retention` | 09-Support-Retention | Client message, monthly cycle, or churn signal | Tier 2: human approves; Tier 3: human only |

### Pipeline flow

```
lead-gen → website-audit → outreach-sales → demo-builder → [payment] → onboarding → delivery-ops → support-retention
                                              ↓                                    ↑
                                         Dodo/Polar checkout              ongoing operations
```

---

### Skill 1: lead-gen

**Maps to:** SOP 04-Lead-Generation
**Triggers:** Manual ("Run lead gen for HVAC in Austin TX") or scheduled daily
**Inputs:** Niche, city, ICP filters from SOP 03

#### Happy path

1. Accept niche + city as parameters
2. Cross-reference niche against ICP scorecard (SOP 03) — confirm niche is approved or flag for human
3. Search Google Maps / local directories for businesses matching niche in target city
4. For each listing found:
   - Capture: business name, niche, city/state, website URL, Google Maps URL, email, phone, decision-maker name
   - Open website if available
   - Call `website-audit` skill to score the site (0–10 scale per SOP 05)
   - Apply exclusion rules:
     - Website already strong (score ≤ 3)
     - Business appears closed
     - No useful contact path
     - Franchise with centralized control
     - Likely managed by corporate marketing team
     - Poor reputation suggesting churn/dispute risk
   - If not excluded, record with audit data
5. Deduplicate (normalize URLs, standardize city/state names)
6. Apply prospect scoring formula (SOP 03):
   - 2pts: No website
   - 2pts: Broken mobile layout
   - 1pt: Outdated branding
   - 1pt: No clear CTA
   - 1pt: Slow/cluttered homepage
   - 1pt: Poor trust signals
   - 1pt: Good reviews but weak site
   - 1pt: Email reachable
7. Rank into tiers: Hot (7–10), Warm (4–6), Low (0–3)
8. Output: cleaned lead list with all data fields, audit scores, ranked shortlist of 10–20 hot leads with notes explaining selection

#### Output format per lead

```
Business name:
Niche:
City/State:
Website URL:
Google Maps URL:
Email:
Phone:
Decision-maker:
Audit score: X/10
Top issues: [1, 2, 3]
Commercial impact: [one sentence]
Priority tier: Hot / Warm / Low
Selection reason: [one sentence]
```

#### Daily targets (agent-operated, per SOP 04)

- 50–100 raw prospects reviewed
- 20–40 qualified leads entered
- 10–20 hot leads advanced to outreach

#### Failure modes

| Failure | Recovery |
|---|---|
| Google Maps rate-limited or blocked | Alert human, switch to backup source (local directories) |
| No results for niche+city combo | Flag to human — may need different city or niche adjustment |
| Email not findable for most leads | Record what's available, flag to human; phone/social as fallback |
| Audit scoring seems off | Human spot-checks 5 audits during Phase 3; adjust rubric if needed |

#### Human quality gate (Phase 3)

- Human reviews the scored hot lead list daily during validation
- Human spot-checks 5 audits per week for accuracy
- Gate removal criteria: human spot-checks match agent scores consistently for 2+ weeks

---

### Skill 2: website-audit

**Maps to:** SOP 05-Website-Audit-Rubric
**Triggers:** Called automatically by lead-gen (bulk), or manual "Audit [URL]"
**Inputs:** Website URL, business name, niche

#### Happy path

1. Load target URL
2. Score each category 0–2 (acceptable/weak/clearly bad):
   - Mobile experience
   - Speed and responsiveness
   - Trust and credibility
   - Conversion structure
   - Content quality
   - Information architecture
   - Business fit signals
3. Sum total score (max 14 raw → normalized to 0–10 for lead scoring)
4. Identify top 3 issues
5. For each issue, translate to commercial language:
   - "Mobile layout breaks" → "people searching on their phone may leave before contacting you"
   - "No CTA hierarchy" → "the site does not direct visitors toward calling or booking"
   - "Outdated design" → "the site can make a legitimate business look less credible than it is"
6. Select 1–2 best outreach issues (visibly true, easy to explain, hard to deny, tied to trust/conversions)
7. Determine lead priority tier: Hot / Warm / Low

#### Output format

```
Business: [name]
URL: [url]
Score: X/10
Top issues:
  1. [issue] — [commercial translation]
  2. [issue] — [commercial translation]
  3. [issue] — [commercial translation]
Best outreach angle: [one issue + commercial translation]
Priority tier: Hot / Warm / Low
```

#### Rules

- Every technical finding MUST be translated to business language
- Outreach issue selection: visibly true, easy to explain, hard to deny, tied to trust or conversions
- Avoid: technical jargon, minor accessibility tweaks, deep SEO points, anything needing long explanation
- Do not over-research cold leads — enough for a relevant audit and pitch, not a full dossier

#### Failure modes

| Failure | Recovery |
|---|---|
| Site won't load | Flag as potential issue itself ("site may be down"), score what's available |
| Site is clearly not the business (wrong URL from Maps) | Exclude from list, note reason |
| Score seems ambiguous | Default to lower score; human can override during review |

---

### Skill 3: outreach-sales

**Maps to:** SOP 06-Outreach-Sales + SOP 15-Templates
**Triggers:** Manual ("Run outreach on these leads") or after lead-gen completes
**Inputs:** Ranked lead list from lead-gen

#### Critical constraint: The 2-Step Sales Motion

This is a **non-negotiable structural rule**, not a preference:

- **Step 1 (Hook email):** Highlight one visible issue, show relevance, ask one question. NO demo. NO link. NO pricing. Under 80 words.
- **Step 2 (Demo + pricing email):** Sent ONLY after prospect replies positively. Includes demo link, plan details, price, checkout link.

#### Happy path

1. Receive ranked lead list from lead-gen
2. For each hot lead, draft a hook email:
   - Subject: "Quick note about {{business_name}}'s website"
   - Body: mention business name, niche, city, ONE specific visible issue from audit, ask "Want me to show you a better version?"
   - Under 80 words
   - No demo, no link, no pricing, no call request, no agency buzzwords, no insults
3. Queue emails for send (or human review during Phase 3)
4. Send hook emails
5. Follow-up sequence:
   - Follow-up 1 (3–4 days later): brief bump, restate issue, re-offer to show
   - Follow-up 2 (7 days later): final check-in, easy yes/no reply
6. Classify every reply:
   - Interested → trigger demo-builder
   - Not interested → archive
   - Objection → apply objection handling
   - Question → answer using approved language
   - No response after sequence → archive
7. If prospect replies interested:
   - Trigger demo-builder skill
   - On demo delivery, send demo email with:
     - Demo preview link
     - Plan name + price + what's included
     - Dodo/Polar checkout link
8. If prospect has objections, apply approved responses:

#### Objection handling scripts

| Objection | Agent response |
|---|---|
| Too expensive | Reframe around management + ongoing support. Offer lower package. NO discounts without human approval. |
| "Is this custom?" | "Adapted to your business, built on a proven structure for faster launch and lower cost." |
| "Can we get on a call?" | Offer quick 5-minute walkthrough. Keep optional, don't block the sale on a call. |
| "Why should I trust you?" | Point to demo built with their own content. Mention cancel-anytime. Brief and confident. |
| Already has provider | "No worries. If things change, I'm here." |
| Not a priority | "Totally understand. I'll leave the demo link here in case it becomes useful later." |

#### Agent guardrails (hard constraints)

The agent MUST NOT:
- Offer discounts, free months, or price reductions without human approval
- Promise scope changes or custom features outside the package
- Send a demo before the prospect expresses interest
- Respond to angry or legal-sounding messages (escalate to human immediately)
- Make guarantees about revenue, SEO rankings, or lead volume
- Share other clients' data or demos
- Use language not consistent with SOP 15-Templates
- Send batch emails without human approval during validation phase

The agent MUST:
- Use prospect's real business name and city in every email
- Reference a specific visible issue from the audit
- Include checkout link only after interest is confirmed
- Log every interaction, reply, and objection
- Classify every reply (interested / not interested / objection / question / no response)

#### Tracking fields

Per lead, track:
- Lead source
- Niche
- Date first contacted
- Follow-up count
- Reply type (none / interested / not interested / objection)
- Demo sent (yes/no + date)
- Objections raised
- Package discussed
- Closed / lost reason
- Agent confidence score

#### Deal loss reasons (standardized)

- No response
- Too expensive
- Already has provider
- Not a priority
- Wants call-heavy process
- Needs custom build outside scope
- Low trust / unclear fit
- Requested demo but did not convert

#### Human quality gates

| Phase | Gate | Removal criteria |
|---|---|---|
| Phase 3 | Human reviews every email before send | Reply rate >5%, spam complaints <0.3% |
| Phase 4 | Human reviews every demo before sending | Demo-to-close rate >30% |
| Phase 5 | Demo gate removed; human still reviews launches | N/A — launch review never removed |

#### Failure modes

| Failure | Recovery |
|---|---|
| Reply rate <2% on hook emails | Stop, analyze subject lines and issue angles, test new variants before next batch |
| Spam complaints >0.5% | Stop immediately, switch outreach domain, review email copy with human |
| Prospect sends legal threat | Do NOT respond. Escalate to human immediately with full context. |
| Prospect asks for something clearly out of scope | Decline politely, log request, notify human |
| Agent unsure how to classify a reply | Default to escalation; human classifies, agent learns |

---

### Skill 4: demo-builder

**Maps to:** SOP 06 (Step 2) + SOP 08 (Stage 1)
**Triggers:** Prospect replies "interested" → auto-triggered by outreach-sales
**Inputs:** Prospect audit data, business info, niche template

#### Happy path

1. Receive prospect data from outreach-sales (business name, niche, city, services, audit findings, any provided contact info)
2. Select correct niche template
3. Content swap with prospect's real data:
   - Business name and contact details
   - Service list (from audit of existing site, Google Business, social profiles)
   - Service area / location
   - Testimonials/reviews from public sources
   - Photos from existing site or Google Business (if available)
   - CTA matched to prospect's likely conversion path
4. Deploy to staging/preview URL
5. Run automated checks:
   - Mobile layout
   - Forms and contact methods work
   - No broken links
   - Page speed basics
   - Data isolation check (no other client's content)
6. Draft demo email using template from SOP 15:
   - Preview link
   - Recommended plan name + price + what's included
   - Dodo/Polar checkout link
7. Log demo as sent with date, package discussed, prospect ID

#### Rules

- Demo is built with prospect's REAL business content, not placeholder text
- If insufficient content available from public sources, note what's assumed
- Only one demo per interested prospect (no iteration loop during sales)
- Demo stays on staging — not published to production domain

#### Human quality gate (Phase 4)

- Human reviews every demo before the email is sent
- Gate removal criteria: demo-to-close rate >30%, human spot-checks show consistent quality

#### Failure modes

| Failure | Recovery |
|---|---|
| No niche template exists for prospect's niche | Flag to human; do not build demo in wrong template |
| Very little public content available | Build with what exists, note assumptions, keep it clean |
| Staging deployment fails | Retry once, alert human if still failing |

---

### Skill 5: onboarding

**Maps to:** SOP 07-Onboarding
**Triggers:** Payment confirmed via Dodo/Polar webhook
**Inputs:** Payment confirmation, client contact info, package selected

#### Happy path

1. Payment confirmed (Dodo/Polar checkout complete)
2. Agent sends welcome message:
   - Thank you + plan confirmation
   - What happens next
   - Materials needed (simple list):
     - Business legal/trading name
     - Contact person
     - Best email and phone
     - Logo files
     - Brand colors
     - Service list
     - Service areas/locations
     - Existing photos
     - Existing copy or brochure text
     - Testimonials/reviews to feature
     - Preferred CTA (call, form, WhatsApp, booking link)
     - Social links
     - Required legal pages
   - Expected launch window: 3–7 business days
   - Where to send support requests
3. Collect materials from client over email
4. If materials missing after 48 hours: send ONE follow-up
5. If materials missing after 72 hours: build with publicly available content, note assumptions in client record
6. If client becomes unresponsive: pause nonessential customization, notify human
7. Trigger delivery-ops skill for site assembly
8. Delivery-ops returns assembled site + QA results
9. Send preview link to human for final quality review:
   - Business details correct?
   - Overall quality and professionalism?
   - Approve for launch or flag issues?
10. On human approval (or 24-hour auto-window if human doesn't respond): launch
11. Send client handoff message:
    - Live site URL
    - How to request edits (simple instructions)
    - Billing reminder (next renewal date)
    - What is included each month
    - Support window and response expectations

#### Minimum viable launch content

A site can launch with:
- Business name and contact details
- Service list
- Service area
- 3–5 trust points or testimonials
- Strong CTA
- A few clean images

If client hasn't provided these, source from existing public presence (current website, Google Business, social).

#### Timeboxing rule

Do not let onboarding drag:
- 48 hours → one follow-up
- 72 hours → build with public content + assumptions
- If unresponsive → pause, notify human

#### Human quality gate

- **Final review before every launch — this gate is NEVER removed** (per SOP 14)
- Launch-after-window model: if human hasn't responded within 24 hours of preview, agent proceeds to launch. **This 24-hour window IS the human gate** — the operator is expected to check within 24 hours. If the operator is unavailable (vacation, sick), the operator should set a pause flag in the system before going offline. Proceeding without review is accepted risk, not gate removal.

#### Failure modes

| Failure | Recovery |
|---|---|
| Payment webhook not received | Human manually triggers onboarding with payment proof |
| Client sends unusable materials (low-res logo, incomplete info) | Use what's usable, source rest from public data, note gaps |
| Client demands features outside package | Politely clarify scope, offer add-on pricing, flag to human if needed |
| Site fails QA | Loop back to delivery-ops with specific fix list |

---

### Skill 6: delivery-ops

**Maps to:** SOP 08-Delivery-Operations
**Triggers:** Called by onboarding for new builds, or ongoing for maintenance/edit requests
**Inputs:** Client record, package type, niche template, materials

#### New build flow

1. Apply correct niche template
2. Insert business content from client intake + public sources
3. Adjust structure for client's specific services
4. Configure CTA and contact paths
5. Attach analytics tracking
6. Configure chatbot knowledge source and fallback behavior
7. Set up basic CMS fields if included in package
8. Run automated QA checklist:
   - Mobile layout correct
   - Forms and contact methods work
   - Copy free of obvious errors
   - Page speed acceptable
   - Link integrity verified
   - Data isolation check: NO other client's data present
9. Return to onboarding skill for human review

#### Ongoing operations

1. Handle edit requests — classify each:
   - **Included minor edit** → handle immediately (text swaps, image changes, contact updates)
   - **Included scheduled update** → queue for batch processing
   - **Add-on task** → send pricing to client, wait for approval before proceeding
   - **Out-of-scope request** → decline politely, notify human, log request
2. Update chatbot data when needed
3. Review analytics periodically
4. Generate monthly reports
5. Monitor uptime, address issues
6. Monitor for churn signals (pass to support-retention)

#### Profit protection rules

- Never allow unpriced revisions to expand endlessly
- Use fixed component library (no custom builds)
- Reuse chatbot control logic and analytics configuration across clients
- Strict launch checklist every time
- Log time/effort per client for monitoring (even though agent cost is near-zero)
- Monitor AI API costs per client — flag if any client consistently exceeds normal usage

#### Agent guardrails (hard constraints)

The agent MUST NOT:
- Delete or overwrite a live site without human approval
- Mix content between clients (strict data isolation)
- Launch a site that has not passed human quality review
- Make structural or design changes outside the client's package scope
- Respond to legal complaints or threats (escalate to human)
- Access or display another client's data, demos, or reports

The agent MUST:
- Run data isolation check before every launch
- Log every change made to a client site
- Classify every support request (included / add-on / out of scope)
- Flag out-of-scope requests to human
- Maintain uptime monitoring and alert human on outages

#### File organization per client

- Brand assets
- Copy source
- Live site URL
- Domain notes
- Billing info
- Support log
- Monthly reports
- Change history

#### Delivery SLAs

- Initial launch: 3–5 business days after materials received
- Minor edits: within 24 hours
- Critical issue response: same day (agent detects, human reviews)

#### Failure modes

| Failure | Recovery |
|---|---|
| Data isolation check finds cross-client content | Stop launch immediately, investigate source, fix, re-check |
| Template doesn't fit client's services well | Adjust within template constraints; if impossible, flag to human |
| Client request is ambiguous | Ask client one clarifying question; do not assume |
| Uptime monitoring detects outage | Alert human immediately, attempt automated recovery if possible |

---

### Skill 7: support-retention

**Maps to:** SOP 09-Support-Retention
**Triggers:** Client sends email/message, monthly retention cycle, churn signal detected
**Inputs:** Client record, message content, support history

#### Support tier classification

| Tier | Scope | Who handles | Response time | Resolution time |
|---|---|---|---|---|
| Tier 1 | Content edits, contact updates, testimonials, chatbot updates, billing info, FAQs, monthly reports | Agent (auto) | <4 hours | <24 hours |
| Tier 2 | Design/layout changes, new pages, structural changes, scope-edge requests | Agent drafts, human approves | <24 hours | <48 hours |
| Tier 3 | Angry clients, legal threats, disputes, cancellation negotiations, custom feature requests outside packages | Human only | Immediate escalation | Human-managed |

#### Tier 1 support flow (agent handles)

1. Receive client message
2. Acknowledge within 4 hours ("Received — this has been logged. Expected turnaround: {{time_window}}.")
3. Classify request type
4. If Tier 1: resolve within 24 hours
5. Log interaction in client's support history
6. Confirm completion to client

#### Tier 2 support flow (agent drafts, human approves)

1. Receive client message
2. Acknowledge within 4 hours
3. Classify as Tier 2
4. Draft response or proposed change
5. Send to human for approval with full context
6. On approval: execute and confirm to client
7. Log interaction

#### Tier 3 escalation (human only)

1. Receive client message
2. Detect escalation trigger:
   - Angry or frustrated tone
   - Legal language or threats
   - Dispute language
   - Request for custom features outside any package
   - Cancellation intent
3. Do NOT respond with any substantive reply
4. Immediately escalate to human with:
   - Full message history
   - Client context (package, history, recent interactions)
   - Suggested action (if confident)
5. Log as Tier 3 escalation

#### Monthly retention actions (agent-operated)

Every month, send each client:
- Analytics summary (auto-generated): visitors, top pages, notable actions
- One improvement recommendation
- Chatbot performance note
- Small proactive enhancement (if within scope)
- Issues detected and fixed before client noticed

#### Churn signal detection

Monitor for:
- No support requests or engagement for 60+ days
- Repeated price sensitivity in messages
- Repeated out-of-scope requests
- Billing failures
- Long silence after launch
- Complaints about unclear value
- Client viewing cancellation page or asking about leaving

On churn signal:
1. Send personalized retention message (value reminder, recent improvements)
2. If client responds negatively → escalate to human
3. Human may offer: lower tier, pause, direct conversation
4. If client cancels → initiate offboarding

#### Offboarding flow

1. Confirm effective cancellation date
2. Clarify what happens to website and hosting
3. Clarify whether content export is provided
4. Revoke dashboards and support access at correct time
5. Mark account status clearly (Cancelled + reason)
6. Log cancellation reason

#### Agent guardrails (hard constraints)

The agent MUST NOT:
- Offer refunds, discounts, or free months without human approval
- Promise custom features or scope changes
- Respond to messages containing legal threats
- Delete or modify content it is not certain about
- Escalate frustration by being repetitive or dismissive

The agent MUST:
- Acknowledge every request within 4 hours
- Classify request type and priority
- Resolve Tier 1 within 24 hours
- Escalate Tier 2/3 to human with full context
- Log every interaction in client's support history

#### Support boundaries (enforce consistently)

- Support is NOT strategy consulting
- Support is NOT copywriting from scratch
- Support is NOT marketing management
- Support is NOT custom development
- Any of the above = separate pricing or polite decline

#### Failure modes

| Failure | Recovery |
|---|---|
| Agent can't classify request tier | Default to higher tier (safer escalation) |
| Client sends mixed signals (frustrated + legitimate request) | Separate the emotion from the task; escalate emotion to human, handle task at appropriate tier |
| Monthly report shows alarming metrics (traffic crash, broken forms) | Flag to human as critical, do not wait for monthly cycle |
| Churn signal but client won't respond to retention message | Escalate to human after 2 attempts |

---

## 4. Phased Autonomy Reference

From SOP 14-Implementation-Roadmap. Each skill must know which phase we're in and enforce the appropriate gates.

### Phase 1: Strategy lock
- Finalize niche, city, packages, pricing, audit rubric, hook templates, guardrails
- No agent operation yet

### Phase 2: Agent foundation
- Build all 7 skills
- Set up Dodo/Polar checkout
- Build first niche template
- Prepare analytics, chatbot, CMS as reusable configs

### Phase 3: Validation with human oversight
- **ALL outputs require human review**
- lead-gen: human reviews scored list
- website-audit: human spot-checks 5/week
- outreach-sales: human reviews EVERY email before send
- demo-builder: human reviews EVERY demo before send
- onboarding: human reviews before EVERY launch
- support: human reviews all Tier 2, handles all Tier 3

### Phase 4: Quality gates begin opening
- outreach-sales email gate: REMOVE if reply rate >5%, spam complaints <0.3%
- website-audit spot-check: REDUCE frequency if human checks match agent scores consistently
- demo-builder gate: KEEP (human still reviews every demo)
- onboarding launch gate: KEEP (never removed)

### Phase 5: First closes
- demo-builder gate: REMOVE if demo-to-close rate >30%
- Full pipeline running: prospect → hook → reply → demo → checkout → onboarding → launch
- onboarding launch gate: KEEP

### Phase 6: Scale toward autonomy
- Automate Tier 1 support
- Automate monthly reports
- Automate churn signal detection
- Build monitoring dashboard
- Target: 10 active clients
- onboarding launch gate: KEEP

### Phase 7: Entity and expansion
- Form US LLC
- Consider Stripe migration
- Add second niche
- Hire VA for final QA if needed
- Target: 25–50 clients
- onboarding launch gate: KEEP

### Gate removal criteria summary

| Gate | Metric | Go if | Stop and fix if |
|---|---|---|---|
| Email approval | Reply rate | >5%, <0.3% spam | <2% or >0.5% spam |
| Demo approval | Demo-to-close rate | >30% | <15% |
| Audit spot-check | Accuracy match | Consistent 2+ weeks | Frequent mismatches |
| Launch review | NEVER REMOVED | — | — |
| Add second niche | First niche stability | 5+ clients, >80% month-2 retention | Churn >30% or delivery chaos |
| Form US LLC | Revenue validation | $1,000+ MRR stable 2+ months | Revenue unpredictable |
| Hire VA | Human time on QA | Human >10 hrs/week on QA | Agent quality unreliable |

---

## 5. Non-Negotiable Guardrails Summary

These are hard constraints across ALL skills. No skill may violate these.

### Sales guardrails
- 2-step motion: hook first (no demo/link), demo + pricing ONLY after positive interest
- No discounts, free months, or price reductions without human approval
- No scope promises or custom feature commitments outside packages
- No guarantees about revenue, SEO rankings, or lead volume
- No responding to angry or legal-sounding messages — escalate immediately
- No sharing other clients' data, demos, or records

### Delivery guardrails
- Strict client data isolation — no cross-client content, ever
- Data isolation check before EVERY launch
- No launching without human quality review
- No structural/design changes outside client's package scope
- No deleting/overwriting live site without human approval

### Support guardrails
- No refunds, discounts, or free months without human approval
- No responding to legal threats
- Support is not strategy consulting, copywriting, marketing, or custom dev
- Default to escalation when uncertain

### Billing guardrails
- No launch without successful first payment
- No continuing unmanaged support on delinquent accounts
- Document all exceptions in writing

### Record-keeping guardrails
- Log every interaction, change, and decision
- Every transaction traceable from lead → payment → delivery
- Retain all records for 6+ years

---

## 6. Cross-SOP Dependencies

When changing one workflow, review these connected documents:

| Change area | Also review |
|---|---|
| Sales flow or outreach | SOP 15-Templates, SOP 12-KPIs, SOP 13-Risk-Register |
| Delivery/launch process | SOP 07-Onboarding, SOP 09-Support-Retention, SOP 14-Implementation-Roadmap |
| Pricing/packages | SOP 01-Business-Model, SOP 06-Outreach-Sales, SOP 10-Payments-Billing, SOP 15-Templates |
| ICP or niche selection | SOP 03-ICP-Niches-Scoring, SOP 04-Lead-Generation, SOP 05-Website-Audit-Rubric |
| Support or retention | SOP 08-Delivery-Operations, SOP 13-Risk-Register, SOP 12-KPIs |
| Quality gates or phases | SOP 14-Implementation-Roadmap, SOP 12-KPIs, SOP 13-Risk-Register |

---

## 7. agency-agents Reference Material

### Repo location
https://github.com/msitarzewski/agency-agents

### Agents worth studying (not using directly)

| Agent file | Why study it |
|---|---|
| specialized/specialized-workflow-architect.md | Workflow branching methodology: happy path, failures, timeouts, concurrent conflicts, handoff contracts. Use this approach to specify our workflows. |
| specialized/agents-orchestrator.md | Retry pattern (max 3 before escalation), state tracking, context passing between spawns. Adapt for our pipeline coordination. |
| testing/testing-reality-checker.md | QA posture: "default to NEEDS WORK unless overwhelming evidence proves production readiness." Adopt this for all quality gates. |
| sales/sales-outbound-strategist.md | Signal-based selling framework and ICP tiering model. Useful for understanding modern outbound, even though our 2-step motion is structurally different. |
| support/support-support-responder.md | Multi-channel support SLA structure. Useful reference for response time frameworks, though our 3-tier escalation is bespoke. |

### Installation (for reference only)

```bash
# Generate OpenClaw workspaces
./scripts/convert.sh --tool openclaw

# Install to local OpenClaw
./scripts/install.sh --tool openclaw

# Install for Claude Code
./scripts/install.sh --tool claude-code
```

---

## 8. Package & Pricing Consistency Reference

All skills must use these consistently. Source of truth: SOP 02.

### Package names
- Starter
- Growth
- Pro

### Price ranges
| Package | Launch price | Allowable range |
|---|---|---|
| Starter | $79/mo | $59–$79 |
| Growth | $129/mo | $99–$149 |
| Pro | $249/mo | $199–$299 |

### What's included (consistent in all sales materials)

| Feature | Starter | Growth | Pro |
|---|---|---|---|
| Pages | 5 | 8 | 12 |
| Mobile-optimized | Yes | Yes | Yes |
| Hosting | Included | Included | Included |
| SSL | Included | Included | Included |
| AI chat assistant | Basic FAQ | Custom training up to 25 FAQs + controls | Custom training up to 50 FAQs + multi-turn conversations + proactive engagement |
| Analytics | Basic dashboard | Included | Advanced summary + insights |
| Monthly edits | Minor text/image | 3 content edits + 1 refresh | 5 content edits + 2 landing pages |
| Landing pages | — | 1/month | 2/month (conversion-focused) |
| Support | Email | Priority window (4hr) | Priority handling (1hr critical) |
| Quarterly review | — | — | Yes |

### What's excluded (consistent everywhere)
- Full custom software development
- Complex CRM integrations
- Unlimited design revisions
- SEO guarantees
- Ad management
- Logo/brand creation from scratch
- Original long-form copywriting or strategic messaging unless explicitly sold

---

## 9. KPI Targets for Agent Quality

Source: SOP 12-KPIs-Dashboard. These determine when gates open and close.

### Agent quality KPIs (most important early)
- Email quality: human-rated sample of 5–10 emails/week during validation
- Audit accuracy: human spot-checks 5 audits/week
- Demo quality: human rates every demo during validation
- Error rate: incorrect info, wrong client data, broken links
- Spam complaint rate on outbound
- Hallucination incidents: promises outside scope, wrong pricing, invented features

### Funnel KPIs (weekly)
- Leads reviewed → qualified → hook emails → replies → positive replies → demos → payments → active clients

### Target benchmarks for confidence
- Agent hook emails getting >5% reply rate
- Agent demos converting >30% of interested prospects
- Launches without chaos (<30 min human review per launch)
- Clients remaining after first renewal
- Agent error rate <5% on customer-facing interactions
- Agent cost <10% of revenue

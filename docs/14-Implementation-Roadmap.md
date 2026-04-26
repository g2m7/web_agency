# Implementation Roadmap

## Phase 1: Strategy lock

- Finalize one niche
- Finalize one city list
- Finalize package names and pricing
- Finalize audit rubric
- Finalize hook email templates (2-step motion)
- Define agent guardrails and approval gates

Default launch shortlist from the 2026 market analysis:

- `Phoenix, AZ + pool service`
- `Charlotte, NC + tree service`
- `Raleigh, NC + garage door repair`

These are starting hypotheses, not automatic approvals. Each pair still needs to pass the mini-validation and go/no-go thresholds in `docs/22-Niche-Hunting-SOP.md`.

## Phase 2: Agent foundation

- Set up Dodo Payments with subscription checkout links
- Build the agent's first capability: Google Maps prospecting + auto-scoring
- Build the agent's audit capability (screenshot + score + issue identification)
- Build the niche template (see Template Tech Spec below)
- Prepare analytics, chatbot, and CMS setup as reusable configs

### Template Tech Spec

This is the core deliverable of the entire business. Every client site is assembled from a niche template + client content swap.

**Technology stack:**
- **Framework:** Static HTML + Tailwind CSS (or Astro for multi-page support). Rationale: zero build complexity, instant deploy to Cloudflare Pages/Vercel, no server-side runtime, fast page loads, easy content swap.
- **No WordPress, no CMS runtime, no server-side rendering.** Static files only.

**Template structure per niche:**
```
niche-template/
├── index.html          # Homepage
├── about.html          # About page
├── services.html       # Services page
├── contact.html        # Contact page
├── gallery.html        # Gallery/portfolio (optional per niche)
├── faq.html            # FAQ page (chatbot training source)
├── assets/
│   ├── css/
│   │   └── custom.css  # Niche-specific overrides + client brand colors
│   ├── js/
│   │   └── chatbot.js  # AI chat assistant widget
│   └── img/
│       └── placeholder/  # Placeholder images replaced per client
├── data/
│   ├── content.json    # All client-specific content (business name, services, areas, testimonials, CTA config, contact info)
│   └── faq.json        # FAQ entries for chatbot training
└── config.json         # Site config: CTA type (call/form/whatsapp/booking), analytics ID, chatbot ID, domain
```

**Content swap mechanism:**
1. All client-specific text lives in `data/content.json` — not hardcoded in HTML
2. HTML templates use `{{mustache}}` or `<slot>` placeholders populated from the JSON at build time
3. Agent's job: fill `content.json` with client data → run build → deploy
4. This means adding a new client = editing one JSON file + adding images, not touching HTML

**Chatbot integration:**
- Embedded widget loaded via `chatbot.js`
- Knowledge source: `faq.json` (client-specific FAQs)
- Fallback: "I'll have someone reach out to you" → triggers support notification
- Chatbot provider TBD (Tidio, Chatbase, or custom) — must support programmatic knowledge-base upload

**Analytics:**
- Google Analytics 4 tag injected via `config.json` → script in layout partial
- Monthly report generated from GA4 API by agent

**Template versioning:**
- Templates live in a Git repo, one branch per niche
- Client sites are built from a template snapshot (not symlinked)
- This ensures updating the template doesn't break live sites
- Client-specific changes live in the client's own deploy repo/folder

**Design principles:**
- Mobile-first layout (audited businesses have bad mobile → this must be perfect)
- Above-the-fold: business name, value prop, CTA — visible in <2 seconds
- Trust section: reviews/testimonials prominently placed
- Service area clearly visible for local businesses
- Fast load target: <3s on 4G mobile, Lighthouse performance >85

## Phase 3: Validation with human oversight

- Agent builds first lead list (50–100 prospects)
- Agent scores and ranks leads
- **Human reviews scored list for quality**
- Agent drafts hook emails
- **Human reviews every email before sending**
- Send first controlled batch (20 emails)
- Record all outcomes meticulously
- Measure: reply rate, demo request rate, close rate

## Phase 4: Agent quality gates

- If agent email quality is proven (reply rate > 5%), remove email approval gate
- If agent audit quality is proven (human spot-checks match), remove audit review gate
- Build agent's demo assembly capability (template + content swap for interested prospects)
- Build agent's reply classification (interested / not / objection / question)
- **Human still reviews every demo before sending during this phase**

## Phase 5: First closes

- Agent handles full flow: prospect → hook email → reply → demo → pricing → checkout
- Agent collects payment via Dodo checkout link
- Agent drives onboarding (intake form, material collection)
- Agent assembles site from template
- **Human does final quality review before every launch**
- Capture testimonials if earned
- Track: delivery time, client satisfaction, agent error count

## Phase 6: Scale toward autonomy

- Remove demo approval gate if quality is proven
- Automate Tier 1 support handling
- Automate monthly report generation
- Automate churn signal detection
- Build monitoring dashboard (agent tasks/day, error rate, costs)
- Reach 10 active clients
- Measure retention and support load
- Confirm recurring cash flow stability

## Phase 7: Entity and expansion

- Form US LLC (Wyoming or Delaware, ~$300–500)
- Consider migrating from Dodo to Stripe for better margins
- **Introduce annual pricing option** (e.g., 2 months free for annual commitment) — deferred until monthly model is proven and churn data supports discounting
- Add second niche using proven agent playbook
- Hire VA for final QA if human review time becomes a bottleneck
- Target 25–50 clients

## Human involvement by phase

| Phase | Human hrs/week | What the human does |
|---|---|---|
| 1. Strategy lock | 5–10 | Decisions, niche research, pricing |
| 2. Agent foundation | 10–15 | Build agent capabilities, template design |
| 3. Validation | 5–10 | Review every agent output |
| 4. Quality gates | 3–5 | Spot-check agent outputs, review demos |
| 5. First closes | 3–5 | Final launch reviews, handle escalations |
| 6. Scale | 3–5 | Monitoring, agent improvement, strategy |
| 7. Entity + expansion | 5–8 | Legal setup, second niche, hiring |

## Key decision gates

| Gate | Metric | Go if | Stop and fix if |
|---|---|---|---|
| Remove email approval | Reply rate on agent emails | > 5% reply rate, < 0.3% spam complaints | Reply rate < 2% or spam complaints > 0.5% |
| Remove demo approval | Demo-to-close rate | > 30% of demos convert to paid | < 15% demo conversion |
| Add second niche | First niche stability | 5+ clients, > 80% month-2 retention | Churn > 30% or delivery still chaotic |
| Form US LLC | Revenue validation | $1,000+ MRR, stable for 2+ months | Revenue unpredictable or still finding PMF |
| Hire VA | Human review bottleneck | Human spending > 10 hrs/week on QA | Agent quality not yet reliable |

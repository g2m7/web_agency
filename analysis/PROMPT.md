# Business Analysis Prompt

**How to use:** Copy the prompt below into an AI with web search (ChatGPT Plus, Claude with browsing, Perplexity Pro, etc.). Point it at the template files in this folder so it fills them in.

---

## THE PROMPT

```
You are a senior business analyst and strategy consultant. Perform a comprehensive, data-backed business analysis for the company described below. Use current 2025-2026 data from web searches. Be specific — name numbers, cite sources, name cities, name niches.

## THE COMPANY

I run an AI-agent-operated web agency that sells affordable subscription websites to local service businesses in the US. Here is exactly what we have built and what we sell:

### Product
- Static HTML + Tailwind CSS websites deployed to Cloudflare Pages
- Niche-specific templates with client content swap (one JSON file per client)
- Mobile-first, fast-loading (<3s), Lighthouse >85
- Includes: homepage, about, services, contact, FAQ, gallery
- Built-in AI chatbot widget, Google Analytics 4, contact form
- Client content populated from a single content.json — no CMS needed

### Pricing (monthly subscription)
- Starter: $59-79/mo (5 pages, 0 edits/mo)
- Growth: $99-149/mo (8 pages, 3 edits/mo)
- Pro: $199-249/mo (12 pages, 5 edits/mo)
- One-time launch fee at plan's launch price
- Payment via Dodo Payments (merchant of record)

### Sales Motion (2-step, enforced by policy engine)
1. Hook email: short (under 80 words), no pricing, no demo link, references a specific website issue found during audit
2. After positive reply: send demo website + pricing
- Human reviews emails until reply rate >5%
- Human reviews demos until demo-to-close >30%
- Human ALWAYS reviews before launch (never automated)

### Lead Generation Pipeline
- Step 0: Score city+niche pairs on 100-point scale (demand, competition, weakness, contactability, revenue)
- Step 1: Google Maps scraping → lead tiering (hot/warm/low) → email enrichment → email validation
- Step 2: Outreach segmentation: email-ready, phone fallback, unreachable
- Maximum 3 active outreach sprints simultaneously

### Technology Stack
- Bun + Hono + Drizzle ORM + SQLite
- Single-file operator dashboard at /
- DB-backed job queue with 10 handlers
- Policy engine with 12 rules (no discounts, no guarantees, data isolation, legal escalation)
- Full audit trail (pipeline events, policy checks, skill versions)

### Current Status
- Platform is built and operational
- Typecheck + 81 automated tests pass
- No production credentials yet (Resend for email, Cloudflare for deploy, Google Cloud for Places API)
- No clients yet — about to enter first outreach

## WHAT I NEED FROM YOU

Search the web for current data and produce the following reports. For each report, provide specific numbers, cite sources, and give actionable recommendations.

### Report 1: Market Analysis
- What is the TAM (total addressable market) for small business website services in the US in 2025-2026?
- How many local service businesses exist in the US? Break down by niche (HVAC, plumbing, roofing, tree service, pool service, pest control, landscaping, etc.)
- What % of local service businesses have NO website or a clearly bad website?
- What is the YoY growth rate in "website for small business" demand?
- What are the key market trends (AI-generated websites, website builders, Google Business Profile replacing websites)?

### Report 2: Competitive Landscape
Search for and analyze the top 10 competitors in the "affordable website for local businesses" space. For each:
- Name, pricing, what they offer
- Their target niche/geography
- Their weaknesses (what they miss that we cover)
Include: Wix, Squarespace, GoDaddy Website Builder, WordPress agencies, local web design agencies, other AI website builders (Durable, 10Web, Hostinger AI, etc.)

### Report 3: Top 10 City+Niche Pair Recommendations
Using 2025-2026 data, recommend the 10 best city+niche pairs for our first outreach sprints. For each pair provide:
- City, State, Niche
- Estimated business count on Google Maps
- Estimated weak-site percentage
- Estimated contactability
- Competition level (ads, agency presence)
- Economic signal (growing/flat/shrinking)
- Why this pair is especially good for our automated pipeline
Consider: fast-growing mid-size cities, under-targeted niches, niches with high lead value

### Report 4: Pricing Strategy
- What do local businesses currently pay for websites? (one-time and monthly)
- What is the average local SEO retainer in 2025-2026?
- How do our prices ($59-249/mo) compare to the market?
- Should we adjust pricing up or down given current market rates?
- What pricing experiments should we run first?

### Report 5: SWOT Analysis
Perform a full SWOT analysis specific to THIS business:
- Strengths: what competitive advantages does our automated pipeline + policy engine give us?
- Weaknesses: what are our vulnerabilities? (no brand, no clients, Google Maps dependency, etc.)
- Opportunities: what 2025-2026 trends favor us? (AI adoption, small business digitalization, etc.)
- Threats: what could kill or severely damage this business? (AI website builders, Google eliminating need for websites, regulation, etc.)

### Report 6: Technology and Trend Risks
Research and assess:
- Is Google reducing the need for small business websites (Google Business Profile, AI overviews, zero-click searches)?
- How are AI website builders (Durable, 10Web, etc.) impacting the market? Are they eating our lunch?
- What SEO/statistics trends affect local service businesses in 2025-2026?
- What is the risk of Google Maps scraping detection? What percentage of scrapers get blocked?
- Is there a regulatory risk (CAN-SPAM, GDPR, state privacy laws) for our outreach model?

### Report 7: Financial Projections
Based on market data:
- What is a realistic conversion funnel: leads contacted → reply rate → demo sent → paid?
- What CAC (customer acquisition cost) should we expect per client?
- What is the projected LTV of a client on each plan (Starter/Growth/Pro)?
- At what point do we break even on a client?
- What does the path to $1K MRR look like? $5K MRR? $10K MRR?
- What are the main unit economics risks?

### Report 8: Recommended Action Plan
Based on ALL findings above, give me:
- Top 5 things to do in the next 30 days
- Top 5 things to do in the next 90 days
- The single most important decision I need to make right now
- The single biggest risk I should mitigate immediately

## FORMAT
For each report, use markdown with clear headers, tables where appropriate, and cite your data sources. Be brutally honest — I need the truth, not optimism.
```

---

## How to save the output

1. Run the prompt in an AI with web search
2. Split the output into the numbered files in this folder:
   - `01-EXECUTIVE-SUMMARY.md` — your own 1-page summary of all findings
   - `02-MARKET-ANALYSIS.md` — Report 1 output
   - `03-COMPETITIVE-LANDSCAPE.md` — Report 2 output
   - `04-ICP-AND-NICHE-ANALYSIS.md` — Report 3 output
   - `05-PRICING-STRATEGY.md` — Report 4 output
   - `06-SWOT-ANALYSIS.md` — Report 5 output
   - `07-TECHNOLOGY-TRENDS.md` — Report 6 output
   - `08-FINANCIAL-PROJECTIONS.md` — Report 7 output
   - `09-ACTION-PLAN.md` — Report 8 output
3. Review findings and update `docs/` and `plans/` accordingly

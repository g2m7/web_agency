# Niche & City Hunting SOP

## Objective

Autonomously discover and score high-opportunity city+niche pairs before committing outreach resources. This is **Step 0** — it runs continuously in the background, not as a manual research task. The agent probes cities with broad queries, harvests Google Maps categories to discover what each city is actually known for, then scores and validates the best pairs.

> **Key shift**: The operator does not manually pick niches. The agent discovers them organically from real Google Maps data — finding what thrives in each city rather than guessing from a static list.

## Core principle

Never commit a 2-week outreach sprint to a city+niche pair without scoring it first. Bad pair selection wastes scraping, enrichment, and outreach cycles on markets where conversion is structurally unlikely.

## Data sources

Every candidate city+niche pair is evaluated across five data dimensions:

### 1. Google Maps density

- Business count for the niche in the city.
- Average review count per business.
- Recent review velocity (reviews in last 6 months) — indicates active demand.
- Category concentration — how many businesses list the exact niche category vs adjacent categories.

### 2. SERP and ad competition

- Number of paid ads showing for "[niche] [city]".
- Number of agency or competitor landing pages targeting the exact city+niche pair.
- Presence of niche-specific marketing agencies already serving that vertical in that city.

### 3. Website weakness rate

- Sample the top 20–30 businesses from Maps for the city+niche pair.
- Run each site through the website audit rubric (`docs/05-Website-Audit-Rubric.md`).
- Calculate: % of businesses with audit score ≥ 4 (clearly weak sites).
- Key signals: mobile issues, slow load, missing CTA, poor trust signals, no HTTPS, outdated design.

### 4. Contactability

- % of sampled businesses with a valid email (discoverable via website crawl + DNS validation).
- % with phone number only (no email).
- % unreachable (no email, no phone, no contact form).
- This directly affects outreach execution economics — a niche with 80% contactability is far more valuable than one at 30%.

### 5. Economic signal

- City growth proxies: population trend (growing/flat/shrinking), new business permit activity, local job postings in the niche.
- Avoid dead zones — cities with shrinking populations and declining business formation produce leads that churn or never convert.
- Prefer cities with visible growth momentum in the target niche.

## Search strategy — repeatable query library

All queries follow fixed patterns so every agent run produces consistent, comparable results.

### Discovery queries (find businesses)

- `"[niche] in [city]"`
- `"best [niche] [city]"`
- `site:.com "[niche]" "[city]"`

### Competition queries (measure agency saturation)

- `"web design for [niche] in [city]"`
- `"[niche] marketing agency [city]"`

### Weakness sampling (audit sites)

- Pull first 30 Google Maps results for each city+niche pair.
- Run the website audit rubric on each result's website.
- Record scores in the niche-city scorecard.

### Query discipline

- Use the exact query patterns above — do not improvise or paraphrase.
- Record the date and result count for every query execution.
- If a query returns fewer than 10 results, the pair has insufficient density and should be scored accordingly.

## Candidate generation (automated)

### Step 1: Broad city probing

The agent probes each city with **generic queries** ("local services", "home services", "health and wellness", etc.) and harvests the **Google Maps categories** returned. This discovers what businesses actually thrive in each city — not what we assume exists.

Discovered categories include anything Google Maps surfaces: pool services in Tampa, ski rentals in Denver, crawfish catering in New Orleans, surf shops in San Diego. The agent does not limit itself to a static niche list.

A seed library of 60+ niches across 10 verticals (`app-lite/src/data/niche-library.ts`) serves as a fallback for cities where broad probing returns sparse data. The library includes home services, property maintenance, auto, pets, health, education, events, personal care, food, and professional services.

### Step 2: Quick-filter

Before full scoring, apply quick filters to eliminate obvious non-starters:

- Fewer than 10 businesses on Maps → skip (insufficient density).
- Niche requires enterprise sales cycle → skip (poor async-close fit).
- Niche businesses are predominantly franchise/chain → skip (centralized marketing, flagged via `franchiseRisk` in the niche library).

## Scoring model — 100-point scale

Score each surviving city+niche pair on five dimensions:

| Dimension | Weight | What it measures |
|---|---:|---|
| Demand | 25 | Maps business count, review volume, review velocity |
| Competition saturation (inverse) | 20 | Fewer ads + fewer agency pages = higher score |
| Website weakness rate | 25 | % of sampled businesses with clearly weak sites |
| Contactability | 15 | % of businesses with reachable email or phone |
| Revenue potential | 15 | Lead value per customer, retainer affordability, niche margin |

### Scoring rubric per dimension

#### Demand (0–25)

| Score | Criteria |
|---:|---|
| 20–25 | 50+ businesses on Maps, strong review velocity, clear local demand |
| 13–19 | 25–49 businesses, moderate reviews, demand is present |
| 7–12 | 15–24 businesses, thin reviews, demand uncertain |
| 0–6 | < 15 businesses, stale or no reviews |

#### Competition saturation — inverse (0–20)

| Score | Criteria |
|---:|---|
| 16–20 | No ads, no agency pages targeting this pair |
| 10–15 | 1–2 ads or agency pages, low competition |
| 5–9 | 3–5 ads, multiple agency pages, moderate competition |
| 0–4 | 6+ ads, saturated by agencies |

#### Website weakness rate (0–25)

| Score | Criteria |
|---:|---|
| 20–25 | ≥ 70% of sampled businesses have weak sites |
| 13–19 | 50–69% weak sites |
| 7–12 | 30–49% weak sites |
| 0–6 | < 30% weak sites |

#### Contactability (0–15)

| Score | Criteria |
|---:|---|
| 12–15 | ≥ 70% contactable (email or phone) |
| 8–11 | 50–69% contactable |
| 4–7 | 30–49% contactable |
| 0–3 | < 30% contactable |

#### Revenue potential (0–15)

| Score | Criteria |
|---:|---|
| 12–15 | High lead value, niche clearly affords $79–249/mo, low price sensitivity |
| 8–11 | Moderate lead value, can likely afford Starter/Growth plans |
| 4–7 | Lower lead value or uncertain ability to pay |
| 0–3 | Very low margins, price-sensitive, high churn risk |

## Mini-validation scrape

For the **top 3 scored pairs per city**:

1. Run a full lead_gen scrape of 30 leads per pair.
2. Run email enrichment + validation on results.
3. Record actual contactability, actual weak-site rate, and lead quality.
4. Compare actual results to the scoring estimates.

This catches cases where the scoring model over- or under-estimated a pair.

## Go / no-go decision

A city+niche pair is **approved for outreach** only when ALL of the following are true:

| Threshold | Minimum |
|---|---|
| Overall score | ≥ 70 / 100 |
| Contactable rate (email + phone) | ≥ 60% |
| Weak-site rate | ≥ 50% |
| Maps density | ≥ 20 businesses |

Pairs that fail any threshold are **parked** — they can be re-evaluated in 90 days or if market conditions change.

## Outreach sprint cadence

Approved pairs enter a **2-week focused outreach sprint**:

- Week 1: Scrape full lead list, enrich, validate, launch hook emails.
- Week 2: Follow-ups, track replies, measure conversion signals.
- End of sprint: score the pair on actual funnel metrics (reply rate, positive reply rate, demo requests).

After the sprint, decide:

- **Continue**: reply rate ≥ 5%, positive replies present → keep running this pair.
- **Pause**: reply rate 2–5%, no demo requests → park and revisit with a different hook angle.
- **Drop**: reply rate < 2% or zero positive replies → move to next pair.

## Automated cadence

The `niche_discover` job runs every 6 hours (configurable) and handles candidate generation, probing, scoring, and validation queuing automatically.

| Activity | Frequency | Owner |
|---|---|---|
| Discovery probing (broad + targeted) | Every 6h | Agent (automatic) |
| Scoring discovered pairs | Every 6h | Agent (automatic) |
| Mini-validation scrapes on top scorers | Every 6h | Agent (automatic) |
| Go/no-go decisions | Per validated pair | Human (first 3), then agent |
| Sprint review for active pairs | Weekly (Monday) | Agent + human review |

## Operational artifact

Maintain a running scorecard at `data/niche-city-scorecard.csv` with one row per evaluated city+niche pair:

| Column | Description |
|---|---|
| city | Target city |
| state | State abbreviation |
| niche | Niche name |
| maps_count | Business count on Google Maps |
| review_velocity | Avg recent reviews (6 months) |
| ad_count | Paid ads for city+niche query |
| agency_pages | Competitor pages targeting pair |
| weak_site_pct | % of sampled businesses with weak sites |
| contactable_pct | % with email or phone |
| economic_signal | growth / flat / shrinking |
| demand_score | 0–25 |
| competition_score | 0–20 |
| weakness_score | 0–25 |
| contact_score | 0–15 |
| revenue_score | 0–15 |
| total_score | 0–100 |
| status | candidate / validated / approved / parked / dropped |
| sprint_start | Date outreach sprint started (if approved) |
| sprint_reply_rate | Actual reply rate from sprint |
| sprint_result | continue / pause / drop |
| notes | Free text |
| evaluated_date | Date of last evaluation |

## Integration with existing workflows

- This SOP feeds into `docs/04-Lead-Generation-SOP.md` — only approved pairs enter the lead generation pipeline.
- Scoring data informs `docs/03-ICP-Niches-Scoring.md` — the niche scorecard replaces global niche scoring with city+niche scoring.
- Sprint results feed into `docs/12-KPIs-Dashboard.md` — city+niche funnel KPIs track performance per pair.
- Hook email angles are customized per city+niche in `docs/15-Templates.md`.

## Guardrails

- Do not skip scoring and jump straight to outreach on a hunch.
- Do not run more than 3 active outreach sprints simultaneously (focus beats breadth).
- Do not re-evaluate a parked pair within 90 days unless market data materially changes.
- Human reviews the first 3 go/no-go decisions before the agent operates autonomously on pair selection.

# Ideal Customer Profile, Niches, and Scoring

## Ideal customer profile

The best early customer is a local service business with visible demand, weak digital execution, and enough margin to justify recurring spend.

## Best-fit traits

- Owner-operated or manager-led business
- Local service area model
- Calls, messages, or forms drive revenue
- Website quality is clearly below market expectations
- No in-house technical team
- Business is established enough to pay monthly
- Reviews or reputation indicate legitimate demand

## Poor-fit traits

- Business has a polished modern website already
- Heavy procurement or committee buying process
- Extremely low-ticket service with weak margins
- Owner never uses email or digital tools
- Customer base is entirely offline and non-search driven
- Business requires deep compliance or enterprise-grade systems

## City+niche scoring model

> **Replaces global niche scoring.** Niches are no longer scored in isolation — every niche is evaluated as a city+niche pair because the same niche can be excellent in one city and terrible in another.

Full scoring methodology, query library, and thresholds are defined in `docs/22-Niche-Hunting-SOP.md`.

### Scoring dimensions (100-point scale)

| Dimension | Weight | What it measures |
|---|---:|---|
| Demand | 25 | Maps business count, review volume, review velocity |
| Competition saturation (inverse) | 20 | Fewer ads + fewer agency pages = higher score |
| Website weakness rate | 25 | % of sampled businesses with clearly weak sites |
| Contactability | 15 | % of businesses with reachable email or phone |
| Revenue potential | 15 | Lead value per customer, retainer affordability, niche margin |

### Go/no-go thresholds

A city+niche pair is approved for outreach only when:

- Overall score ≥ 70 / 100
- Contactable rate (email + phone) ≥ 60%
- Weak-site rate ≥ 50%
- Maps density ≥ 20 businesses

### Scorecard artifact

Evaluated pairs are tracked in `data/niche-city-scorecard.csv` with full score breakdowns and sprint outcomes.

## Sample city+niche scorecard (illustrative)

| City | Niche | Demand | Competition | Weakness | Contact | Revenue | Total | Status |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Tampa | Pool services | 22 | 17 | 21 | 13 | 12 | 85 | Approved |
| Austin | Garage door | 20 | 15 | 19 | 11 | 11 | 76 | Approved |
| Charlotte | HVAC | 23 | 6 | 14 | 12 | 13 | 68 | Parked |
| Denver | Dog grooming | 18 | 16 | 20 | 9 | 8 | 71 | Validated |

## Geographic filters

Initial geographic testing should favor US cities where:

- There are enough target businesses to support list building
- Businesses often rely on local search
- Competition is not hyper-sophisticated
- Local lead value is meaningful
- Small business owners still act quickly

## City selection criteria

Choose cities that are:

- Large enough for density
- Not the most elite, agency-saturated metros
- English-speaking and easy to research
- Spread across a few states to reduce local saturation risk
- Showing positive economic growth signals (population, permits, hiring)

## Prospect scoring formula

A simple qualification rule applied to individual leads after a city+niche pair is approved:

- 2 points: No website
- 2 points: Broken mobile layout
- 1 point: Outdated branding or layout
- 1 point: No clear CTA
- 1 point: Slow or cluttered homepage
- 1 point: Poor trust signals
- 1 point: Good business reviews but weak site
- 1 point: Email present and reachable

Suggested prioritization:

- 7–10 points: Hot lead
- 4–6 points: Warm lead
- 0–3 points: Low priority

## Ideal first niche strategy

Start with one city+niche pair only. Build template depth, message sharpness, and proof inside that pair before expanding. Expansion should happen only after the business understands close rates, churn, support demands, and which feature bundle clients actually value.

## Niche expansion rules

Do not add a second city+niche pair until all of the following are true:

- At least 3 paying clients exist in the first pair
- At least one testimonial or result story exists
- The delivery template is stable
- The sales message is repeatable
- Support requests are predictable

## Candidate niche library

Go beyond the obvious defaults. Strong candidates include:

- **Home services**: HVAC, plumbing, roofing, electrical, landscaping, pool services, fence/deck builders, garage door, appliance repair, house cleaning, junk removal, moving companies.
- **Auto**: Auto detailing, mobile mechanic, towing, body shops.
- **Pets**: Dog grooming, pet boarding, veterinary clinics.
- **Health/wellness**: Chiropractors, physical therapy, massage therapy, acupuncture, med spas.
- **Education/activities**: Tutoring centers, music lessons, martial arts studios.
- **Events**: Event venues, caterers, florists, photographers.
- **Personal care**: Tattoo studios, barbershops, nail salons.
- **Property**: Pest control, tree service, septic/drain, foundation repair.

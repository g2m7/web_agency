# Technology and Trends

**Status: COMPLETE**

## Sources

- [Clutch small-business website report](https://clutch.co/resources/state-of-small-business-websites-2025)
- [BrightLocal consumer search behavior](https://www.brightlocal.com/research/consumer-search-behavior/)
- [BrightLocal local consumer review survey 2025](https://www.brightlocal.com/research/local-consumer-review-survey-2025/)
- [FTC CAN-SPAM guide](https://www.ftc.gov/node/81459)
- [FTC CAN-SPAM statute page](https://www.ftc.gov/enforcement/statutes/controlling-assault-non-solicited-pornography-marketing-act-2003-can-spam-act)
- [IAPP new 2026 privacy requirements article](https://iapp.org/news/a/new-year-new-rules-us-state-privacy-requirements-coming-online-as-2026-begins)
- [IAPP state privacy tracker, updated April 20, 2026](https://iapp.org/resources/article/us-state-privacy-legislation-tracker)
- [Durable pricing / positioning](https://durable.co/pricing)
- [Hostinger AI site builder](https://www.hostinger.com/ai-website-builder)
- [Duda plans](https://www.duda.co/plans)
- [10Web pricing](https://10web.io/pricing/)

## Is Google reducing the need for small-business websites?

### Yes for discovery, no for trust and conversion

The website is weaker as a **first-touch discovery** asset than it used to be. But it is still important as an **owned conversion and trust layer**.

Current signals (all figures from [BrightLocal consumer search behavior](https://www.brightlocal.com/research/consumer-search-behavior/) unless noted):

- `15%` of consumers now default directly to Google Maps for local-specific search (BrightLocal).
- `67%` often or always look at reviews after a local business search (BrightLocal).
- `85%` say contact information and opening hours matter when researching local businesses (BrightLocal).
- `40%` of consumers are actively using generative AI within search (BrightLocal).
- `54%` of consumers visit a business website after reading positive reviews ([BrightLocal local consumer review survey 2025](https://www.brightlocal.com/research/local-consumer-review-survey-2025/)).

### Implication

Google is reducing the value of a weak brochure site. It is **not** removing the need for:

- a fast mobile site,
- a credible service page,
- clear CTAs,
- proof assets,
- owned contact / lead capture surfaces.

If anything, AI-assisted search punishes generic sites more aggressively because fewer businesses get surfaced.

## Are AI website builders eating your lunch?

### They are eating the bottom of the market

That is real.

Evidence ([Clutch](https://clutch.co/resources/state-of-small-business-websites-2025) for adoption stats; vendor pages for pricing):

- `41%` of SMBs with websites use no-code builders like Wix or Squarespace (Clutch).
- `34%` use low-code platforms like WordPress or Shopify (Clutch).
- Durable starts at `~$15/mo` ([Durable pricing](https://durable.co/pricing)).
- Hostinger's AI builder promos start around `~$3/mo` ([Hostinger](https://www.hostinger.com/ai-website-builder)).
- 10Web is pushing AI-generated WordPress builds in the `~$20-$45/mo` band ([10Web pricing](https://10web.io/pricing/)).

### What they do well

- instant site generation,
- low perceived risk,
- cheap monthly pricing,
- enough quality for “good enough” buyers.

### What they still do poorly

- niche-specific positioning,
- audit-led sales,
- content extraction / rewriting from real business material,
- local conversion discipline,
- compliance and promise control,
- ongoing done-for-you edits without owner effort.

### Conclusion

AI builders are a **high** threat to any generic website offer.

They are a **medium** threat to a narrow, managed, local-service offer with real sales discipline.

## What SEO / local-search trends matter most in 2025-2026?

| Trend | Signal | What it means |
|---|---|---|
| Google still dominates | `45%` default to Google for local search; `53%` if you include Safari's Google usage (BrightLocal) | Your sites still need Google-first structure |
| Maps matters more | `15%` default directly to Google Maps (BrightLocal) | GBP, reviews, and map presence are no longer optional |
| Multi-platform research is normal | `79%` use multiple platforms at least some of the time (BrightLocal) | Website, Maps, and reviews must agree |
| AI-assisted search is already mainstream | `40%` actively use generative AI in search (BrightLocal) | Structured pages and trustworthy business data matter more |
| Reviews strongly influence path to site | `54%` visit a business website after reading positive reviews (BrightLocal review survey 2025) | Website and reputation now work together, not separately |

## How risky is Google Maps scraping?

### Strategic answer

High risk if it remains a core dependency.

### Honest answer on block rate

There is **no trustworthy public benchmark** for “what percentage of Google Maps scrapers get blocked.” Anyone giving you a precise number is probably selling proxies or scraping infrastructure.

What is real:

- platform terms and anti-bot enforcement exist,
- scale raises detection risk,
- retries / proxies can hide failures temporarily but do not remove platform risk,
- operational reliability is worse than an approved API or licensed dataset.

### Recommended posture

- acceptable for low-volume validation,
- not acceptable as the long-term backbone of a scaled outbound machine,
- migrate before you normalize monthly volume.

## Regulatory risk for your outreach model

## Email

The FTC is explicit that CAN-SPAM applies to **all commercial email**, including B2B outreach. Core requirements include:

- accurate headers,
- non-deceptive subject lines,
- clear ad identification,
- a valid postal address,
- a working opt-out,
- honoring opt-outs within `10 business days`.

The FTC says each violating email can carry penalties of up to `$53,088` ([FTC CAN-SPAM guide](https://www.ftc.gov/node/81459)).

## Privacy

The U.S. privacy burden is getting heavier, not lighter. IAPP flagged new 2026 effective-date requirements in multiple states and continues to track the expanding patchwork of comprehensive state privacy laws.

### Practical implication for you

If you store prospect records, enrich contact data, log communications, and later automate scoring or routing, you need:

- a data inventory,
- vendor agreements,
- deletion / suppression workflows,
- clear retention rules,
- a clean separation between prospect data and client data.

## SMS / phone fallback

This is operationally attractive, but legally touchier than email. Treat any automated SMS or dialer workflow as a separate compliance project before launch.

## Risk Summary

| Risk area | Severity | My read |
|---|---|---|
| DIY / AI builder commoditization | High | Forces you away from generic low-end offers |
| Google Maps / local discovery shift | High | The website alone is less powerful than before |
| Google Maps scraping dependency | High | Fine for validation, dangerous at scale |
| CAN-SPAM / outbound email execution | Medium-high | Manageable if you are disciplined |
| State privacy sprawl | Medium-high | Will matter more as you store more data and automate more decisions |

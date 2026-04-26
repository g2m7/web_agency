# Action Plan

**Status: COMPLETE**

## Sources

- [All prior reports in this folder](./01-EXECUTIVE-SUMMARY.md)
- [Clutch 2026 SMB website report](https://clutch.co/resources/state-of-small-business-websites-2025)
- [BrightLocal consumer search behavior](https://www.brightlocal.com/research/consumer-search-behavior/)
- [FTC CAN-SPAM guide](https://www.ftc.gov/node/81459)
- [IAPP state privacy tracker](https://iapp.org/resources/article/us-state-privacy-legislation-tracker)

## Next 30 Days

1. Lock the first three outreach pairs: `Phoenix + pool service`, `Charlotte + tree service`, `Raleigh + garage door repair`.
2. Set up a compliant outbound stack before first send: separate sending domain, SPF / DKIM / DMARC, physical address, suppression list, clear opt-out handling, and manual approval.
3. Stop treating pricing as the problem. Use `Starter $79`, `Growth $129`, `Pro $249`, and enforce the launch fee beyond the first pilot batch.
4. Run mini-validation on the first three pairs and reject any pair that fails your own thresholds on contactability or weak-site rate.
5. Build proof assets for the exact niches you plan to sell into: one polished demo, one audit example, and one tight hook angle per pair.

## Next 90 Days

1. Move from “generic agency” language to “managed local conversion site” language across docs, dashboard copy, and outreach.
2. Migrate away from Google Maps scraping as the default source if you cross validation-stage volume.
3. Add operator authentication / tighter production hardening before live scale, not after.
4. Raise `Growth` pricing to `~$149` if early conversion and churn data justify it.
5. Get to `5-10` paying clients before expanding niche count; optimize plan mix and churn before breadth.

## Critical Decisions

### Single most important decision right now

Decide whether this business is a **niche-first managed local-service operator** or a **cheap general web-design shop**.

The evidence says the first option is viable and the second one is structurally weak.

## Risk Mitigation Priority

### Single biggest risk to mitigate immediately

Protect outbound deliverability and compliance before first outreach.

Why:

- bad first-wave outreach can damage your sending domain,
- low-quality outbound can make a good niche look bad,
- FTC rules are clear enough that sloppy execution is avoidable.

### Ordered risk list

1. Outbound setup and compliance.
2. Wrong first city+niche pair.
3. Ongoing dependence on scraping as a core lead source.
4. Underpricing that attracts support-heavy clients.
5. Expanding before month-1 and month-2 retention are understood.

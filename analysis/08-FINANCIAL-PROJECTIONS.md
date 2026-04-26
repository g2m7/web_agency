# Financial Projections

**Status: COMPLETE**

## Sources

- [Clutch website adoption / outsourcing data](https://clutch.co/resources/state-of-small-business-websites-2025)
- [WebFX local SEO pricing](https://www.webfx.com/local-seo/pricing/)
- [WebFX web design pricing](https://www.webfx.com/web-design/pricing/)
- [Pricing conclusions from Report 4](./05-PRICING-STRATEGY.md)
- [Roadmap / KPI targets in repo docs](../docs/12-KPIs-Dashboard.md)

## Assumptions

These are not “best case” numbers. They are realistic early-stage outbound assumptions for a business with:

- no brand,
- no testimonials,
- no production outreach history,
- a human-reviewed first wave.

## Realistic Funnel

### Base case

| Stage | Base-case conversion |
|---|---:|
| Validated leads contacted -> any reply | `3%-5%` |
| Contacted -> positive reply | `1.0%-1.5%` |
| Positive reply -> demo sent | `70%-85%` |
| Demo sent -> paid | `20%-35%` |
| Contacted -> paid overall | about `0.2%-0.5%` |

### Example using 1,000 validated leads

| Stage | Base case |
|---|---:|
| Leads contacted | `1,000` |
| Replies | `35-50` |
| Positive replies | `10-15` |
| Demos sent | `8-12` |
| Paid clients | `2-4` |

### Brutal read

If your first 1,000 contacted leads do not produce at least `2` paid clients, the problem is probably not software. It is usually:

- bad pair selection,
- weak issue selection in hook emails,
- deliverability,
- or too-broad positioning.

## Expected CAC

## Cash CAC

Because you are outbound-led and software-light, direct cash CAC can stay relatively low:

- list building / enrichment / validation / infra for early sprints: roughly `~$100-$400` per 1,000-contact cycle,
- sending domain / inbox / tooling / misc ops: another `~$50-$150/mo`.

If 1,000 validated leads produce `2-4` clients, cash CAC can land around:

- **`~$125-$275/client`** in a good early cycle,
- **`~$300-$500/client`** in a more average early cycle.

## True CAC including operator time

This is the more honest number.

Once you include:

- manual email review,
- demo review,
- quality checks,
- strategy time,

the true early CAC is more like:

- **`~$300-$900/client`**.

That is still workable at your current pricing if clients stay for multiple months and you enforce the launch fee.

## Projected LTV by Plan

I would not model early retention aggressively. A conservative early-stage assumption is:

- `Starter`: `8` months average life
- `Growth`: `10` months
- `Pro`: `12` months

### Gross revenue LTV

Assumes one launch fee equal to the plan’s launch price plus monthly recurring revenue over the average life.

| Plan | Monthly price | Launch fee | Avg. life | Gross revenue LTV |
|---|---:|---:|---:|---:|
| Starter | `$79` | `$79` | `8 mo` | `$711` |
| Growth | `$129` | `$129` | `10 mo` | `$1,419` |
| Pro | `$249` | `$249` | `12 mo` | `$3,237` |

### Gross-profit view

If delivery and support stay disciplined, a plausible gross-margin assumption is:

| Plan | Assumed gross margin | Approx. gross-profit LTV |
|---|---:|---:|
| Starter | `82%` | about `$583` |
| Growth | `85%` | about `$1,206` |
| Pro | `88%` | about `$2,849` |

## Break-even by Client

### If you enforce the launch fee

- `Pro`: often breaks even in `month 1`
- `Growth`: usually breaks even in `month 1-2`
- `Starter`: often `month 2-3`, depending on support drag

### If you waive the launch fee

Everything gets worse:

- `Starter` can become unattractive fast,
- `Growth` becomes merely okay,
- `Pro` still works best.

That is why waiving setup forever is a mistake.

## Path to $1K, $5K, and $10K MRR

### If Growth is the default plan

| MRR target | Growth clients needed |
|---|---:|
| `$1K MRR` | `8` |
| `$5K MRR` | `39` |
| `$10K MRR` | `78` |

### If your blended ARPA is about $143

That would correspond roughly to a mix weighted toward `Growth` with some `Starter` and `Pro`.

| MRR target | Clients needed at ~$143 ARPA |
|---|---:|
| `$1K MRR` | `7` |
| `$5K MRR` | `35` |
| `$10K MRR` | `70` |

### Lead volume required at a 0.3% lead-to-paid rate

| MRR target | Approx. client target | Approx. validated leads needed |
|---|---:|---:|
| `$1K` | `7` | about `2,300` |
| `$5K` | `35` | about `11,700` |
| `$10K` | `70` | about `23,300` |

That is why the first few city+niche choices matter so much. A small lift in reply quality has huge downstream impact.

## Main Unit-Economics Risks

- **Too many Starter clients.** They can look easy to close and still be your worst margin.
- **Low demo request rate.** Your 2-step motion lives or dies on getting enough positive replies to justify demos.
- **Weak retention.** If average life is `<=4-5 months`, the model gets much less attractive.
- **Manual review drag.** If human QA stays heavy for too long, CAC remains high.
- **Lead-source instability.** If list generation becomes unreliable, your pipeline cost and velocity both suffer.

## Overall Read

The model can work, but it is not self-proving. The economics get attractive only if:

- you keep CAC below roughly one-third to one-half of gross LTV,
- `Growth` becomes the dominant plan,
- churn stays controlled,
- and you do not let low-ticket clients absorb high-touch labor.

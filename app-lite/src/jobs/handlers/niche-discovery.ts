/**
 * Autonomous Niche Discovery Handler
 *
 * Instead of requiring manual niche+city pair creation, this handler
 * autonomously discovers profitable niches by:
 *
 * 1. BROAD PROBE: Searches cities with generic queries ("local services",
 *    "businesses near me") and harvests Google Maps categories to find
 *    what each city is actually known for.
 *
 * 2. TARGETED PROBE: For discovered categories + seed niches, runs
 *    density checks to measure business count per pair.
 *
 * 3. AUTO-SCORE: Scores viable pairs on the 100-point model.
 *
 * 4. AUTO-VALIDATE: Queues mini-validation scrapes for top scorers.
 *
 * 5. AUTO-APPROVE: Approves pairs that pass all go/no-go thresholds
 *    (after human reviews the first 3 decisions).
 */

import type { DbClient } from '../../db'
import type { ScheduledJob } from '../queue'
import { enqueueJob } from '../queue'
import {
  scrapeGoogleMaps,
  parseCityState,
  type ScraperOptions,
} from '../../scraper/google-maps'
import { scoreNichePair, type NicheRawData } from '../../scraper/niche-scorer'
import { US_CITIES, sampleCities, type CityEntry } from '../../data/us-cities'
import { NICHE_LIBRARY, type NicheEntry } from '../../data/niche-library'

// ── Broad discovery queries ──────────────────────────────────
// These generic queries let Google Maps tell us what businesses
// actually exist in a city, rather than us guessing.

const BROAD_QUERIES = [
  'local services',
  'popular businesses',
  'home services',
  'health and wellness',
  'auto services',
  'pet services',
  'food and drink',
  'personal care',
  'professional services',
  'entertainment and recreation',
]

/**
 * Extract unique business categories from scrape results.
 * Google Maps returns a `category` field per business — these
 * are the real niches that exist in each city.
 */
function extractCategories(results: Array<{ category: string | null }>): string[] {
  const cats = new Map<string, number>()
  for (const r of results) {
    if (!r.category) continue
    const normalized = r.category.toLowerCase().trim()
    if (normalized.length < 3) continue
    cats.set(normalized, (cats.get(normalized) ?? 0) + 1)
  }
  // Return categories that appeared at least twice (signal, not noise)
  return [...cats.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat)
}

/**
 * Map a discovered Google Maps category to a known niche entry,
 * or create a new dynamic niche name from the category.
 */
function categoryToNiche(category: string): { niche: string; revenueEstimate: 'high' | 'moderate' | 'low' | 'very_low' } {
  const lower = category.toLowerCase()

  // Try to match against our known library
  for (const entry of NICHE_LIBRARY) {
    if (entry.name === lower) return { niche: entry.name, revenueEstimate: entry.revenueEstimate }
    for (const term of entry.searchTerms) {
      if (lower.includes(term) || term.includes(lower)) {
        return { niche: entry.name, revenueEstimate: entry.revenueEstimate }
      }
    }
  }

  // Unknown category — use it directly as a discovered niche
  return { niche: lower, revenueEstimate: 'moderate' }
}

// ── Main handler ─────────────────────────────────────────────

export async function handleNicheDiscover(
  db: DbClient,
  job: ScheduledJob,
): Promise<Record<string, unknown>> {
  const config = await db.findGlobal({ slug: 'system-config' })

  const enabled = config.discoveryEnabled ?? config.discovery_enabled ?? true
  if (!enabled) {
    return { status: 'skipped', reason: 'Discovery is disabled' }
  }

  const batchSize = config.discoveryBatchSize ?? config.discovery_batch_size ?? 20
  const excludeNiches: string[] = config.discoveryExcludeNiches ?? config.discovery_exclude_niches ?? []
  const priorityCities: string[] = config.discoveryPriorityCities ?? config.discovery_priority_cities ?? []

  const scraperOptions: ScraperOptions = {
    signal: AbortSignal.timeout(900_000), // 15 min max
    maxRequestsPerMinute: 4,
    maxRetries: 2,
    retryBaseDelayMs: 5000,
    interRequestDelayMs: [6000, 15000],
  }

  const stats = {
    citiesProbed: 0,
    categoriesDiscovered: 0,
    pairsCreated: 0,
    pairsSkipped: 0,
    pairsScored: 0,
    validationQueued: 0,
    errors: [] as string[],
  }

  // ── Phase 1: Pick cities to probe ──────────────────────────
  let citiesToProbe: CityEntry[]

  if (priorityCities.length > 0) {
    // Use priority cities first
    citiesToProbe = priorityCities
      .map(entry => {
        const { city, state } = parseCityState(entry)
        return US_CITIES.find(c => c.city === city && c.state === state)
      })
      .filter((c): c is CityEntry => c !== undefined)
      .slice(0, Math.ceil(batchSize / 3))

    // Fill remaining with random sample
    const remaining = batchSize - citiesToProbe.length
    if (remaining > 0) {
      const sampled = sampleCities(remaining * 2, 1)
        .filter(c => !citiesToProbe.some(p => p.city === c.city && p.state === c.state))
        .slice(0, remaining)
      citiesToProbe = [...citiesToProbe, ...sampled]
    }
  } else {
    citiesToProbe = sampleCities(Math.ceil(batchSize / 2), 1)
  }

  // ── Phase 2: Broad probe — discover categories per city ────
  const discoveredPairs: Array<{
    city: string
    state: string
    niche: string
    mapsCount: number
    revenueEstimate: string
    avgReviewCount: number
    phonePct: number
    websitePct: number
  }> = []

  for (const cityEntry of citiesToProbe) {
    if (scraperOptions.signal?.aborted) break

    // Pick 2 random broad queries per city
    const queries = [...BROAD_QUERIES].sort(() => Math.random() - 0.5).slice(0, 2)

    for (const query of queries) {
      if (scraperOptions.signal?.aborted) break

      try {
        const results = await scrapeGoogleMaps(
          query,
          cityEntry.city,
          cityEntry.state,
          scraperOptions,
        )

        if (results.length === 0) continue
        stats.citiesProbed++

        // Extract unique categories from results
        const categories = extractCategories(results)
        stats.categoriesDiscovered += categories.length

        for (const cat of categories) {
          if (excludeNiches.includes(cat)) continue

          const { niche, revenueEstimate } = categoryToNiche(cat)
          if (excludeNiches.includes(niche)) continue

          const catResults = results.filter(r =>
            r.category?.toLowerCase().includes(cat),
          )
          const mapsCount = catResults.length
          const avgReviewCount = catResults.length > 0
            ? catResults.reduce((s, r) => s + (r.reviewCount ?? 0), 0) / catResults.length
            : 0
          const withPhone = catResults.filter(r => r.phone).length
          const withWebsite = catResults.filter(r => r.website).length

          discoveredPairs.push({
            city: cityEntry.city,
            state: cityEntry.state,
            niche,
            mapsCount,
            revenueEstimate,
            avgReviewCount,
            phonePct: catResults.length > 0 ? Math.round((withPhone / catResults.length) * 100) : 0,
            websitePct: catResults.length > 0 ? Math.round((withWebsite / catResults.length) * 100) : 0,
          })
        }
      } catch (err: any) {
        if (err.name === 'AbortError') break
        stats.errors.push(`probe ${cityEntry.city}: ${err.message}`)
      }
    }
  }

  // Also add seed niche probes for cities that haven't been checked
  // Pick a few random niches from the library to try
  const seedNiches = [...NICHE_LIBRARY]
    .filter(n => !excludeNiches.includes(n.name) && !n.franchiseRisk)
    .sort(() => Math.random() - 0.5)
    .slice(0, 5)

  const seedCities = sampleCities(4, 2)
  for (const city of seedCities) {
    for (const niche of seedNiches) {
      discoveredPairs.push({
        city: city.city,
        state: city.state,
        niche: niche.name,
        mapsCount: 0,
        revenueEstimate: niche.revenueEstimate,
        avgReviewCount: 0,
        phonePct: 0,
        websitePct: 0,
      })
    }
  }

  // ── Phase 3: Deduplicate against existing pairs + create ────
  stats.errors.push(`[DEBUG] Phase 3 start: discoveredPairs.length=${discoveredPairs.length}`)
  if (discoveredPairs.length > 0) {
    stats.errors.push(`[DEBUG] Sample pairs: ${discoveredPairs.slice(0, 3).map(p => `${p.niche}/${p.city}`).join(', ')}`)
  }
  // Limit to batchSize
  const uniquePairs = new Map<string, typeof discoveredPairs[0]>()
  for (const pair of discoveredPairs) {
    const key = `${pair.niche}:${pair.city}:${pair.state}`.toLowerCase()
    if (!uniquePairs.has(key)) {
      uniquePairs.set(key, pair)
    }
  }

  const probeSignal = AbortSignal.timeout(900_000) // 15 min for Phase 3 probes

  const candidatePairs = [...uniquePairs.values()].slice(0, batchSize)

  stats.errors.push(`[DEBUG] discoveredPairs=${discoveredPairs.length} uniquePairs=${uniquePairs.size} candidatePairs=${candidatePairs.length} batchSize=${batchSize}`)

  for (const pair of candidatePairs) {

    // Check if this pair already exists
    const existing = await db.find({
      collection: 'niche-city-pairs',
      where: {
        and: [
          { city: { equals: pair.city } },
          { state: { equals: pair.state } },
          { niche: { equals: pair.niche } },
        ],
      },
      limit: 1,
    })

    if (existing.totalDocs > 0) {
      stats.pairsSkipped++
      continue
    }

    // Only re-probe if the broad probe found very few results.
    // If broad probe already found >= 3 businesses, trust that count and skip
    // the expensive targeted re-probe to save rate limit budget.
    let actualMapsCount = pair.mapsCount
    let probeAvgReview = pair.avgReviewCount
    let probePhonePct = pair.phonePct
    let probeWebsitePct = pair.websitePct
    if (actualMapsCount < 3 && !probeSignal.aborted) {
      try {
        const results = await scrapeGoogleMaps(
          pair.niche,
          pair.city,
          pair.state,
          { ...scraperOptions, signal: probeSignal },
        )
        actualMapsCount = results.length
        if (results.length > 0) {
          probeAvgReview = results.reduce((s, r) => s + (r.reviewCount ?? 0), 0) / results.length
          probePhonePct = Math.round((results.filter(r => r.phone).length / results.length) * 100)
          probeWebsitePct = Math.round((results.filter(r => r.website).length / results.length) * 100)
        }
      } catch {
        // On error, keep the broad probe count — don't zero it out
      }
    }

    // Accept pairs with at least 2 businesses — the scorer will rank them
    if (actualMapsCount < 2) {
      stats.pairsSkipped++
      continue
    }

    // Create the pair as 'probed'
    try {
      const created = await db.create({
        collection: 'niche-city-pairs',
        data: {
          city: pair.city,
          state: pair.state,
          niche: pair.niche,
          maps_count: actualMapsCount,
          review_velocity: Math.round(probeAvgReview),
          ad_count: 0,
          agency_pages: 0,
          weak_site_pct: probeWebsitePct > 0 ? Math.max(10, 100 - probeWebsitePct) : 50,
          contactable_pct: probePhonePct > 0 ? probePhonePct : 60,
          economic_signal: 'flat',
          revenue_estimate: pair.revenueEstimate,
          status: 'candidate',
          notes: 'Auto-discovered by niche_discover job',
        },
      })

      stats.pairsCreated++

      // ── Phase 4: Auto-score the pair ──────────────────────
      const rawData: NicheRawData = {
        mapsCount: actualMapsCount,
        reviewVelocity: Math.round(probeAvgReview),
        adCount: 0,
        agencyPages: 0,
        weakSitePct: probeWebsitePct > 0 ? Math.max(10, 100 - probeWebsitePct) : 50,
        contactablePct: probePhonePct > 0 ? probePhonePct : 60,
        economicSignal: 'flat',
        revenueEstimate: pair.revenueEstimate as any,
      }

      const scores = scoreNichePair(rawData)

      await db.update({
        collection: 'niche-city-pairs',
        id: String(created.id),
        data: {
          demand_score: scores.demandScore,
          competition_score: scores.competitionScore,
          weakness_score: scores.weaknessScore,
          contact_score: scores.contactScore,
          revenue_score: scores.revenueScore,
          total_score: scores.totalScore,
          status: 'scored',
          evaluated_at: new Date().toISOString(),
        },
      })
      stats.pairsScored++
    } catch (err: any) {
      stats.errors.push(`create pair ${pair.niche}/${pair.city}: ${err.message}`)
    }
  }

  // ── Phase 5: Queue validation for top scored pairs ─────────
  const topScored = await db.find({
    collection: 'niche-city-pairs',
    where: {
      and: [
        { status: { equals: 'scored' } },
        { total_score: { greater_than: 55 } },
      ],
    },
    limit: 3,
    sort: '-totalScore',
  })

  for (const pair of topScored.docs) {
    try {
      await enqueueJob(db, 'niche_validate', {
        nicheCityPairId: String(pair.id),
        triggeredBy: 'niche_discover',
      })
      stats.validationQueued++
    } catch {
      // Non-fatal
    }
  }

  // Update last run timestamp
  await db.updateGlobal({
    slug: 'system-config',
    data: { discovery_last_run: new Date().toISOString() },
  })

  return {
    status: 'completed',
    ...stats,
    job_id: job.id,
  }
}

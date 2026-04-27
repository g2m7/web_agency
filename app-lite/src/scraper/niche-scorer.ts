/**
 * Niche City Pair Scorer
 *
 * Pure function module implementing the 100-point scoring rubric from doc 22.
 * Five dimensions: Demand (25), Competition (20), Weakness (25), Contactability (15), Revenue (15).
 */

import type { EconomicSignal } from '../types'

// ── Input types ──────────────────────────────────────────────

export interface NicheRawData {
  mapsCount: number
  reviewVelocity: number
  adCount: number
  agencyPages: number
  weakSitePct: number       // 0–100
  contactablePct: number    // 0–100
  economicSignal: EconomicSignal
  revenueEstimate: 'high' | 'moderate' | 'low' | 'very_low'
}

export interface NicheScores {
  demandScore: number       // 0–25
  competitionScore: number  // 0–20
  weaknessScore: number     // 0–25
  contactScore: number      // 0–15
  revenueScore: number      // 0–15
  totalScore: number        // 0–100
}

export interface GoNoGoResult {
  decision: 'approved' | 'parked'
  reasons: string[]
}

export interface ValidationData {
  contactablePct: number    // actual % from mini-validation
  weakSitePct: number       // actual % from mini-validation
  mapsCount: number         // actual business count
}

// ── Scoring functions ────────────────────────────────────────

/**
 * Demand score (0–25)
 * Based on Maps business count, review volume, and review velocity.
 */
export function scoreDemand(mapsCount: number, reviewVelocity: number): number {
  // Maps density scoring
  let densityScore: number
  if (mapsCount >= 50) densityScore = 15
  else if (mapsCount >= 25) densityScore = 10
  else if (mapsCount >= 15) densityScore = 5
  else densityScore = 2

  // Review velocity scoring (avg reviews in last 6 months)
  let velocityScore: number
  if (reviewVelocity >= 10) velocityScore = 10
  else if (reviewVelocity >= 5) velocityScore = 7
  else if (reviewVelocity >= 2) velocityScore = 4
  else velocityScore = 1

  return Math.min(25, densityScore + velocityScore)
}

/**
 * Competition saturation — inverse (0–20)
 * Fewer ads + fewer agency pages = higher score.
 */
export function scoreCompetition(adCount: number, agencyPages: number): number {
  const total = adCount + agencyPages

  if (total === 0) return 20
  if (total <= 2) return 15
  if (total <= 5) return 9
  if (total <= 8) return 4
  return 1
}

/**
 * Website weakness rate (0–25)
 * % of sampled businesses with weak sites.
 */
export function scoreWeakness(weakSitePct: number): number {
  if (weakSitePct >= 70) return 25
  if (weakSitePct >= 50) return 19
  if (weakSitePct >= 30) return 12
  if (weakSitePct >= 15) return 6
  return 2
}

/**
 * Contactability (0–15)
 * % of businesses with reachable email or phone.
 */
export function scoreContactability(contactablePct: number): number {
  if (contactablePct >= 70) return 15
  if (contactablePct >= 50) return 11
  if (contactablePct >= 30) return 7
  if (contactablePct >= 15) return 3
  return 1
}

/**
 * Revenue potential (0–15)
 * Based on estimated lead value and niche margin.
 */
export function scoreRevenue(
  revenueEstimate: 'high' | 'moderate' | 'low' | 'very_low',
  economicSignal: EconomicSignal,
): number {
  const baseScores: Record<string, number> = {
    high: 14,
    moderate: 10,
    low: 6,
    very_low: 2,
  }
  const base = baseScores[revenueEstimate] ?? 6

  // Economic signal modifier
  const modifier = economicSignal === 'growth' ? 1 : economicSignal === 'shrinking' ? -2 : 0

  return Math.max(0, Math.min(15, base + modifier))
}

// ── Composite scorer ─────────────────────────────────────────

/**
 * Score a city+niche pair on the 100-point model.
 */
export function scoreNichePair(data: NicheRawData): NicheScores {
  const demandScore = scoreDemand(data.mapsCount, data.reviewVelocity)
  const competitionScore = scoreCompetition(data.adCount, data.agencyPages)
  const weaknessScore = scoreWeakness(data.weakSitePct)
  const contactScore = scoreContactability(data.contactablePct)
  const revenueScore = scoreRevenue(data.revenueEstimate, data.economicSignal)
  const totalScore = demandScore + competitionScore + weaknessScore + contactScore + revenueScore

  return {
    demandScore,
    competitionScore,
    weaknessScore,
    contactScore,
    revenueScore,
    totalScore,
  }
}

// ── Go / No-Go evaluation ────────────────────────────────────

/**
 * Evaluate whether a scored+validated pair meets go/no-go thresholds.
 *
 * Thresholds from doc 22:
 * - Overall score >= 70
 * - Contactable rate >= 60%
 * - Weak-site rate >= 50%
 * - Maps density >= 20 businesses
 */
export function evaluateGoNoGo(
  totalScore: number,
  validation: ValidationData,
): GoNoGoResult {
  const reasons: string[] = []

  if (totalScore < 70) {
    reasons.push(`Total score ${totalScore} is below threshold of 70`)
  }
  if (validation.contactablePct < 60) {
    reasons.push(`Contactable rate ${validation.contactablePct}% is below 60% threshold`)
  }
  if (validation.weakSitePct < 50) {
    reasons.push(`Weak-site rate ${validation.weakSitePct}% is below 50% threshold`)
  }
  if (validation.mapsCount < 20) {
    reasons.push(`Maps density ${validation.mapsCount} is below 20 business minimum`)
  }

  return {
    decision: reasons.length === 0 ? 'approved' : 'parked',
    reasons,
  }
}

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
function lerp(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  const t = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)))
  return Math.round((outMin + t * (outMax - outMin)) * 10) / 10
}

export function scoreDemand(mapsCount: number, reviewVelocity: number): number {
  const densityScore = lerp(Math.min(mapsCount, 80), 0, 80, 0, 15)
  const velocityScore = lerp(Math.min(reviewVelocity, 20), 0, 20, 0, 10)
  return Math.min(25, Math.round(densityScore + velocityScore))
}

export function scoreCompetition(adCount: number, agencyPages: number): number {
  const total = adCount + agencyPages
  return Math.round(lerp(Math.min(total, 15), 0, 15, 20, 0))
}

export function scoreWeakness(weakSitePct: number): number {
  return Math.round(lerp(Math.min(weakSitePct, 100), 0, 100, 0, 25))
}

export function scoreContactability(contactablePct: number): number {
  return Math.round(lerp(Math.min(contactablePct, 100), 0, 100, 0, 15))
}

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

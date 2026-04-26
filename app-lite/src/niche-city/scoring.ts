import type { NicheCityPairStatus, NicheCityPairTarget } from '../types'
import { parseCityState } from '../scraper/google-maps'

export interface PairMetricsInput {
  city: string
  state?: string
  niche: string
  mapsCount?: number
  reviewVelocity?: number
  adCount?: number
  agencyPages?: number
  weakSitePct?: number
  contactablePct?: number
  economicSignal?: string
  revenueScore?: number
  notes?: string
}

export interface ScoredPair {
  uniqueKey: string
  city: string
  state: string
  niche: string
  mapsCount: number
  reviewVelocity: number
  adCount: number
  agencyPages: number
  weakSitePct: number
  contactablePct: number
  economicSignal: string
  demandScore: number
  competitionScore: number
  weaknessScore: number
  contactScore: number
  revenueScore: number
  totalScore: number
  recommendedStatus: Exclude<NicheCityPairStatus, 'candidate' | 'validated' | 'dropped'>
  thresholdReasons: string[]
}

const HIGH_REVENUE_NICHES = [
  'hvac',
  'roofing',
  'plumbing',
  'foundation repair',
  'pool services',
  'pest control',
  'tree service',
  'septic',
  'drain',
  'garage door',
  'med spa',
  'chiropractor',
]

const MID_REVENUE_NICHES = [
  'auto detailing',
  'mobile mechanic',
  'towing',
  'dog grooming',
  'pet boarding',
  'veterinary',
  'physical therapy',
  'massage therapy',
  'martial arts',
  'moving',
  'junk removal',
]

function clampInt(value: unknown, min: number, max: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : min
  return Math.max(min, Math.min(max, n))
}

export function normalizePairKey(niche: string, city: string, state: string): string {
  return [niche, city, state]
    .map((part) => part.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    .filter(Boolean)
    .join(':')
}

export function normalizePairTarget(input: string | NicheCityPairTarget): NicheCityPairTarget {
  if (typeof input === 'string') {
    const [nichePart, locationPart] = input.includes('|')
      ? input.split('|', 2)
      : ['', input]
    const { city, state } = parseCityState(locationPart ?? '')
    return { niche: (nichePart || '').trim(), city, state }
  }

  const location = input.state ? `${input.city}, ${input.state}` : input.city
  const { city, state } = parseCityState(location)
  return {
    id: input.id,
    niche: input.niche.trim().toLowerCase(),
    city,
    state,
    maxResults: input.maxResults,
  }
}

export function scorePair(input: PairMetricsInput): ScoredPair {
  const { city, state } = parseCityState(input.state ? `${input.city}, ${input.state}` : input.city)
  const niche = input.niche.trim().toLowerCase()
  const mapsCount = clampInt(input.mapsCount, 0, 10000)
  const reviewVelocity = clampInt(input.reviewVelocity, 0, 10000)
  const adCount = clampInt(input.adCount, 0, 1000)
  const agencyPages = clampInt(input.agencyPages, 0, 1000)
  const weakSitePct = clampInt(input.weakSitePct, 0, 100)
  const contactablePct = clampInt(input.contactablePct, 0, 100)
  const economicSignal = (input.economicSignal ?? 'flat').toLowerCase()

  const demandScore = scoreDemand(mapsCount, reviewVelocity)
  const competitionScore = scoreCompetition(adCount, agencyPages)
  const weaknessScore = scoreWeakness(weakSitePct)
  const contactScore = scoreContactability(contactablePct)
  const revenueScore = input.revenueScore !== undefined
    ? clampInt(input.revenueScore, 0, 15)
    : inferRevenueScore(niche, economicSignal)
  const totalScore = demandScore + competitionScore + weaknessScore + contactScore + revenueScore

  const thresholdReasons: string[] = []
  if (totalScore < 70) thresholdReasons.push('total_score_below_70')
  if (contactablePct < 60) thresholdReasons.push('contactable_pct_below_60')
  if (weakSitePct < 50) thresholdReasons.push('weak_site_pct_below_50')
  if (mapsCount < 20) thresholdReasons.push('maps_count_below_20')

  return {
    uniqueKey: normalizePairKey(niche, city, state),
    city,
    state,
    niche,
    mapsCount,
    reviewVelocity,
    adCount,
    agencyPages,
    weakSitePct,
    contactablePct,
    economicSignal,
    demandScore,
    competitionScore,
    weaknessScore,
    contactScore,
    revenueScore,
    totalScore,
    recommendedStatus: thresholdReasons.length === 0 ? 'approved' : 'parked',
    thresholdReasons,
  }
}

function scoreDemand(mapsCount: number, reviewVelocity: number): number {
  const velocityBump = reviewVelocity >= 15 ? 3 : reviewVelocity >= 5 ? 1 : 0
  if (mapsCount >= 50) return Math.min(25, 22 + velocityBump)
  if (mapsCount >= 25) return Math.min(19, 16 + velocityBump)
  if (mapsCount >= 15) return Math.min(12, 9 + velocityBump)
  return Math.min(6, Math.floor(mapsCount / 3))
}

function scoreCompetition(adCount: number, agencyPages: number): number {
  const saturation = adCount + agencyPages
  if (saturation <= 0) return 20
  if (saturation <= 2) return 15
  if (saturation <= 5) return 9
  return 4
}

function scoreWeakness(weakSitePct: number): number {
  if (weakSitePct >= 70) return 22
  if (weakSitePct >= 50) return 16
  if (weakSitePct >= 30) return 9
  return 4
}

function scoreContactability(contactablePct: number): number {
  if (contactablePct >= 70) return 13
  if (contactablePct >= 60) return 11
  if (contactablePct >= 50) return 9
  if (contactablePct >= 30) return 5
  return 2
}

function inferRevenueScore(niche: string, economicSignal: string): number {
  const normalized = niche.toLowerCase()
  const base = HIGH_REVENUE_NICHES.some((n) => normalized.includes(n))
    ? 13
    : MID_REVENUE_NICHES.some((n) => normalized.includes(n))
      ? 10
      : 8

  if (economicSignal.includes('growing') || economicSignal.includes('growth')) return Math.min(15, base + 1)
  if (economicSignal.includes('shrinking') || economicSignal.includes('declining')) return Math.max(0, base - 3)
  return base
}

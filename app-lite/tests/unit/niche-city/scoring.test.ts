import { describe, expect, it } from 'vitest'
import { normalizePairKey, scorePair } from '../../../src/niche-city/scoring'

describe('niche-city scoring', () => {
  it('approves pairs that clear all go/no-go thresholds', () => {
    const scored = scorePair({
      niche: 'pool services',
      city: 'Tampa, FL',
      mapsCount: 62,
      reviewVelocity: 12,
      adCount: 1,
      agencyPages: 1,
      weakSitePct: 72,
      contactablePct: 74,
      economicSignal: 'growth',
    })

    expect(scored.totalScore).toBeGreaterThanOrEqual(70)
    expect(scored.recommendedStatus).toBe('approved')
    expect(scored.thresholdReasons).toEqual([])
  })

  it('parks pairs that miss any required threshold even with decent total score', () => {
    const scored = scorePair({
      niche: 'garage door',
      city: 'Austin, TX',
      mapsCount: 45,
      weakSitePct: 44,
      contactablePct: 72,
      adCount: 0,
      agencyPages: 0,
      economicSignal: 'growth',
    })

    expect(scored.recommendedStatus).toBe('parked')
    expect(scored.thresholdReasons).toContain('weak_site_pct_below_50')
  })

  it('builds stable unique keys from niche and location', () => {
    expect(normalizePairKey('Pool Services', 'Tampa', 'FL')).toBe('pool-services:tampa:fl')
  })
})

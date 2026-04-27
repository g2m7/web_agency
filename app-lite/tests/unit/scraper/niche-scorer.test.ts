import { describe, it, expect } from 'vitest'
import {
  scoreDemand,
  scoreCompetition,
  scoreWeakness,
  scoreContactability,
  scoreRevenue,
  scoreNichePair,
  evaluateGoNoGo,
  type NicheRawData,
} from '../../../src/scraper/niche-scorer'

describe('scoreDemand', () => {
  it('scores high demand (50+ Maps, strong velocity)', () => {
    const score = scoreDemand(60, 12)
    expect(score).toBe(25)
  })

  it('scores moderate demand (25–49 Maps)', () => {
    const score = scoreDemand(30, 6)
    expect(score).toBe(17)
  })

  it('scores low demand (15–24 Maps)', () => {
    const score = scoreDemand(18, 3)
    expect(score).toBe(9)
  })

  it('scores very low demand (<15 Maps)', () => {
    const score = scoreDemand(10, 1)
    expect(score).toBe(3)
  })

  it('caps at 25', () => {
    const score = scoreDemand(100, 20)
    expect(score).toBeLessThanOrEqual(25)
  })
})

describe('scoreCompetition', () => {
  it('scores maximum for zero ads and agency pages', () => {
    expect(scoreCompetition(0, 0)).toBe(20)
  })

  it('scores high for minimal competition (1–2 total)', () => {
    expect(scoreCompetition(1, 1)).toBe(15)
  })

  it('scores moderate for 3–5 total', () => {
    expect(scoreCompetition(3, 2)).toBe(9)
  })

  it('scores low for 6–8 total', () => {
    expect(scoreCompetition(4, 4)).toBe(4)
  })

  it('scores minimum for highly saturated', () => {
    expect(scoreCompetition(10, 5)).toBe(1)
  })
})

describe('scoreWeakness', () => {
  it('scores maximum for >= 70% weak sites', () => {
    expect(scoreWeakness(75)).toBe(25)
  })

  it('scores high for 50–69% weak sites', () => {
    expect(scoreWeakness(55)).toBe(19)
  })

  it('scores moderate for 30–49% weak sites', () => {
    expect(scoreWeakness(40)).toBe(12)
  })

  it('scores low for 15–29% weak sites', () => {
    expect(scoreWeakness(20)).toBe(6)
  })

  it('scores minimum for <15% weak sites', () => {
    expect(scoreWeakness(10)).toBe(2)
  })
})

describe('scoreContactability', () => {
  it('scores maximum for >= 70% contactable', () => {
    expect(scoreContactability(80)).toBe(15)
  })

  it('scores high for 50–69% contactable', () => {
    expect(scoreContactability(60)).toBe(11)
  })

  it('scores moderate for 30–49% contactable', () => {
    expect(scoreContactability(35)).toBe(7)
  })

  it('scores low for <15% contactable', () => {
    expect(scoreContactability(10)).toBe(1)
  })
})

describe('scoreRevenue', () => {
  it('scores high revenue with growth signal', () => {
    expect(scoreRevenue('high', 'growth')).toBe(15)
  })

  it('scores high revenue with flat signal', () => {
    expect(scoreRevenue('high', 'flat')).toBe(14)
  })

  it('scores moderate revenue with growth signal', () => {
    expect(scoreRevenue('moderate', 'growth')).toBe(11)
  })

  it('penalizes shrinking economies', () => {
    const score = scoreRevenue('moderate', 'shrinking')
    expect(score).toBe(8)
  })

  it('scores very low revenue', () => {
    const score = scoreRevenue('very_low', 'flat')
    expect(score).toBe(2)
  })

  it('clamps to 0 minimum', () => {
    const score = scoreRevenue('very_low', 'shrinking')
    expect(score).toBeGreaterThanOrEqual(0)
  })
})

describe('scoreNichePair', () => {
  it('computes a strong pair correctly (all good signals)', () => {
    const data: NicheRawData = {
      mapsCount: 55,
      reviewVelocity: 12,
      adCount: 0,
      agencyPages: 0,
      weakSitePct: 75,
      contactablePct: 80,
      economicSignal: 'growth',
      revenueEstimate: 'high',
    }
    const scores = scoreNichePair(data)
    expect(scores.demandScore).toBe(25)
    expect(scores.competitionScore).toBe(20)
    expect(scores.weaknessScore).toBe(25)
    expect(scores.contactScore).toBe(15)
    expect(scores.revenueScore).toBe(15)
    expect(scores.totalScore).toBe(100)
  })

  it('computes a weak pair correctly', () => {
    const data: NicheRawData = {
      mapsCount: 10,
      reviewVelocity: 1,
      adCount: 8,
      agencyPages: 5,
      weakSitePct: 10,
      contactablePct: 10,
      economicSignal: 'shrinking',
      revenueEstimate: 'very_low',
    }
    const scores = scoreNichePair(data)
    expect(scores.totalScore).toBeLessThan(30)
  })

  it('computes total as sum of all dimensions', () => {
    const data: NicheRawData = {
      mapsCount: 30,
      reviewVelocity: 5,
      adCount: 1,
      agencyPages: 1,
      weakSitePct: 55,
      contactablePct: 60,
      economicSignal: 'flat',
      revenueEstimate: 'moderate',
    }
    const scores = scoreNichePair(data)
    expect(scores.totalScore).toBe(
      scores.demandScore + scores.competitionScore + scores.weaknessScore +
      scores.contactScore + scores.revenueScore,
    )
  })
})

describe('evaluateGoNoGo', () => {
  it('approves a strong pair that meets all thresholds', () => {
    const result = evaluateGoNoGo(85, {
      contactablePct: 70,
      weakSitePct: 55,
      mapsCount: 30,
    })
    expect(result.decision).toBe('approved')
    expect(result.reasons).toHaveLength(0)
  })

  it('parks a pair with score below 70', () => {
    const result = evaluateGoNoGo(65, {
      contactablePct: 70,
      weakSitePct: 55,
      mapsCount: 30,
    })
    expect(result.decision).toBe('parked')
    expect(result.reasons).toContain('Total score 65 is below threshold of 70')
  })

  it('parks a pair with contactable rate below 60%', () => {
    const result = evaluateGoNoGo(80, {
      contactablePct: 50,
      weakSitePct: 55,
      mapsCount: 30,
    })
    expect(result.decision).toBe('parked')
    expect(result.reasons.some(r => r.includes('Contactable rate'))).toBe(true)
  })

  it('parks a pair with weak-site rate below 50%', () => {
    const result = evaluateGoNoGo(80, {
      contactablePct: 70,
      weakSitePct: 40,
      mapsCount: 30,
    })
    expect(result.decision).toBe('parked')
    expect(result.reasons.some(r => r.includes('Weak-site rate'))).toBe(true)
  })

  it('parks a pair with Maps density below 20', () => {
    const result = evaluateGoNoGo(80, {
      contactablePct: 70,
      weakSitePct: 55,
      mapsCount: 15,
    })
    expect(result.decision).toBe('parked')
    expect(result.reasons.some(r => r.includes('Maps density'))).toBe(true)
  })

  it('accumulates all failure reasons', () => {
    const result = evaluateGoNoGo(50, {
      contactablePct: 30,
      weakSitePct: 20,
      mapsCount: 10,
    })
    expect(result.decision).toBe('parked')
    expect(result.reasons).toHaveLength(4)
  })

  it('approves at exact thresholds', () => {
    const result = evaluateGoNoGo(70, {
      contactablePct: 60,
      weakSitePct: 50,
      mapsCount: 20,
    })
    expect(result.decision).toBe('approved')
    expect(result.reasons).toHaveLength(0)
  })
})

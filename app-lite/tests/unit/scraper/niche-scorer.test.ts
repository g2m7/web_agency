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
  it('scales linearly with maps count and review velocity', () => {
    const score = scoreDemand(40, 8)
    expect(score).toBe(12)
  })

  it('scores moderate demand', () => {
    const score = scoreDemand(25, 4)
    expect(score).toBe(7)
  })

  it('scores low demand', () => {
    const score = scoreDemand(10, 2)
    expect(score).toBe(3)
  })

  it('scores very low demand', () => {
    const score = scoreDemand(5, 1)
    expect(score).toBe(2)
  })

  it('caps at 15', () => {
    const score = scoreDemand(100, 30)
    expect(score).toBe(15)
  })

  it('differentiates close inputs', () => {
    expect(scoreDemand(20, 2)).not.toBe(scoreDemand(25, 3))
  })
})

describe('scoreCompetition', () => {
  it('scores maximum for zero ads and agency pages', () => {
    expect(scoreCompetition(0, 0)).toBe(15)
  })

  it('scores high for minimal competition', () => {
    expect(scoreCompetition(1, 1)).toBe(13)
  })

  it('scores moderate for mid competition', () => {
    expect(scoreCompetition(3, 2)).toBe(10)
  })

  it('scores low for high competition', () => {
    expect(scoreCompetition(4, 4)).toBe(7)
  })

  it('scores minimum for highly saturated', () => {
    expect(scoreCompetition(10, 5)).toBe(0)
  })

  it('differentiates close inputs', () => {
    expect(scoreCompetition(2, 0)).not.toBe(scoreCompetition(3, 0))
  })
})

describe('scoreWeakness', () => {
  it('scores high for 75% weak sites', () => {
    expect(scoreWeakness(75)).toBe(23)
  })

  it('scores mid-high for 55% weak sites', () => {
    expect(scoreWeakness(55)).toBe(17)
  })

  it('scores moderate for 40% weak sites', () => {
    expect(scoreWeakness(40)).toBe(12)
  })

  it('scores low for 20% weak sites', () => {
    expect(scoreWeakness(20)).toBe(6)
  })

  it('scores minimum near 0%', () => {
    expect(scoreWeakness(10)).toBe(3)
  })

  it('differentiates close inputs', () => {
    expect(scoreWeakness(35)).not.toBe(scoreWeakness(45))
  })
})

describe('scoreContactability', () => {
  it('scores high for 80% contactable', () => {
    expect(scoreContactability(80)).toBe(20)
  })

  it('scores moderate for 60% contactable', () => {
    expect(scoreContactability(60)).toBe(15)
  })

  it('scores low for 35% contactable', () => {
    expect(scoreContactability(35)).toBe(9)
  })

  it('scores minimum near 0%', () => {
    expect(scoreContactability(10)).toBe(3)
  })

  it('differentiates close inputs', () => {
    expect(scoreContactability(55)).not.toBe(scoreContactability(65))
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
  it('computes a strong pair near max scores', () => {
    const data: NicheRawData = {
      mapsCount: 50,
      reviewVelocity: 10,
      adCount: 0,
      agencyPages: 0,
      weakSitePct: 100,
      contactablePct: 100,
      economicSignal: 'growth',
      revenueEstimate: 'high',
    }
    const scores = scoreNichePair(data)
    expect(scores.demandScore).toBe(15)
    expect(scores.competitionScore).toBe(15)
    expect(scores.weaknessScore).toBe(30)
    expect(scores.contactScore).toBe(25)
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

  it('differentiates pairs with different maps counts', () => {
    const base: NicheRawData = {
      mapsCount: 20,
      reviewVelocity: 3,
      adCount: 0,
      agencyPages: 0,
      weakSitePct: 50,
      contactablePct: 60,
      economicSignal: 'flat',
      revenueEstimate: 'moderate',
    }
    const a = scoreNichePair(base)
    const b = scoreNichePair({ ...base, mapsCount: 35 })
    expect(b.totalScore).toBeGreaterThan(a.totalScore)
  })

  it('realistic niche can score above 70', () => {
    const data: NicheRawData = {
      mapsCount: 30,
      reviewVelocity: 8,
      adCount: 0,
      agencyPages: 0,
      weakSitePct: 70,
      contactablePct: 75,
      economicSignal: 'flat',
      revenueEstimate: 'high',
    }
    const scores = scoreNichePair(data)
    expect(scores.totalScore).toBeGreaterThanOrEqual(70)
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

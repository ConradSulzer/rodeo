import { describe, expect, it } from 'vitest'
import type { StandingRuleContext } from './standingRules'
import { moreItemsTrumpFewerApply } from './standingRules/moreItemsTrumpFewer'
import { requireAllMetricsApply } from './standingRules/requireAllMetrics'
import type { PlayerStanding } from './standings'
import type { DivisionCategoryView } from './divisions'
import type { Timestamp } from '@core/types/Shared'
import type { Metric } from './metrics'

const baseStanding = (overrides: Partial<PlayerStanding> = {}): PlayerStanding => ({
  playerId: '01TESTPLAYER',
  itemCount: 1,
  total: 10,
  score: 10,
  rank: 0,
  ts: Date.now() as Timestamp,
  ...overrides
})

const baseCategoryContext = (direction: 'asc' | 'desc', metricCount = 0): StandingRuleContext => {
  const metrics: Metric[] = Array.from({ length: metricCount }, (_, idx) => ({
    id: `metric-${idx}`,
    label: `Metric ${idx}`,
    unit: 'unit',
    order: idx,
    createdAt: 0,
    updatedAt: 0
  }))

  const categoryView: DivisionCategoryView = {
    category: {
      id: '01CATEGORY',
      name: 'Test Category',
      direction,
      rules: [],
      createdAt: 0,
      updatedAt: 0,
      showMetricsCount: false,
      metricsCountName: ''
    },
    depth: 1,
    order: 0,
    metrics
  }

  return { categoryView }
}

describe('standing rules', () => {
  describe('moreItemsTrumpFewerApply', () => {
    it('adds a positive adjustment for descending categories', () => {
      const standing = baseStanding({ itemCount: 3, score: 50 })
      const context = baseCategoryContext('desc')

      const result = moreItemsTrumpFewerApply(standing, context)

      expect(result.score).toBe(50 + 3 * 1000)
    })

    it('subtracts the adjustment for ascending categories', () => {
      const standing = baseStanding({ itemCount: 2, score: 40 })
      const context = baseCategoryContext('asc')

      const result = moreItemsTrumpFewerApply(standing, context)

      expect(result.score).toBe(40 - 2 * 1000)
    })
  })

  describe('requireAllMetricsApply', () => {
    it('returns null when standing is missing metrics', () => {
      const standing = baseStanding({ itemCount: 2 })
      const context = baseCategoryContext('desc', 3)

      const result = requireAllMetricsApply(standing, context)

      expect(result).toBeNull()
    })

    it('returns the standing when all metrics are present', () => {
      const standing = baseStanding({ itemCount: 3 })
      const context = baseCategoryContext('desc', 3)

      const result = requireAllMetricsApply(standing, context)

      expect(result).toEqual(standing)
    })

    // TODO: This should not be possible. Make sure this is not possible. It would invalidate the results if we had metrics in a category that weren't supposed to be there.
    it('returns null when there are more items than required', () => {
      const standing = baseStanding({ itemCount: 4 })
      const context = baseCategoryContext('asc', 3)

      const result = requireAllMetricsApply(standing, context)

      expect(result).toBeNull()
    })
  })
})

import { describe, expect, it } from 'vitest'
import type { StandingRuleContext } from './standingRules'
import { moreItemsTrumpFewerApply } from './standingRules/moreItemsTrumpFewer'
import { requireAllScoreablesApply } from './standingRules/requireAllScoreables'
import type { PlayerStanding } from './standings'
import type { DivisionCategoryView } from './divisions'
import type { Timestamp } from '@core/types/Shared'
import type { Scoreable } from './scoreables'

const baseStanding = (overrides: Partial<PlayerStanding> = {}): PlayerStanding => ({
  playerId: '01TESTPLAYER',
  itemCount: 1,
  total: 10,
  score: 10,
  rank: 0,
  ts: Date.now() as Timestamp,
  ...overrides
})

const baseCategoryContext = (
  direction: 'asc' | 'desc',
  scoreableCount = 0
): StandingRuleContext => {
  const scoreables: Scoreable[] = Array.from({ length: scoreableCount }, (_, idx) => ({
    id: `scoreable-${idx}`,
    label: `Scoreable ${idx}`,
    unit: 'unit',
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
      updatedAt: 0
    },
    depth: 1,
    order: 0,
    scoreables
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

  describe('requireAllScoreablesApply', () => {
    it('returns null when standing is missing scoreables', () => {
      const standing = baseStanding({ itemCount: 2 })
      const context = baseCategoryContext('desc', 3)

      const result = requireAllScoreablesApply(standing, context)

      expect(result).toBeNull()
    })

    it('returns the standing when all scoreables are present', () => {
      const standing = baseStanding({ itemCount: 3 })
      const context = baseCategoryContext('desc', 3)

      const result = requireAllScoreablesApply(standing, context)

      expect(result).toEqual(standing)
    })

    // TODO: This should not be possible. Make sure this is not possible. It would invalidate the results if we had scoreables in a category that weren't supposed to be there.
    it('returns null when there are more items than required', () => {
      const standing = baseStanding({ itemCount: 4 })
      const context = baseCategoryContext('asc', 3)

      const result = requireAllScoreablesApply(standing, context)

      expect(result).toBeNull()
    })
  })
})

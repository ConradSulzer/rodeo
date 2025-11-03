import { describe, expect, it } from 'vitest'
import type { StandingRuleContext } from './standingRules'
import { moreItemsTrumpFewerApply } from './standingRules/moreItemsTrumpFewer'
import type { PlayerStanding } from './standings'
import type { DivisionCategoryView } from './divisions'
import type { Timestamp } from '@core/types/Shared'

const baseStanding = (overrides: Partial<PlayerStanding> = {}): PlayerStanding => ({
  playerId: '01TESTPLAYER',
  itemCount: 1,
  total: 10,
  score: 10,
  rank: 0,
  ts: Date.now() as Timestamp,
  ...overrides
})

const baseCategoryContext = (direction: 'asc' | 'desc'): StandingRuleContext => {
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
    scoreables: []
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
})

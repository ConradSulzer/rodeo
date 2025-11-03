import { describe, expect, it } from 'vitest'
import { withInMemoryDb } from '@core/db/db'
import {
  createDivision,
  addCategoryToDivision,
  getDivisionView,
  addPlayerToDivision
} from './divisions'
import { addScoreableToCategory, createCategory } from './categories'
import { createScoreable } from './scoreables'
import { createPlayer } from '@core/players/players'
import { computeDivisionStanding } from './standings'
import { recordEvent, type Results } from './results'
import type { ItemScored } from '@core/events/events'
import { ulid } from 'ulid'

const basePlayer = (suffix: string) => ({
  firstName: `First${suffix}`,
  lastName: `Last${suffix}`,
  displayName: `Player ${suffix}`,
  email: `player${suffix}@example.com`
})

describe('standings computation', () => {
  it('aggregates available items and keeps partial cards by default', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, { name: 'Pro' })
      const categoryId = createCategory(db, { name: 'Mixed Bag', direction: 'desc' })
      const weightId = createScoreable(db, { label: 'Weight', unit: 'lbs' })
      const lengthId = createScoreable(db, { label: 'Length', unit: 'in' })

      addScoreableToCategory(db, categoryId, weightId)
      addScoreableToCategory(db, categoryId, lengthId)
      addCategoryToDivision(db, divisionId, categoryId, 5)

      const playerFull = createPlayer(db, basePlayer('Full'))
      const playerPartial = createPlayer(db, basePlayer('Partial'))
      const playerNone = createPlayer(db, basePlayer('None'))

      addPlayerToDivision(db, divisionId, playerFull)
      addPlayerToDivision(db, divisionId, playerPartial)
      addPlayerToDivision(db, divisionId, playerNone)

      const results: Results = new Map()
      const baseTs = Date.now()
      const makeEvent = (
        scoreableId: string,
        playerId: string,
        value: number,
        offset = 0
      ): ItemScored => ({
        type: 'ItemScored',
        id: ulid(),
        ts: baseTs + offset,
        playerId,
        scoreableId,
        scoreableName: 'Score',
        value
      })

      recordEvent(db, results, makeEvent(weightId, playerFull, 10, 1))
      recordEvent(db, results, makeEvent(lengthId, playerFull, 5, 2))
      recordEvent(db, results, makeEvent(weightId, playerPartial, 12, 3))

      const divisionView = getDivisionView(db, divisionId)!
      const standing = computeDivisionStanding(results, divisionView)
      const [categoryStanding] = standing.categories

      expect(categoryStanding.entries.map((entry) => entry.playerId)).toEqual([
        playerFull,
        playerPartial
      ])

      const [first, second] = categoryStanding.entries
      expect(first.playerId).toBe(playerFull)
      expect(first.itemCount).toBe(2)
      expect(first.total).toBe(15)
      expect(first.score).toBe(15)
      expect(first.rank).toBe(1)

      expect(second.playerId).toBe(playerPartial)
      expect(second.itemCount).toBe(1)
      expect(second.total).toBe(12)
      expect(second.rank).toBe(2)
    })
  })

  it('orders ascending categories by summed totals', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, { name: 'Masters' })
      const categoryId = createCategory(db, { name: 'Low Total Wins', direction: 'asc' })
      const scoreableA = createScoreable(db, { label: 'Attempt 1', unit: 'pts' })
      const scoreableB = createScoreable(db, { label: 'Attempt 2', unit: 'pts' })

      addScoreableToCategory(db, categoryId, scoreableA)
      addScoreableToCategory(db, categoryId, scoreableB)
      addCategoryToDivision(db, divisionId, categoryId, 5)

      const playerA = createPlayer(db, basePlayer('A'))
      const playerB = createPlayer(db, basePlayer('B'))

      addPlayerToDivision(db, divisionId, playerA)
      addPlayerToDivision(db, divisionId, playerB)

      const results: Results = new Map()
      const baseTs = Date.now()
      const makeEvent = (
        scoreableId: string,
        playerId: string,
        value: number,
        offset = 0
      ): ItemScored => ({
        type: 'ItemScored',
        id: ulid(),
        ts: baseTs + offset,
        playerId,
        scoreableId,
        scoreableName: 'Score',
        value
      })

      recordEvent(db, results, makeEvent(scoreableA, playerA, 4, 1))
      recordEvent(db, results, makeEvent(scoreableB, playerA, 4, 2))
      recordEvent(db, results, makeEvent(scoreableA, playerB, 3, 1))
      recordEvent(db, results, makeEvent(scoreableB, playerB, 3, 2))

      const divisionView = getDivisionView(db, divisionId)!
      const standing = computeDivisionStanding(results, divisionView)
      const entries = standing.categories[0].entries

      expect(entries.map((entry) => entry.playerId)).toEqual([playerB, playerA])
      expect(entries[0].score).toBe(6)
      expect(entries[0].rank).toBe(1)
      expect(entries[1].score).toBe(8)
      expect(entries[1].rank).toBe(2)
    })
  })

  it('breaks ties using earliest timestamp when scores match', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, { name: 'TieBreak' })
      const categoryId = createCategory(db, { name: 'Heaviest Fish', direction: 'desc' })
      const scoreableId = createScoreable(db, { label: 'Fish', unit: 'lbs' })

      addScoreableToCategory(db, categoryId, scoreableId)
      addCategoryToDivision(db, divisionId, categoryId, 5)

      const playerEarly = createPlayer(db, basePlayer('Early'))
      const playerLate = createPlayer(db, basePlayer('Late'))

      addPlayerToDivision(db, divisionId, playerEarly)
      addPlayerToDivision(db, divisionId, playerLate)

      const results: Results = new Map()
      const baseTs = Date.now()
      const makeEvent = (playerId: string, value: number, tsOffset: number): ItemScored => ({
        type: 'ItemScored',
        id: ulid(),
        ts: baseTs + tsOffset,
        playerId,
        scoreableId,
        scoreableName: 'Fish',
        value
      })

      // identical scores, earlier timestamp should win
      recordEvent(db, results, makeEvent(playerEarly, 15, 1))
      recordEvent(db, results, makeEvent(playerLate, 15, 10))

      const standing = computeDivisionStanding(results, getDivisionView(db, divisionId)!)
      const [categoryStanding] = standing.categories
      const [first, second] = categoryStanding.entries

      expect(first.playerId).toBe(playerEarly)
      expect(second.playerId).toBe(playerLate)
      expect(first.rank).toBe(1)
      expect(second.rank).toBe(2)
    })
  })
})

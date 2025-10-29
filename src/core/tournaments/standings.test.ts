import { describe, expect, it } from 'vitest'
import { withInMemoryDb } from '@core/db/db'
import { createDivision, addCategoryToDivision, getDivisionView } from './divisions'
import { addScoreableToCategory, createCategory } from './categories'
import { createScoreable } from './scoreables'
import { createPlayer } from '@core/players/players'
import { computeDivisionStanding, computeAllDivisionStandings } from './standings'
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
  it('ranks players within division categories respecting depth and direction', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, { name: 'Pro' })
      const categoryId = createCategory(db, { name: 'Redfish', direction: 'desc' })
      const scoreableId = createScoreable(db, { label: 'Weight', unit: 'lbs' })
      addScoreableToCategory(db, categoryId, scoreableId)
      addCategoryToDivision(db, divisionId, categoryId, 2)

      const playerA = createPlayer(db, basePlayer('A'))
      const playerB = createPlayer(db, basePlayer('B'))
      const playerC = createPlayer(db, basePlayer('C'))

      const results: Results = new Map()
      const makeEvent = (playerId: string, value: number): ItemScored => ({
        type: 'ItemScored',
        id: ulid(),
        ts: Date.now(),
        playerId,
        scoreableId,
        scoreableName: 'Weight',
        value
      })

      recordEvent(db, results, makeEvent(playerA, 12.5))
      recordEvent(db, results, makeEvent(playerB, 9.2))
      recordEvent(db, results, makeEvent(playerC, 12.5))

      const divisionView = getDivisionView(db, divisionId)
      expect(divisionView).toBeDefined()

      const standing = computeDivisionStanding(results, divisionView!)
      expect(standing.categories).toHaveLength(1)

      const [categoryStanding] = standing.categories
      expect(categoryStanding.entries).toHaveLength(2) // depth = 2, ties allowed

      const [first, second] = categoryStanding.entries
      expect(first.rank).toBe(1)
      expect(second.rank).toBe(1) // tie on value
      expect([first.playerId, second.playerId]).toContain(playerA)
      expect([first.playerId, second.playerId]).toContain(playerC)
      expect(first.breakdown[scoreableId].value).toBe(12.5)
    })
  })

  it('sums multiple scoreables and honors asc direction', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, { name: 'Masters' })
      const categoryId = createCategory(db, { name: 'Multi', direction: 'asc' })
      const scoreableA = createScoreable(db, { label: 'Fish1', unit: 'lbs' })
      const scoreableB = createScoreable(db, { label: 'Fish2', unit: 'lbs' })
      addScoreableToCategory(db, categoryId, scoreableA)
      addScoreableToCategory(db, categoryId, scoreableB)
      addCategoryToDivision(db, divisionId, categoryId, 3)

      const playerA = createPlayer(db, basePlayer('A'))
      const playerB = createPlayer(db, basePlayer('B'))

      const results: Results = new Map()
      const makeEvent = (scoreableId: string, playerId: string, value: number): ItemScored => ({
        type: 'ItemScored',
        id: ulid(),
        ts: Date.now(),
        playerId,
        scoreableId,
        scoreableName: 'Fish',
        value
      })

      recordEvent(db, results, makeEvent(scoreableA, playerA, 4))
      recordEvent(db, results, makeEvent(scoreableB, playerA, 4))
      recordEvent(db, results, makeEvent(scoreableA, playerB, 3))
      recordEvent(db, results, makeEvent(scoreableB, playerB, 3))

      const standings = computeAllDivisionStandings(results, [getDivisionView(db, divisionId)!])
      expect(standings).toHaveLength(1)
      const entries = standings[0].categories[0].entries
      expect(entries).toHaveLength(2)
      expect(entries[0].playerId).toBe(playerB)
      expect(entries[0].value).toBe(6) // 3 + 3, lower is better
      expect(entries[1].value).toBe(8)
    })
  })
})

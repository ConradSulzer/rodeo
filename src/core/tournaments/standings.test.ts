import { describe, expect, it } from 'vitest'
import { withInMemoryDb } from '@core/db/db'
import {
  createDivision,
  addCategoryToDivision,
  addPlayerToDivision,
  listDivisions
} from './divisions'
import { addMetricToCategory, createCategory, updateCategory } from './categories'
import { createMetric } from './metrics'
import { createPlayer, listEnrichedPlayers } from '@core/players/players'
import { computeDivisionStanding } from './standings'
import { appendEvent, getEvent, type ItemStateChanged } from '@core/events/events'
import { reduceEvent } from '@core/events/eventReducer'
import { type Results } from './results'
import { ulid, type ULID } from 'ulid'
import type { AppDatabase } from '@core/db/db'

const basePlayer = (suffix: string) => ({
  firstName: `First${suffix}`,
  lastName: `Last${suffix}`,
  displayName: `Player ${suffix}`,
  email: `player${suffix}@example.com`
})

const buildPlayerDirectory = (db: AppDatabase) =>
  new Map(
    listEnrichedPlayers(db).map((player) => [
      player.id,
      { id: player.id, displayName: player.displayName, email: player.email }
    ])
  )

describe('standings computation', () => {
  const persistEvent = (db: AppDatabase, results: Results, event: ItemStateChanged) => {
    appendEvent(db, event)
    reduceEvent(results, event, (id: ULID) => getEvent(db, id))
  }

  it('aggregates available items and keeps partial cards by default', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, { name: 'Pro' })
      const categoryId = createCategory(db, {
        name: 'Mixed Bag',
        direction: 'desc',
        mode: 'aggregate',
        showMetricsCount: false
      })
      const weightId = createMetric(db, { label: 'Weight', unit: 'lbs' })
      const lengthId = createMetric(db, { label: 'Length', unit: 'in' })

      addMetricToCategory(db, categoryId, weightId)
      addMetricToCategory(db, categoryId, lengthId)
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
        metricId: string,
        playerId: string,
        value: number,
        offset = 0
      ): ItemStateChanged => ({
        type: 'ItemStateChanged',
        id: ulid(),
        ts: baseTs + offset,
        playerId,
        metricId,
        state: 'value',
        value
      })

      persistEvent(db, results, makeEvent(weightId, playerFull, 10, 1))
      persistEvent(db, results, makeEvent(lengthId, playerFull, 5, 2))
      persistEvent(db, results, makeEvent(weightId, playerPartial, 12, 3))

      const divisionView = listDivisions(db).find((division) => division.id === divisionId)!
      const standing = computeDivisionStanding(results, divisionView, buildPlayerDirectory(db))
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
      const categoryId = createCategory(db, {
        name: 'Low Total Wins',
        direction: 'asc',
        mode: 'aggregate',
        showMetricsCount: false
      })
      const metricA = createMetric(db, { label: 'Attempt 1', unit: 'pts' })
      const metricB = createMetric(db, { label: 'Attempt 2', unit: 'pts' })

      addMetricToCategory(db, categoryId, metricA)
      addMetricToCategory(db, categoryId, metricB)
      addCategoryToDivision(db, divisionId, categoryId, 5)

      const playerA = createPlayer(db, basePlayer('A'))
      const playerB = createPlayer(db, basePlayer('B'))

      addPlayerToDivision(db, divisionId, playerA)
      addPlayerToDivision(db, divisionId, playerB)

      const results: Results = new Map()
      const baseTs = Date.now()
      const makeEvent = (
        metricId: string,
        playerId: string,
        value: number,
        offset = 0
      ): ItemStateChanged => ({
        type: 'ItemStateChanged',
        id: ulid(),
        ts: baseTs + offset,
        playerId,
        metricId,
        state: 'value',
        value
      })

      persistEvent(db, results, makeEvent(metricA, playerA, 4, 1))
      persistEvent(db, results, makeEvent(metricB, playerA, 4, 2))
      persistEvent(db, results, makeEvent(metricA, playerB, 3, 1))
      persistEvent(db, results, makeEvent(metricB, playerB, 3, 2))

      const divisionView = listDivisions(db).find((division) => division.id === divisionId)!
      const standing = computeDivisionStanding(results, divisionView, buildPlayerDirectory(db))
      const entries = standing.categories[0].entries

      expect(entries.map((entry) => entry.playerId)).toEqual([playerB, playerA])
      expect(entries[0].score).toBe(6)
      expect(entries[0].rank).toBe(1)
      expect(entries[1].score).toBe(8)
      expect(entries[1].rank).toBe(2)
    })
  })

  it('uses best single metric for pick_one descending categories', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, { name: 'Select Best' })
      const categoryId = createCategory(db, {
        name: 'Top Attempt',
        direction: 'desc',
        mode: 'pick_one',
        showMetricsCount: false
      })
      const metricA = createMetric(db, { label: 'Attempt 1', unit: 'pts' })
      const metricB = createMetric(db, { label: 'Attempt 2', unit: 'pts' })

      addMetricToCategory(db, categoryId, metricA)
      addMetricToCategory(db, categoryId, metricB)
      addCategoryToDivision(db, divisionId, categoryId, 5)

      const playerA = createPlayer(db, basePlayer('A'))
      const playerB = createPlayer(db, basePlayer('B'))
      const playerC = createPlayer(db, basePlayer('C'))

      addPlayerToDivision(db, divisionId, playerA)
      addPlayerToDivision(db, divisionId, playerB)
      addPlayerToDivision(db, divisionId, playerC)

      const results: Results = new Map()
      const baseTs = Date.now()
      const makeEvent = (
        metricId: string,
        playerId: string,
        value: number,
        offset = 0
      ): ItemStateChanged => ({
        type: 'ItemStateChanged',
        id: ulid(),
        ts: baseTs + offset,
        playerId,
        metricId,
        state: 'value',
        value
      })

      // Player A: best is 10
      persistEvent(db, results, makeEvent(metricA, playerA, 10, 1))
      persistEvent(db, results, makeEvent(metricB, playerA, 4, 2))

      // Player B: best is 12
      persistEvent(db, results, makeEvent(metricA, playerB, 8, 1))
      persistEvent(db, results, makeEvent(metricB, playerB, 12, 2))

      // Player C: single metric only, best is 9
      persistEvent(db, results, makeEvent(metricA, playerC, 9, 1))

      const standing = computeDivisionStanding(
        results,
        listDivisions(db).find((division) => division.id === divisionId)!,
        buildPlayerDirectory(db)
      )

      const entries = standing.categories[0].entries
      expect(entries.map((entry) => entry.playerId)).toEqual([playerB, playerA, playerC])
      expect(entries.map((entry) => entry.total)).toEqual([12, 10, 9])
      expect(entries.map((entry) => entry.itemCount)).toEqual([2, 2, 1])
    })
  })

  it('uses best single metric for pick_one ascending categories', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, { name: 'Select Best Asc' })
      const categoryId = createCategory(db, {
        name: 'Fastest Attempt',
        direction: 'asc',
        mode: 'pick_one',
        showMetricsCount: false
      })
      const metricA = createMetric(db, { label: 'Run 1', unit: 'sec' })
      const metricB = createMetric(db, { label: 'Run 2', unit: 'sec' })

      addMetricToCategory(db, categoryId, metricA)
      addMetricToCategory(db, categoryId, metricB)
      addCategoryToDivision(db, divisionId, categoryId, 5)

      const playerA = createPlayer(db, basePlayer('Aasc'))
      const playerB = createPlayer(db, basePlayer('Basc'))
      const playerC = createPlayer(db, basePlayer('Casc'))

      addPlayerToDivision(db, divisionId, playerA)
      addPlayerToDivision(db, divisionId, playerB)
      addPlayerToDivision(db, divisionId, playerC)

      const results: Results = new Map()
      const baseTs = Date.now()
      const makeEvent = (
        metricId: string,
        playerId: string,
        value: number,
        offset = 0
      ): ItemStateChanged => ({
        type: 'ItemStateChanged',
        id: ulid(),
        ts: baseTs + offset,
        playerId,
        metricId,
        state: 'value',
        value
      })

      // Player A: best is 5
      persistEvent(db, results, makeEvent(metricA, playerA, 9, 1))
      persistEvent(db, results, makeEvent(metricB, playerA, 5, 2))

      // Player B: best is 3
      persistEvent(db, results, makeEvent(metricA, playerB, 3, 1))

      // Player C: best is 2
      persistEvent(db, results, makeEvent(metricA, playerC, 4, 1))
      persistEvent(db, results, makeEvent(metricB, playerC, 2, 2))

      const standing = computeDivisionStanding(
        results,
        listDivisions(db).find((division) => division.id === divisionId)!,
        buildPlayerDirectory(db)
      )

      const entries = standing.categories[0].entries
      expect(entries.map((entry) => entry.playerId)).toEqual([playerC, playerB, playerA])
      expect(entries.map((entry) => entry.total)).toEqual([2, 3, 5])
      expect(entries.map((entry) => entry.itemCount)).toEqual([2, 1, 2])
    })
  })

  it('applies the "More Items Trump Fewer" rule to prioritize fuller cards', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, { name: 'Rule Division' })
      const categoryId = createCategory(db, {
        name: 'Full Cards Win',
        direction: 'desc',
        mode: 'aggregate',
        showMetricsCount: false
      })
      const metricA = createMetric(db, { label: 'Fish A', unit: 'lbs' })
      const metricB = createMetric(db, { label: 'Fish B', unit: 'lbs' })
      const metricC = createMetric(db, { label: 'Fish C', unit: 'lbs' })

      addMetricToCategory(db, categoryId, metricA)
      addMetricToCategory(db, categoryId, metricB)
      addMetricToCategory(db, categoryId, metricC)
      updateCategory(db, categoryId, { rules: ['more_items_trump_fewer'] })
      addCategoryToDivision(db, divisionId, categoryId, 5)

      const playerFull = createPlayer(db, basePlayer('FullCard'))
      const playerPartial = createPlayer(db, basePlayer('PartialCard'))

      addPlayerToDivision(db, divisionId, playerFull)
      addPlayerToDivision(db, divisionId, playerPartial)

      const results: Results = new Map()
      const baseTs = Date.now()
      const makeEvent = (
        metricId: string,
        playerId: string,
        value: number,
        offset = 0
      ): ItemStateChanged => ({
        type: 'ItemStateChanged',
        id: ulid(),
        ts: baseTs + offset,
        playerId,
        metricId,
        state: 'value',
        value
      })

      // Player with a full card has a lower raw total but more items
      persistEvent(db, results, makeEvent(metricA, playerFull, 5, 1))
      persistEvent(db, results, makeEvent(metricB, playerFull, 5, 2))
      persistEvent(db, results, makeEvent(metricC, playerFull, 5, 3))

      // Partial player posts a higher raw total but fewer items
      persistEvent(db, results, makeEvent(metricA, playerPartial, 20, 1))

      const standing = computeDivisionStanding(
        results,
        listDivisions(db).find((division) => division.id === divisionId)!,
        buildPlayerDirectory(db)
      )
      const [categoryStanding] = standing.categories

      expect(categoryStanding.entries.map((entry) => entry.playerId)).toEqual([
        playerFull,
        playerPartial
      ])

      const [first, second] = categoryStanding.entries
      expect(first.itemCount).toBe(3)
      expect(second.itemCount).toBe(1)
      expect(first.score).toBeGreaterThan(second.score)
      expect(first.rank).toBe(1)
      expect(second.rank).toBe(2)
    })
  })

  it('applies the "Require All Metrics" rule to drop incomplete cards', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, { name: 'Require Division' })
      const categoryId = createCategory(db, {
        name: 'Complete Cards Only',
        direction: 'desc',
        mode: 'aggregate',
        showMetricsCount: false
      })
      const metricA = createMetric(db, { label: 'Fish A', unit: 'lbs' })
      const metricB = createMetric(db, { label: 'Fish B', unit: 'lbs' })
      const metricC = createMetric(db, { label: 'Fish C', unit: 'lbs' })

      addMetricToCategory(db, categoryId, metricA)
      addMetricToCategory(db, categoryId, metricB)
      addMetricToCategory(db, categoryId, metricC)
      updateCategory(db, categoryId, { rules: ['require_all_metrics'] })
      addCategoryToDivision(db, divisionId, categoryId, 5)

      const playerComplete = createPlayer(db, basePlayer('Complete'))
      const playerMissing = createPlayer(db, basePlayer('MissingOne'))

      addPlayerToDivision(db, divisionId, playerComplete)
      addPlayerToDivision(db, divisionId, playerMissing)

      const results: Results = new Map()
      const baseTs = Date.now()
      const makeEvent = (
        metricId: string,
        playerId: string,
        value: number,
        offset = 0
      ): ItemStateChanged => ({
        type: 'ItemStateChanged',
        id: ulid(),
        ts: baseTs + offset,
        playerId,
        metricId,
        state: 'value',
        value
      })

      persistEvent(db, results, makeEvent(metricA, playerComplete, 10, 1))
      persistEvent(db, results, makeEvent(metricB, playerComplete, 8, 2))
      persistEvent(db, results, makeEvent(metricC, playerComplete, 6, 3))

      persistEvent(db, results, makeEvent(metricA, playerMissing, 12, 1))
      persistEvent(db, results, makeEvent(metricB, playerMissing, 9, 2))

      const standing = computeDivisionStanding(
        results,
        listDivisions(db).find((division) => division.id === divisionId)!,
        buildPlayerDirectory(db)
      )
      const [categoryStanding] = standing.categories

      expect(categoryStanding.entries.map((entry) => entry.playerId)).toEqual([playerComplete])
      expect(categoryStanding.entries[0].rank).toBe(1)
    })
  })

  it('breaks ties using earliest timestamp when scores match', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, { name: 'TieBreak' })
      const categoryId = createCategory(db, {
        name: 'Heaviest Fish',
        direction: 'desc',
        mode: 'aggregate',
        showMetricsCount: false
      })
      const metricId = createMetric(db, { label: 'Fish', unit: 'lbs' })

      addMetricToCategory(db, categoryId, metricId)
      addCategoryToDivision(db, divisionId, categoryId, 5)

      const playerEarly = createPlayer(db, basePlayer('Early'))
      const playerLate = createPlayer(db, basePlayer('Late'))

      addPlayerToDivision(db, divisionId, playerEarly)
      addPlayerToDivision(db, divisionId, playerLate)

      const results: Results = new Map()
      const baseTs = Date.now()
      const makeEvent = (playerId: string, value: number, tsOffset: number): ItemStateChanged => ({
        type: 'ItemStateChanged',
        id: ulid(),
        ts: baseTs + tsOffset,
        playerId,
        metricId,
        state: 'value',
        value
      })

      // identical scores, earlier timestamp should win
      persistEvent(db, results, makeEvent(playerEarly, 15, 1))
      persistEvent(db, results, makeEvent(playerLate, 15, 10))

      const standing = computeDivisionStanding(
        results,
        listDivisions(db).find((division) => division.id === divisionId)!,
        buildPlayerDirectory(db)
      )
      const [categoryStanding] = standing.categories
      const [first, second] = categoryStanding.entries

      expect(first.playerId).toBe(playerEarly)
      expect(second.playerId).toBe(playerLate)
      expect(first.rank).toBe(1)
      expect(second.rank).toBe(2)
    })
  })
})

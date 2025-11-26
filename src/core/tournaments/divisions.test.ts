import { describe, expect, it } from 'vitest'
import { withInMemoryDb } from '@core/db/db'
import {
  addCategoryToDivision,
  addPlayerToDivision,
  createDivision,
  deleteDivision,
  getDivision,
  listDivisions,
  removeCategoryFromDivision,
  removePlayerFromDivision,
  updateDivision,
  updateDivisionCategoryLink,
  type NewDivision
} from './divisions'
import { addMetricToCategory, createCategory, type NewCategory } from './categories'
import { createMetric, type NewMetric } from './metrics'
import { createPlayer } from '@core/players/players'

const baseDivision: NewDivision = {
  name: 'Open'
}

const baseCategory: NewCategory = {
  name: 'Overall',
  direction: 'asc',
  mode: 'aggregate',
  showMetricsCount: false
}

const baseMetric: NewMetric = {
  label: 'Weight',
  unit: 'lbs'
}

const basePlayer = (suffix: string) => ({
  firstName: `First${suffix}`,
  lastName: `Last${suffix}`,
  displayName: `Player ${suffix}`,
  email: `player${suffix}@example.com`
})

describe('divisions data access', () => {
  it('creates and retrieves a division', () => {
    withInMemoryDb((db) => {
      const id = createDivision(db, baseDivision)
      const division = getDivision(db, id)

      expect(division).toBeDefined()
      expect(division?.id).toBe(id)
      expect(division?.name).toBe(baseDivision.name)
      expect(division?.createdAt).toBeTypeOf('number')
      expect(division?.updatedAt).toBeTypeOf('number')
    })
  })

  it('updates a division and refreshes updatedAt', () => {
    withInMemoryDb((db) => {
      const id = createDivision(db, baseDivision)
      const before = getDivision(db, id)
      expect(before).toBeDefined()

      const changed = updateDivision(db, id, { name: 'Pro' })
      expect(changed).toBe(true)

      const after = getDivision(db, id)
      expect(after?.name).toBe('Pro')
      expect(after?.updatedAt).toBeGreaterThanOrEqual(before!.updatedAt)
    })
  })

  it('returns false on empty patch', () => {
    withInMemoryDb((db) => {
      const id = createDivision(db, baseDivision)
      const before = getDivision(db, id)

      const changed = updateDivision(db, id, {})
      expect(changed).toBe(false)

      const after = getDivision(db, id)
      expect(after?.updatedAt).toBe(before?.updatedAt)
    })
  })

  it('deletes a division', () => {
    withInMemoryDb((db) => {
      const id = createDivision(db, baseDivision)

      const deleted = deleteDivision(db, id)
      expect(deleted).toBe(true)
      expect(getDivision(db, id)).toBeUndefined()
    })
  })

  it('lists divisions ordered by order then name', () => {
    withInMemoryDb((db) => {
      createDivision(db, { name: 'Masters', order: 2 })
      createDivision(db, { name: 'Amateur', order: 1 })
      createDivision(db, { name: 'Pro', order: 1 })

      const divisions = listDivisions(db)
      expect(divisions.map((d) => d.name)).toEqual(['Amateur', 'Pro', 'Masters'])
      expect(divisions.map((d) => d.order)).toEqual([1, 1, 2])
    })
  })

  it('lists divisions with categories and eligible players', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, { name: 'Pro', order: 1 })
      const categoryId = createCategory(db, baseCategory)
      const metricId = createMetric(db, baseMetric)
      const playerOne = createPlayer(db, basePlayer('One'))
      const playerTwo = createPlayer(db, basePlayer('Two'))

      addMetricToCategory(db, categoryId, metricId)
      addCategoryToDivision(db, divisionId, categoryId, 2, 3)
      addPlayerToDivision(db, divisionId, playerOne)
      addPlayerToDivision(db, divisionId, playerTwo)

      const divisions = listDivisions(db)
      expect(divisions).toHaveLength(1)

      const [division] = divisions
      expect(division.id).toBe(divisionId)
      expect(division.categories).toHaveLength(1)

      const [categoryView] = division.categories
      expect(categoryView.category.id).toBe(categoryId)
      expect(categoryView.depth).toBe(2)
      expect(categoryView.order).toBe(3)
      expect(categoryView.metrics.map((metric) => metric.id)).toEqual([metricId])

      expect(division.eligiblePlayerIds).toEqual([playerOne, playerTwo].sort())
    })
  })

  it('links categories to divisions with normalized depth', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, baseDivision)
      const categoryId = createCategory(db, baseCategory)

      const created = addCategoryToDivision(db, divisionId, categoryId, -2)
      expect(created).toBe(true)

      const divisions = listDivisions(db)
      const division = divisions.find((entry) => entry.id === divisionId)
      expect(division?.categories).toEqual([
        {
          category: expect.objectContaining({ id: categoryId }),
          depth: 1,
          order: 0,
          metrics: []
        }
      ])
    })
  })

  it('upserts category link depth on repeated add', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, baseDivision)
      const categoryId = createCategory(db, baseCategory)

      addCategoryToDivision(db, divisionId, categoryId, 5, 4)
      addCategoryToDivision(db, divisionId, categoryId, 2)

      const division = listDivisions(db).find((entry) => entry.id === divisionId)!
      expect(division.categories[0].depth).toBe(2)
      expect(division.categories[0].order).toBe(4)
    })
  })

  it('updates division-category link via patch', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, baseDivision)
      const categoryId = createCategory(db, baseCategory)

      addCategoryToDivision(db, divisionId, categoryId, 1, 2)

      const updated = updateDivisionCategoryLink(db, divisionId, categoryId, {
        depth: 4.7,
        order: 7.1
      })
      expect(updated).toBe(true)

      const division = listDivisions(db).find((entry) => entry.id === divisionId)!
      expect(division.categories[0].depth).toBe(4)
      expect(division.categories[0].order).toBe(7)
    })
  })

  it('removes category link from division', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, baseDivision)
      const categoryId = createCategory(db, baseCategory)

      addCategoryToDivision(db, divisionId, categoryId)
      const removed = removeCategoryFromDivision(db, divisionId, categoryId)
      expect(removed).toBe(true)

      const division = listDivisions(db).find((entry) => entry.id === divisionId)!
      expect(division.categories).toHaveLength(0)
    })
  })

  it('builds division view with categories and metrics', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, baseDivision)
      const categoryId = createCategory(db, baseCategory)
      const metricId = createMetric(db, baseMetric)
      const playerA = createPlayer(db, basePlayer('A'))
      const playerB = createPlayer(db, basePlayer('B'))

      addMetricToCategory(db, categoryId, metricId)
      addCategoryToDivision(db, divisionId, categoryId, 4, 5)
      addPlayerToDivision(db, divisionId, playerA)
      addPlayerToDivision(db, divisionId, playerB)

      const view = listDivisions(db).find((division) => division.id === divisionId)
      expect(view).toBeDefined()
      expect(view?.categories).toHaveLength(1)
      expect(new Set(view?.eligiblePlayerIds)).toEqual(new Set([playerA, playerB]))

      const [categoryView] = view!.categories
      expect(categoryView.depth).toBe(4)
      expect(categoryView.order).toBe(5)
      expect(categoryView.category.id).toBe(categoryId)
      expect(categoryView.metrics).toHaveLength(1)
      expect(categoryView.metrics[0]).toMatchObject({
        id: metricId,
        label: baseMetric.label
      })

      const all = listDivisions(db)
      expect(all).toHaveLength(1)
      expect(all[0].categories[0].metrics[0].unit).toBe(baseMetric.unit)
      expect(new Set(all[0].eligiblePlayerIds)).toEqual(new Set([playerA, playerB]))
    })
  })

  it('manages player eligibility assignments', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, baseDivision)
      const playerA = createPlayer(db, basePlayer('A'))
      const playerB = createPlayer(db, basePlayer('B'))

      addPlayerToDivision(db, divisionId, playerA)
      addPlayerToDivision(db, divisionId, playerB)

      const removed = removePlayerFromDivision(db, divisionId, playerA)
      expect(removed).toBe(true)
    })
  })
})

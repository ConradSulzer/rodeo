import { describe, expect, it } from 'vitest'
import { withInMemoryDb } from '@core/db/db'
import {
  addCategoryToDivision,
  addPlayerToDivision,
  createDivision,
  deleteDivision,
  getDivision,
  getDivisionView,
  listAllDivisions,
  listCategoriesForDivision,
  listDivisionIdsForPlayer,
  listDivisionViews,
  listDivisionsForCategory,
  listPlayerIdsForDivision,
  removeCategoryFromDivision,
  removePlayerFromDivision,
  updateDivision,
  updateDivisionCategoryLink,
  type NewDivision
} from './divisions'
import { addScoreableToCategory, createCategory, type NewCategory } from './categories'
import { createScoreable, type NewScoreable } from './scoreables'
import { createPlayer } from '@core/players/players'

const baseDivision: NewDivision = {
  name: 'Open'
}

const baseCategory: NewCategory = {
  name: 'Overall',
  direction: 'asc'
}

const baseScoreable: NewScoreable = {
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

  it('lists divisions ordered by name', () => {
    withInMemoryDb((db) => {
      createDivision(db, { name: 'Masters' })
      createDivision(db, { name: 'Amateur' })
      createDivision(db, { name: 'Pro' })

      const divisions = listAllDivisions(db)
      expect(divisions.map((d) => d.name)).toEqual(['Amateur', 'Masters', 'Pro'])
    })
  })

  it('links categories to divisions with normalized depth', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, baseDivision)
      const categoryId = createCategory(db, baseCategory)

      const created = addCategoryToDivision(db, divisionId, categoryId, -2)
      expect(created).toBe(true)

      const links = listCategoriesForDivision(db, divisionId)
      expect(links).toEqual([{ divisionId, categoryId, depth: 1 }])
    })
  })

  it('upserts category link depth on repeated add', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, baseDivision)
      const categoryId = createCategory(db, baseCategory)

      addCategoryToDivision(db, divisionId, categoryId, 5)
      addCategoryToDivision(db, divisionId, categoryId, 2)

      const link = listCategoriesForDivision(db, divisionId)[0]
      expect(link.depth).toBe(2)
    })
  })

  it('updates division-category link via patch', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, baseDivision)
      const categoryId = createCategory(db, baseCategory)

      addCategoryToDivision(db, divisionId, categoryId, 1)

      const updated = updateDivisionCategoryLink(db, divisionId, categoryId, { depth: 4.7 })
      expect(updated).toBe(true)

      const link = listCategoriesForDivision(db, divisionId)[0]
      expect(link.depth).toBe(4) // floor applied
    })
  })

  it('removes category link from division', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, baseDivision)
      const categoryId = createCategory(db, baseCategory)

      addCategoryToDivision(db, divisionId, categoryId)
      const removed = removeCategoryFromDivision(db, divisionId, categoryId)
      expect(removed).toBe(true)

      expect(listCategoriesForDivision(db, divisionId)).toHaveLength(0)
    })
  })

  it('lists divisions for a category', () => {
    withInMemoryDb((db) => {
      const categoryId = createCategory(db, baseCategory)
      const divisionA = createDivision(db, { name: 'A' })
      const divisionB = createDivision(db, { name: 'B' })

      addCategoryToDivision(db, divisionA, categoryId, 3)
      addCategoryToDivision(db, divisionB, categoryId, 1)

      const divisions = listDivisionsForCategory(db, categoryId)
      expect(divisions).toHaveLength(2)
      const byId = Object.fromEntries(divisions.map((entry) => [entry.divisionId, entry]))
      expect(byId[divisionA]).toEqual({ divisionId: divisionA, categoryId, depth: 3 })
      expect(byId[divisionB]).toEqual({ divisionId: divisionB, categoryId, depth: 1 })
    })
  })

  it('builds division view with categories and scoreables', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, baseDivision)
      const categoryId = createCategory(db, baseCategory)
      const scoreableId = createScoreable(db, baseScoreable)
      const playerA = createPlayer(db, basePlayer('A'))
      const playerB = createPlayer(db, basePlayer('B'))

      addScoreableToCategory(db, categoryId, scoreableId)
      addCategoryToDivision(db, divisionId, categoryId, 4)
      addPlayerToDivision(db, divisionId, playerA)
      addPlayerToDivision(db, divisionId, playerB)

      const view = getDivisionView(db, divisionId)
      expect(view).toBeDefined()
      expect(view?.categories).toHaveLength(1)
      expect(new Set(view?.eligiblePlayerIds)).toEqual(new Set([playerA, playerB]))

      const [categoryView] = view!.categories
      expect(categoryView.depth).toBe(4)
      expect(categoryView.category.id).toBe(categoryId)
      expect(categoryView.scoreables).toHaveLength(1)
      expect(categoryView.scoreables[0]).toMatchObject({
        id: scoreableId,
        label: baseScoreable.label
      })

      const all = listDivisionViews(db)
      expect(all).toHaveLength(1)
      expect(all[0].categories[0].scoreables[0].unit).toBe(baseScoreable.unit)
      expect(new Set(all[0].eligiblePlayerIds)).toEqual(new Set([playerA, playerB]))
    })
  })

  it('manages player eligibility assignments', () => {
    withInMemoryDb((db) => {
      const divisionId = createDivision(db, baseDivision)
      const playerA = createPlayer(db, basePlayer('A'))
      const playerB = createPlayer(db, basePlayer('B'))

      expect(listPlayerIdsForDivision(db, divisionId)).toHaveLength(0)

      addPlayerToDivision(db, divisionId, playerA)
      addPlayerToDivision(db, divisionId, playerB)

      const players = listPlayerIdsForDivision(db, divisionId)
      expect(new Set(players)).toEqual(new Set([playerA, playerB]))

      const divisionsForPlayer = listDivisionIdsForPlayer(db, playerA)
      expect(divisionsForPlayer).toEqual([divisionId])

      const removed = removePlayerFromDivision(db, divisionId, playerA)
      expect(removed).toBe(true)
      expect(listPlayerIdsForDivision(db, divisionId)).toEqual([playerB])
    })
  })
})

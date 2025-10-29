import { describe, expect, it } from 'vitest'
import { withInMemoryDb } from '@core/db/db'
import {
  addScoreableToCategory,
  createCategory,
  deleteCategory,
  getCategory,
  listAllCategories,
  listCategoryIdsForScoreable,
  listScoreableIdsForCategory,
  removeScoreableFromCategory,
  updateCategory,
  type NewCategory
} from './categories'
import {
  createScoreable,
  type NewScoreable
} from './scoreables'

const baseCategory: NewCategory = {
  name: 'Overall',
  direction: 'asc'
}

const baseScoreable: NewScoreable = {
  label: 'Time',
  unit: 'seconds'
}

describe('categories data access', () => {
  it('creates and retrieves a category', () => {
    withInMemoryDb((db) => {
      const id = createCategory(db, baseCategory)
      const category = getCategory(db, id)

      expect(category).toBeDefined()
      expect(category?.id).toBe(id)
      expect(category).toMatchObject(baseCategory)
      expect(category?.createdAt).toBeTypeOf('number')
      expect(category?.updatedAt).toBeTypeOf('number')
    })
  })

  it('updates a category and refreshes updatedAt', () => {
    withInMemoryDb((db) => {
      const id = createCategory(db, baseCategory)
      const before = getCategory(db, id)

      const changed = updateCategory(db, id, { name: 'Speed' })
      expect(changed).toBe(true)

      const after = getCategory(db, id)
      expect(after?.name).toBe('Speed')
      expect(after?.updatedAt).toBeGreaterThanOrEqual(before!.updatedAt)
    })
  })

  it('returns false on empty patch', () => {
    withInMemoryDb((db) => {
      const id = createCategory(db, baseCategory)
      const before = getCategory(db, id)

      const changed = updateCategory(db, id, {})
      expect(changed).toBe(false)

      const after = getCategory(db, id)
      expect(after?.updatedAt).toBe(before?.updatedAt)
    })
  })

  it('deletes a category', () => {
    withInMemoryDb((db) => {
      const id = createCategory(db, baseCategory)
      const deleted = deleteCategory(db, id)

      expect(deleted).toBe(true)
      expect(getCategory(db, id)).toBeUndefined()
    })
  })

  it('lists categories ordered by name', () => {
    withInMemoryDb((db) => {
      createCategory(db, { name: 'Speed', direction: 'asc' })
      createCategory(db, { name: 'Accuracy', direction: 'desc' })
      createCategory(db, { name: 'Strength', direction: 'asc' })

      const categories = listAllCategories(db)
      expect(categories.map((c) => c.name)).toEqual(['Accuracy', 'Speed', 'Strength'])
    })
  })

  it('links scoreables to categories without duplicates', () => {
    withInMemoryDb((db) => {
      const categoryId = createCategory(db, baseCategory)
      const scoreableId = createScoreable(db, baseScoreable)

      const first = addScoreableToCategory(db, categoryId, scoreableId)
      expect(first).toBe(true)
      const second = addScoreableToCategory(db, categoryId, scoreableId)
      expect(second).toBe(false) // onConflictDoNothing

      const scoreableIds = listScoreableIdsForCategory(db, categoryId)
      expect(scoreableIds).toEqual([scoreableId])
    })
  })

  it('removes scoreable from category', () => {
    withInMemoryDb((db) => {
      const categoryId = createCategory(db, baseCategory)
      const scoreableId = createScoreable(db, baseScoreable)

      addScoreableToCategory(db, categoryId, scoreableId)
      const removed = removeScoreableFromCategory(db, categoryId, scoreableId)
      expect(removed).toBe(true)

      expect(listScoreableIdsForCategory(db, categoryId)).toHaveLength(0)
    })
  })

  it('lists categories for a scoreable', () => {
    withInMemoryDb((db) => {
      const scoreableId = createScoreable(db, baseScoreable)
      const categoryA = createCategory(db, { name: 'A', direction: 'asc' })
      const categoryB = createCategory(db, { name: 'B', direction: 'desc' })

      addScoreableToCategory(db, categoryA, scoreableId)
      addScoreableToCategory(db, categoryB, scoreableId)

      const categoryIds = listCategoryIdsForScoreable(db, scoreableId)
      expect(new Set(categoryIds)).toEqual(new Set([categoryA, categoryB]))
    })
  })
})

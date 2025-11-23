import { describe, expect, it } from 'vitest'
import { withInMemoryDb } from '@core/db/db'
import {
  addMetricToCategory,
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  listCategoryIdsForMetric,
  listMetricIdsForCategory,
  removeMetricFromCategory,
  updateCategory,
  type NewCategory
} from './categories'
import { createMetric, type NewMetric } from './metrics'
import { addCategoryToDivision, createDivision } from './divisions'

const baseCategory: NewCategory = {
  name: 'Overall',
  direction: 'asc'
}

const baseMetric: NewMetric = {
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
      expect(category?.rules).toEqual([])
      expect(category?.createdAt).toBeTypeOf('number')
      expect(category?.updatedAt).toBeTypeOf('number')
    })
  })

  it('stores metric count preferences on create/update', () => {
    withInMemoryDb((db) => {
      const id = createCategory(db, {
        name: 'Tally',
        direction: 'desc',
        showMetricsCount: true,
        metricsCountName: 'Fish Count'
      })

      const created = getCategory(db, id)
      expect(created?.showMetricsCount).toBe(true)
      expect(created?.metricsCountName).toBe('Fish Count')

      updateCategory(db, id, {
        metricsCountName: ' Total Fish ',
        showMetricsCount: true
      })

      const renamed = getCategory(db, id)
      expect(renamed?.metricsCountName).toBe('Total Fish')

      updateCategory(db, id, { showMetricsCount: false })
      const hidden = getCategory(db, id)
      expect(hidden?.showMetricsCount).toBe(false)
      expect(hidden?.metricsCountName).toBe('')
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

  it('normalizes rules when creating and updating', () => {
    withInMemoryDb((db) => {
      const id = createCategory(db, {
        name: 'Technique',
        direction: 'asc',
        rules: ['  rule-a', 'rule-b', 'rule-a', '', '  ']
      })

      const created = getCategory(db, id)
      expect(created?.rules).toEqual(['rule-a', 'rule-b'])

      const changed = updateCategory(db, id, { rules: ['rule-c', 'rule-c', ''] })
      expect(changed).toBe(true)

      const updated = getCategory(db, id)
      expect(updated?.rules).toEqual(['rule-c'])
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

      const categories = listCategories(db)
      expect(categories.map((c) => c.name)).toEqual(['Accuracy', 'Speed', 'Strength'])
    })
  })

  it('includes referencing divisions in each category', () => {
    withInMemoryDb((db) => {
      const categoryId = createCategory(db, baseCategory)
      const alpha = createDivision(db, { name: 'Alpha' })
      const beta = createDivision(db, { name: 'Beta' })

      addCategoryToDivision(db, alpha, categoryId)
      addCategoryToDivision(db, beta, categoryId)

      const [category] = listCategories(db)
      expect(category.divisions).toEqual(
        [alpha, beta]
          .sort((a, b) => a.localeCompare(b))
          .map((id) => ({
            id,
            name: id === alpha ? 'Alpha' : 'Beta'
          }))
      )
    })
  })

  it('links metrics to categories without duplicates', () => {
    withInMemoryDb((db) => {
      const categoryId = createCategory(db, baseCategory)
      const metricId = createMetric(db, baseMetric)

      const first = addMetricToCategory(db, categoryId, metricId)
      expect(first).toBe(true)
      const second = addMetricToCategory(db, categoryId, metricId)
      expect(second).toBe(false) // onConflictDoNothing

      const metricIds = listMetricIdsForCategory(db, categoryId)
      expect(metricIds).toEqual([metricId])
    })
  })

  it('removes metric from category', () => {
    withInMemoryDb((db) => {
      const categoryId = createCategory(db, baseCategory)
      const metricId = createMetric(db, baseMetric)

      addMetricToCategory(db, categoryId, metricId)
      const removed = removeMetricFromCategory(db, categoryId, metricId)
      expect(removed).toBe(true)

      expect(listMetricIdsForCategory(db, categoryId)).toHaveLength(0)
    })
  })

  it('lists categories for a metric', () => {
    withInMemoryDb((db) => {
      const metricId = createMetric(db, baseMetric)
      const categoryA = createCategory(db, { name: 'A', direction: 'asc' })
      const categoryB = createCategory(db, { name: 'B', direction: 'desc' })

      addMetricToCategory(db, categoryA, metricId)
      addMetricToCategory(db, categoryB, metricId)

      const categoryIds = listCategoryIdsForMetric(db, metricId)
      expect(new Set(categoryIds)).toEqual(new Set([categoryA, categoryB]))
    })
  })
})

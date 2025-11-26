import { describe, expect, it } from 'vitest'
import { withInMemoryDb } from '@core/db/db'
import {
  createMetric,
  deleteMetric,
  getMetric,
  listMetrics,
  updateMetric,
  type NewMetric
} from './metrics'
import { addMetricToCategory, createCategory } from './categories'

const baseMetric: NewMetric = {
  label: 'Time',
  unit: 'seconds'
}

describe('metrics data access', () => {
  it('creates and retrieves a metric', () => {
    withInMemoryDb((db) => {
      const id = createMetric(db, baseMetric)
      const metric = getMetric(db, id)

      expect(metric).toBeDefined()
      expect(metric?.id).toBe(id)
      expect(metric).toMatchObject(baseMetric)
      expect(metric?.createdAt).toBeTypeOf('number')
      expect(metric?.updatedAt).toBeTypeOf('number')
    })
  })

  it('updates a metric and refreshes updatedAt', () => {
    withInMemoryDb((db) => {
      const id = createMetric(db, baseMetric)
      const before = getMetric(db, id)
      expect(before).toBeDefined()

      const changed = updateMetric(db, id, { label: 'Points' })
      expect(changed).toBe(true)

      const after = getMetric(db, id)
      expect(after?.label).toBe('Points')
      expect(after?.updatedAt).toBeGreaterThanOrEqual(before!.updatedAt)
    })
  })

  it('returns false on empty patch', () => {
    withInMemoryDb((db) => {
      const id = createMetric(db, baseMetric)
      const before = getMetric(db, id)

      const changed = updateMetric(db, id, {})
      expect(changed).toBe(false)

      const after = getMetric(db, id)
      expect(after?.updatedAt).toBe(before?.updatedAt)
    })
  })

  it('deletes a metric', () => {
    withInMemoryDb((db) => {
      const id = createMetric(db, baseMetric)

      const deleted = deleteMetric(db, id)
      expect(deleted).toBe(true)
      expect(getMetric(db, id)).toBeUndefined()
    })
  })

  it('lists metrics ordered by label', () => {
    withInMemoryDb((db) => {
      createMetric(db, { label: 'Speed', unit: 'mph' })
      createMetric(db, { label: 'Accuracy', unit: '%' })
      createMetric(db, { label: 'Strength', unit: 'kg' })

      const metrics = listMetrics(db)
      expect(metrics.map((s) => s.label)).toEqual(['Accuracy', 'Speed', 'Strength'])
    })
  })

  it('returns metrics with categories', () => {
    withInMemoryDb((db) => {
      const metricId = createMetric(db, baseMetric)
      const categoryId = createCategory(db, {
        name: 'Cat',
        direction: 'desc',
        mode: 'aggregate',
        showMetricsCount: false
      })
      addMetricToCategory(db, categoryId, metricId)

      const metrics = listMetrics(db)

      expect(metrics).toHaveLength(1)
      expect(metrics[0].categories).toEqual([categoryId])
    })
  })
})

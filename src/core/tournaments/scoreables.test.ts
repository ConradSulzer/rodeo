import { describe, expect, it } from 'vitest'
import { withInMemoryDb } from '@core/db/db'
import {
  createScoreable,
  deleteScoreable,
  getScoreable,
  listAllScoreables,
  updateScoreable,
  type NewScoreable
} from './scoreables'

const baseScoreable: NewScoreable = {
  label: 'Time',
  unit: 'seconds'
}

describe('scoreables data access', () => {
  it('creates and retrieves a scoreable', () => {
    withInMemoryDb((db) => {
      const id = createScoreable(db, baseScoreable)
      const scoreable = getScoreable(db, id)

      expect(scoreable).toBeDefined()
      expect(scoreable?.id).toBe(id)
      expect(scoreable).toMatchObject(baseScoreable)
      expect(scoreable?.createdAt).toBeTypeOf('number')
      expect(scoreable?.updatedAt).toBeTypeOf('number')
    })
  })

  it('updates a scoreable and refreshes updatedAt', () => {
    withInMemoryDb((db) => {
      const id = createScoreable(db, baseScoreable)
      const before = getScoreable(db, id)
      expect(before).toBeDefined()

      const changed = updateScoreable(db, id, { label: 'Points' })
      expect(changed).toBe(true)

      const after = getScoreable(db, id)
      expect(after?.label).toBe('Points')
      expect(after?.updatedAt).toBeGreaterThanOrEqual(before!.updatedAt)
    })
  })

  it('returns false on empty patch', () => {
    withInMemoryDb((db) => {
      const id = createScoreable(db, baseScoreable)
      const before = getScoreable(db, id)

      const changed = updateScoreable(db, id, {})
      expect(changed).toBe(false)

      const after = getScoreable(db, id)
      expect(after?.updatedAt).toBe(before?.updatedAt)
    })
  })

  it('deletes a scoreable', () => {
    withInMemoryDb((db) => {
      const id = createScoreable(db, baseScoreable)

      const deleted = deleteScoreable(db, id)
      expect(deleted).toBe(true)
      expect(getScoreable(db, id)).toBeUndefined()
    })
  })

  it('lists scoreables ordered by label', () => {
    withInMemoryDb((db) => {
      createScoreable(db, { label: 'Speed', unit: 'mph' })
      createScoreable(db, { label: 'Accuracy', unit: '%' })
      createScoreable(db, { label: 'Strength', unit: 'kg' })

      const scoreables = listAllScoreables(db)
      expect(scoreables.map((s) => s.label)).toEqual(['Accuracy', 'Speed', 'Strength'])
    })
  })
})

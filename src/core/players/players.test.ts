import { describe, expect, it } from 'vitest'
import { withInMemoryDb } from '@core/db/db'
import type { AppDatabase } from '@core/db/db'
import {
  createPlayer,
  deletePlayer,
  listEnrichedPlayers,
  updatePlayer,
  type NewPlayer
} from './players'
import { createMetric } from '@core/tournaments/metrics'
import { addMetricToCategory, createCategory } from '@core/tournaments/categories'
import {
  addCategoryToDivision,
  addPlayerToDivision,
  createDivision
} from '@core/tournaments/divisions'

const basePlayer: NewPlayer = {
  firstName: 'Jane',
  lastName: 'Doe',
  displayName: 'Jane Doe',
  email: 'jane@example.com'
}

function getPlayerById(db: AppDatabase, id: string) {
  return listEnrichedPlayers(db).find((player) => player.id === id)
}

describe('players data access', () => {
  it('creates and retrieves a player', () => {
    withInMemoryDb((db) => {
      const id = createPlayer(db, basePlayer)
      const player = getPlayerById(db, id)

      expect(player).toBeDefined()
      expect(player?.id).toBe(id)
      expect(player).toMatchObject({
        ...basePlayer
      })
      expect(player?.cellPhone).toBeNull()
      expect(player?.emergencyContact).toBeNull()
      expect(player?.createdAt).toBeTypeOf('number')
      expect(player?.updatedAt).toBeTypeOf('number')
    })
  })

  it('updates a player and refreshes updatedAt', () => {
    withInMemoryDb((db) => {
      const id = createPlayer(db, basePlayer)
      const before = getPlayerById(db, id)
      expect(before).toBeDefined()

      const changed = updatePlayer(db, id, { displayName: 'JD' })
      expect(changed).toBe(true)

      const after = getPlayerById(db, id)
      expect(after?.displayName).toBe('JD')
      expect(after?.cellPhone).toBeNull()
      expect(after?.updatedAt).toBeGreaterThanOrEqual(before!.updatedAt)
    })
  })

  it('skips update on empty patch', () => {
    withInMemoryDb((db) => {
      const id = createPlayer(db, basePlayer)
      const before = getPlayerById(db, id)

      const changed = updatePlayer(db, id, {})
      expect(changed).toBe(false)

      const after = getPlayerById(db, id)
      expect(after?.updatedAt).toBe(before?.updatedAt)
    })
  })

  it('deletes a player', () => {
    withInMemoryDb((db) => {
      const id = createPlayer(db, basePlayer)

      const deleted = deletePlayer(db, id)
      expect(deleted).toBe(true)
      expect(getPlayerById(db, id)).toBeUndefined()
    })
  })

  it('lists players ordered by display name', () => {
    withInMemoryDb((db) => {
      const ids = [
        createPlayer(db, { ...basePlayer, displayName: 'Charlie', email: 'c@example.com' }),
        createPlayer(db, { ...basePlayer, displayName: 'Alice', email: 'a@example.com' }),
        createPlayer(db, { ...basePlayer, displayName: 'Bob', email: 'b@example.com' })
      ]

      const players = listEnrichedPlayers(db)
      expect(players.map((p) => p.displayName)).toEqual(['Alice', 'Bob', 'Charlie'])
      expect(players).toHaveLength(ids.length)
    })
  })

  it('lists players with their divisions and metrics', () => {
    withInMemoryDb((db) => {
      const playerId = createPlayer(db, basePlayer)
      const soloId = createPlayer(db, {
        ...basePlayer,
        email: 'solo@example.com',
        displayName: 'Solo'
      })

      const weightId = createMetric(db, { label: 'Weight', unit: 'lb' })
      const lengthId = createMetric(db, { label: 'Length', unit: 'in' })

      const categoryId = createCategory(db, { name: 'Primary', direction: 'asc' })
      addMetricToCategory(db, categoryId, weightId)
      addMetricToCategory(db, categoryId, lengthId)

      const divisionId = createDivision(db, { name: 'Pro' })
      addCategoryToDivision(db, divisionId, categoryId, 1, 1)
      addPlayerToDivision(db, divisionId, playerId)

      const players = listEnrichedPlayers(db)

      const target = players.find((player) => player.id === playerId)
      expect(target).toBeDefined()
      expect(
        target?.divisions.map((division) => ({ id: division.id, name: division.name }))
      ).toEqual([{ id: divisionId, name: 'Pro' }])
      expect((target?.metrics ?? []).slice().sort()).toEqual([lengthId, weightId].sort())

      const solo = players.find((player) => player.id === soloId)
      expect(solo).toBeDefined()
      expect(solo?.divisions).toHaveLength(0)
      expect(solo?.metrics).toHaveLength(0)
    })
  })
  it('allows specifying optional contact fields', () => {
    withInMemoryDb((db) => {
      const id = createPlayer(db, {
        ...basePlayer,
        email: 'alternate@example.com',
        cellPhone: '555-1234',
        emergencyContact: '555-9876'
      })

      const player = getPlayerById(db, id)
      expect(player?.cellPhone).toBe('555-1234')
      expect(player?.emergencyContact).toBe('555-9876')

      const updated = updatePlayer(db, id, { cellPhone: null })
      expect(updated).toBe(true)

      const after = getPlayerById(db, id)
      expect(after?.cellPhone).toBeNull()
      expect(after?.emergencyContact).toBe('555-9876')
    })
  })
})

import { describe, expect, it } from 'vitest'
import { withInMemoryDb } from '@core/db/db'
import {
  createPlayer,
  deletePlayer,
  getPlayer,
  listAllPlayers,
  updatePlayer,
  type NewPlayer
} from './players'

const basePlayer: NewPlayer = {
  firstName: 'Jane',
  lastName: 'Doe',
  displayName: 'Jane Doe',
  email: 'jane@example.com'
}

describe('players data access', () => {
  it('creates and retrieves a player', () => {
    withInMemoryDb((db) => {
      const id = createPlayer(db, basePlayer)
      const player = getPlayer(db, id)

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
      const before = getPlayer(db, id)
      expect(before).toBeDefined()

      const changed = updatePlayer(db, id, { displayName: 'JD' })
      expect(changed).toBe(true)

      const after = getPlayer(db, id)
      expect(after?.displayName).toBe('JD')
      expect(after?.cellPhone).toBeNull()
      expect(after?.updatedAt).toBeGreaterThanOrEqual(before!.updatedAt)
    })
  })

  it('skips update on empty patch', () => {
    withInMemoryDb((db) => {
      const id = createPlayer(db, basePlayer)
      const before = getPlayer(db, id)

      const changed = updatePlayer(db, id, {})
      expect(changed).toBe(false)

      const after = getPlayer(db, id)
      expect(after?.updatedAt).toBe(before?.updatedAt)
    })
  })

  it('deletes a player', () => {
    withInMemoryDb((db) => {
      const id = createPlayer(db, basePlayer)

      const deleted = deletePlayer(db, id)
      expect(deleted).toBe(true)
      expect(getPlayer(db, id)).toBeUndefined()
    })
  })

  it('lists players ordered by display name', () => {
    withInMemoryDb((db) => {
      const ids = [
        createPlayer(db, { ...basePlayer, displayName: 'Charlie', email: 'c@example.com' }),
        createPlayer(db, { ...basePlayer, displayName: 'Alice', email: 'a@example.com' }),
        createPlayer(db, { ...basePlayer, displayName: 'Bob', email: 'b@example.com' })
      ]

      const players = listAllPlayers(db)
      expect(players.map((p) => p.displayName)).toEqual(['Alice', 'Bob', 'Charlie'])
      expect(players).toHaveLength(ids.length)
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

      const player = getPlayer(db, id)
      expect(player?.cellPhone).toBe('555-1234')
      expect(player?.emergencyContact).toBe('555-9876')

      const updated = updatePlayer(db, id, { cellPhone: null })
      expect(updated).toBe(true)

      const after = getPlayer(db, id)
      expect(after?.cellPhone).toBeNull()
      expect(after?.emergencyContact).toBe('555-9876')
    })
  })
})

import { describe, expect, it } from 'vitest'
import { withInMemoryDb } from '@core/db/db'
import {
  getTournamentMetadata,
  updateTournamentMetadata,
  type TournamentMetadataPatch
} from './tournaments'

describe('tournament metadata', () => {
  it('initializes metadata when missing', () => {
    withInMemoryDb((db) => {
      const metadata = getTournamentMetadata(db)
      expect(metadata.name).toBe('Untitled Tournament')
      expect(metadata.eventDate).toBeNull()
      expect(metadata.id).toBe('meta')
    })
  })

  it('updates metadata fields and trims name', () => {
    withInMemoryDb((db) => {
      const patch: TournamentMetadataPatch = {
        name: '  Rodeo Finals  ',
        eventDate: '2025-08-19'
      }

      const updated = updateTournamentMetadata(db, patch)
      expect(updated.name).toBe('Rodeo Finals')
      expect(updated.eventDate).toBe('2025-08-19')

      const latest = getTournamentMetadata(db)
      expect(latest.name).toBe('Rodeo Finals')
      expect(latest.eventDate).toBe('2025-08-19')
    })
  })

  it('resets name to default when cleared', () => {
    withInMemoryDb((db) => {
      updateTournamentMetadata(db, { name: 'Starter' })
      const updated = updateTournamentMetadata(db, { name: '' })
      expect(updated.name).toBe('Untitled Tournament')
    })
  })
})

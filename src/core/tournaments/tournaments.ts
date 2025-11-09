import { openDb, type AppDatabase } from '@core/db/db'
import { Timestamp } from '@core/types/Shared'
import type { ULID } from 'ulid'
import { tournamentMeta } from '@core/db/schema'
import { eq } from 'drizzle-orm'

export interface Tournament {
  id: ULID
  name: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

let current: ReturnType<typeof openDb> | null = null

export function openTournament(filePath: string) {
  current?.close()
  current = openDb(filePath)
  ensureTournamentRecord(current.db)
  return current.db
}

export function getTournamentDb() {
  if (!current) throw new Error('No tournament is currently open')
  return current.db
}

export function closeTournament() {
  current?.close()
  current = null
}

const TOURNAMENT_ID = 'meta'

const defaultTournament = () => ({
  id: TOURNAMENT_ID,
  name: 'Untitled Tournament',
  eventDate: null as string | null,
  createdAt: Date.now(),
  updatedAt: Date.now()
})

// Ensures that the metadata is there and if not creates the default form.
function ensureTournamentRecord(db: AppDatabase) {
  const existing = db
    .select()
    .from(tournamentMeta)
    .where(eq(tournamentMeta.id, TOURNAMENT_ID))
    .get()

  if (existing) return existing

  const defaults = defaultTournament()
  db.insert(tournamentMeta).values(defaults).run()
  return defaults
}

export type TournamentMetadata = typeof tournamentMeta.$inferSelect
export type TournamentMetadataPatch = Partial<Pick<TournamentMetadata, 'name' | 'eventDate'>>

export function getTournamentMetadata(db: AppDatabase): TournamentMetadata {
  const record = db.select().from(tournamentMeta).where(eq(tournamentMeta.id, TOURNAMENT_ID)).get()

  if (record) return record
  return ensureTournamentRecord(db)
}

export function updateTournamentMetadata(
  db: AppDatabase,
  patch: TournamentMetadataPatch
): TournamentMetadata {
  const updates: Partial<typeof tournamentMeta.$inferInsert> = {}

  ensureTournamentRecord(db)

  if (patch.name !== undefined) {
    const trimmed = patch.name.trim()
    updates.name = trimmed.length ? trimmed : 'Untitled Tournament'
  }

  if (patch.eventDate !== undefined) {
    updates.eventDate = patch.eventDate || null
  }

  updates.updatedAt = Date.now()

  db.update(tournamentMeta).set(updates).where(eq(tournamentMeta.id, TOURNAMENT_ID)).run()

  return getTournamentMetadata(db)
}

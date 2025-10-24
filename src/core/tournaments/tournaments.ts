import { openDb } from '@core/db/db'
import { Timestamp } from '@core/types/Shared'
import type { ULID } from 'ulid'

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

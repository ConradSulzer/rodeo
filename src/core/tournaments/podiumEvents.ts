import type { AppDatabase } from '@core/db/db'
import { podiumEvent as podiumEventTable } from '@core/db/schema'
import type { Timestamp } from '@core/types/Shared'
import type { ULID } from 'ulid'
import { asc } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

export type PodiumEventType = 'podium:remove-player' | 'podium:restore-player'

export type PodiumEventPayload = Record<string, unknown> | null | undefined

export type PodiumEventInput = {
  type: PodiumEventType
  divisionId: string
  categoryId: string
  playerId: string
  payload?: PodiumEventPayload
}

export type PodiumEvent = {
  id: ULID
  ts: Timestamp
  type: PodiumEventType
  divisionId: string
  categoryId: string
  playerId: string
  payload?: PodiumEventPayload
}

type PodiumEventRow = InferSelectModel<typeof podiumEventTable>

export function appendPodiumEvent(db: AppDatabase, event: PodiumEvent) {
  db.insert(podiumEventTable).values(encode(event)).run()
}

export function appendPodiumEvents(db: AppDatabase, events: PodiumEvent[]) {
  if (!events.length) return
  db.transaction((tx) => {
    for (const event of events) {
      tx.insert(podiumEventTable).values(encode(event)).run()
    }
  })
}

export function listPodiumEvents(db: AppDatabase): PodiumEvent[] {
  const rows = db.select().from(podiumEventTable).orderBy(asc(podiumEventTable.ts)).all()
  return rows.map(decode)
}

function encode(event: PodiumEvent) {
  return {
    id: event.id,
    type: event.type,
    ts: event.ts,
    divisionId: event.divisionId,
    categoryId: event.categoryId,
    playerId: event.playerId,
    payload: event.payload ?? null
  }
}

function decode(row: PodiumEventRow): PodiumEvent {
  return {
    id: row.id,
    type: row.type as PodiumEventType,
    ts: row.ts,
    divisionId: row.divisionId,
    categoryId: row.categoryId,
    playerId: row.playerId,
    payload: row.payload ?? undefined
  }
}

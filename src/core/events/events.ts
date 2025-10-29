import { Timestamp } from '@core/types/Shared'
import type { AppDatabase } from '@core/db/db'
import { ULID } from 'ulid'

import { event as ev } from '@core/db/schema'
import { asc, eq, and } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

export type EventId = ULID

export type EventType = 'ItemScored' | 'ItemCorrected' | 'ItemVoided'

export interface BaseEvent {
  id: EventId
  ts: Timestamp
  playerId: ULID
  scoreableId: ULID
  scoreableName: string
  note?: string
}

export interface ItemScored extends BaseEvent {
  type: 'ItemScored'
  value: number
}

export interface ItemCorrected extends BaseEvent {
  type: 'ItemCorrected'
  priorEventId: EventId
  value: number
}

export interface ItemVoided extends BaseEvent {
  type: 'ItemVoided'
  priorEventId: EventId
}

export type RodeoEvent = ItemScored | ItemCorrected | ItemVoided

type EventRow = InferSelectModel<typeof ev>

export function appendEvents(db: AppDatabase, events: RodeoEvent[]) {
  db.transaction((tx) => {
    for (const e of events) tx.insert(ev).values(encode(e)).run()
  })
}

export function appendEvent(db: AppDatabase, event: RodeoEvent) {
  appendEvents(db, [event])
}

export function getEvent(db: AppDatabase, id: EventId) {
  const row = db.select().from(ev).where(eq(ev.id, id)).get()
  return row ? decode(row) : undefined
}

export function listAllEvents(db: AppDatabase) {
  return db.select().from(ev).orderBy(asc(ev.ts)).all().map(decode)
}

export function listEventsForPlayerItem(db: AppDatabase, playerId: string, scoreableId: string) {
  const rows = db
    .select()
    .from(ev)
    .where(and(eq(ev.playerId, playerId), eq(ev.scoreableId, scoreableId)))
    .orderBy(asc(ev.ts))
    .all()
  return rows.map(decode)
}

export function listEventsForPlayer(db: AppDatabase, playerId: string): RodeoEvent[] {
  const rows = db.select().from(ev).where(eq(ev.playerId, playerId)).orderBy(asc(ev.ts)).all()

  return rows.map(decode)
}

const encode = (e: RodeoEvent) => ({
  id: e.id,
  type: e.type,
  ts: e.ts,
  playerId: e.playerId,
  scoreableId: e.scoreableId,
  scoreableName: e.scoreableName,
  value: 'value' in e ? e.value : null,
  priorEventId: 'priorEventId' in e ? e.priorEventId : null,
  note: e.note ?? null
})

const decode = (row: EventRow) => {
  if (row.type === 'ItemScored') {
    const event: ItemScored = {
      type: 'ItemScored',
      id: row.id,
      ts: row.ts,
      playerId: row.playerId,
      scoreableId: row.scoreableId,
      scoreableName: row.scoreableName,
      value: row.value!,
      note: row.note ?? undefined
    }
    return event
  }
  if (row.type === 'ItemCorrected') {
    const event: ItemCorrected = {
      type: 'ItemCorrected',
      id: row.id,
      ts: row.ts,
      playerId: row.playerId,
      scoreableId: row.scoreableId,
      scoreableName: row.scoreableName,
      priorEventId: row.priorEventId!,
      value: row.value!,
      note: row.note ?? undefined
    }
    return event
  }
  if (row.type === 'ItemVoided') {
    const event: ItemVoided = {
      type: 'ItemVoided',
      id: row.id,
      ts: row.ts,
      playerId: row.playerId,
      scoreableId: row.scoreableId,
      scoreableName: row.scoreableName,
      priorEventId: row.priorEventId!,
      note: row.note ?? undefined
    }
    return event
  }

  throw new Error(`Unknown event type in decode: ${row.type}`)
}

export function sortEventsByTime(events: RodeoEvent[]): RodeoEvent[] {
  return [...events].sort((a, b) => (a.ts === b.ts ? a.id.localeCompare(b.id) : a.ts - b.ts))
}

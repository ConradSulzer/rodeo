import { Timestamp } from '@core/types/Shared'
import type { AppDatabase } from '@core/db/db'
import { ULID } from 'ulid'

import { event as ev } from '@core/db/schema'
import { asc, eq, and } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

export type EventId = ULID

export type ItemState = 'value' | 'empty'

export interface BaseEvent {
  id: EventId
  ts: Timestamp
  playerId: ULID
  note?: string
}

export interface ItemStateChanged extends BaseEvent {
  type: 'ItemStateChanged'
  scoreableId: ULID
  state: ItemState
  value?: number
  priorEventId?: EventId
}

export interface ScorecardVoided extends BaseEvent {
  type: 'ScorecardVoided'
}

export type RodeoEvent = ItemStateChanged | ScorecardVoided

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

const encode = (e: RodeoEvent) => {
  if (e.type === 'ItemStateChanged') {
    return {
      id: e.id,
      type: e.type,
      state: e.state,
      ts: e.ts,
      playerId: e.playerId,
      scoreableId: e.scoreableId,
      value: e.state === 'value' ? (e.value ?? null) : null,
      priorEventId: e.priorEventId ?? null,
      note: e.note ?? null
    }
  }

  if (e.type === 'ScorecardVoided') {
    return {
      id: e.id,
      type: e.type,
      state: null,
      ts: e.ts,
      playerId: e.playerId,
      scoreableId: null,
      value: null,
      priorEventId: null,
      note: e.note ?? null
    }
  }

  throw new Error(`Unsupported event type for encode: ${(e as { type: string }).type}`)
}

const decode = (row: EventRow): RodeoEvent => {
  if (row.type === 'ItemStateChanged') {
    const event: ItemStateChanged = {
      type: 'ItemStateChanged',
      id: row.id,
      ts: row.ts,
      playerId: row.playerId,
      scoreableId: row.scoreableId!,
      state: row.state as ItemState,
      value: row.value ?? undefined,
      priorEventId: row.priorEventId ?? undefined,
      note: row.note ?? undefined
    }
    return event
  }

  if (row.type === 'ScorecardVoided') {
    const event: ScorecardVoided = {
      type: 'ScorecardVoided',
      id: row.id,
      ts: row.ts,
      playerId: row.playerId,
      note: row.note ?? undefined
    }
    return event
  }

  throw new Error(`Unknown event type in decode: ${row.type}`)
}

export function sortEventsByTime<T extends { ts: Timestamp; id: EventId }>(events: T[]): T[] {
  return [...events].sort((a, b) => (a.ts === b.ts ? a.id.localeCompare(b.id) : a.ts - b.ts))
}

import { Timestamp } from '@core/types/Shared'
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { ULID } from 'ulid'

import { event as ev } from '@core/db/schema'
import { asc, eq, and } from 'drizzle-orm'

export type EventId = ULID

export type EventType = 'ItemMeasured' | 'ItemCorrected' | 'ItemVoided'

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

export function appendEvents(db: BetterSQLite3Database, events: RodeoEvent[]) {
  db.transaction((tx) => {
    for (const e of events) tx.insert(ev).values(encode(e)).run()
  })
}

export function appendEvent(db: BetterSQLite3Database, event: RodeoEvent) {
  appendEvents(db, [event])
}

export function getEvent(db: BetterSQLite3Database, id: EventId) {
  const row = db.select().from(ev).where(eq(ev.id, id)).get()
  return row ? decode(row) : undefined
}

export function listAllEvents(db: BetterSQLite3Database) {
  return db.select().from(ev).orderBy(asc(ev.ts)).all().map(decode)
}

export function listEventsForPlayerItem(
  db: BetterSQLite3Database,
  playerId: ULID,
  scoreableId: ULID
) {
  const rows = db
    .select()
    .from(ev)
    .where(and(eq(ev.playerId, playerId), eq(ev.scoreableId, scoreableId)))
    .orderBy(asc(ev.ts))
    .all()
  return rows.map(decode)
}

export function listEventsForPlayer(db: BetterSQLite3Database, playerId: ULID): RodeoEvent[] {
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

const decode = (r: any): RodeoEvent => {
  if (r.type === 'ItemMeasured')
    return {
      type: r.type,
      id: r.id,
      ts: r.ts,
      playerId: r.playerId,
      scoreableId: r.scoreableId,
      scoreableName: r.scoreableName,
      value: r.value!,
      note: r.note ?? undefined
    }
  if (r.type === 'ItemCorrected')
    return {
      type: r.type,
      id: r.id,
      ts: r.ts,
      playerId: r.playerId,
      scoreableId: r.scoreableId,
      scoreableName: r.scoreableName,
      priorEventId: r.priorEventId!,
      value: r.value!,
      note: r.note ?? undefined
    }
  return {
    type: 'ItemVoided',
    id: r.id,
    ts: r.ts,
    playerId: r.playerId,
    scoreableId: r.scoreableId,
    scoreableName: r.scoreableName,
    priorEventId: r.priorEventId!,
    note: r.note ?? undefined
  }
}

export function sortEventsByTime(events: RodeoEvent[]): RodeoEvent[] {
  return [...events].sort((a, b) => (a.ts === b.ts ? a.id.localeCompare(b.id) : a.ts - b.ts))
}

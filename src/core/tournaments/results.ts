import { applyBatch, applyEvent } from '@core/events/eventReducer'
import {
  appendEvent,
  EventId,
  getEvent,
  listAllEvents,
  ItemState,
  RodeoEvent
} from '@core/events/events'
import { Timestamp } from '@core/types/Shared'
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'

import type { ULID } from 'ulid'

export type ItemResult = {
  status: ItemState
  value?: number
  srcEventId: EventId // last event responsible for this value
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type PlayerItems = Map<ULID, ItemResult>
export type Results = Map<ULID, PlayerItems> // playerId -> itemId -> ItemResult

export function cloneResults(results: Results): Results {
  const clone: Results = new Map()
  for (const [playerId, items] of results) {
    const itemClone = new Map<ULID, ItemResult>()
    for (const [scoreableId, result] of items) {
      itemClone.set(scoreableId, { ...result })
    }
    clone.set(playerId, itemClone)
  }
  return clone
}

/**
 * Add a player to a results map and set items to empty map.
 */
export function addPlayerToResults(results: Results, playerId: ULID) {
  const items = new Map<ULID, ItemResult>()
  results.set(playerId, items)
  return items
}

/**
 * Looks into a Results map and returns a player's items or undefined if player
 * does not exist in results
 */
export function getPlayerItems(results: Results, playerId: ULID) {
  return results.get(playerId)
}

/**
 * Looks into a Results map to get a player's items. If nothing exists for the
 * player it adds the player to results and sets their items to an empty Map.
 */

export function getOrCreatePlayerItems(results: Results, playerId: ULID) {
  let items = results.get(playerId)
  if (!items) {
    items = new Map<ULID, ItemResult>()
    results.set(playerId, items)
  }
  return items
}

/**
 * Build a results map from all the events in a given store/DB
 */
export function buildResults(db: BetterSQLite3Database) {
  const events = listAllEvents(db)
  const resolve = (id: ULID) => getEvent(db, id)
  const emptyResults: Results = new Map()

  return applyBatch(emptyResults, events, resolve)
}

/**
 * Record an event to a given DB. Apply that event to the given results map.
 */
export function recordEvent(db: BetterSQLite3Database, results: Results, event: RodeoEvent) {
  appendEvent(db, event)

  const resolve = (id: ULID) => getEvent(db, id)

  return applyEvent(results, event, resolve)
}

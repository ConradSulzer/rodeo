import { reduceBatch } from '@core/events/eventReducer'
import { EventId, getEvent, listAllEvents, ItemState } from '@core/events/events'
import { Timestamp } from '@core/types/Shared'
import type { AppDatabase } from '@core/db/db'

import type { ULID } from 'ulid'
import type { EnrichedPlayer } from '@core/players/players'

export type ItemResult = {
  status: ItemState
  value?: number
  srcEventId: EventId // last event responsible for this value
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type PlayerItems = Map<ULID, ItemResult>
export type PlayerResult = {
  items: PlayerItems
  /**
   * Timestamp when the first score was recorded for this player.
   * Used for tie-breaking in standings.
   */
  scoredAt?: Timestamp | null
}
export type Results = Map<ULID, PlayerResult> // playerId -> { items, scoredAt }

export type ResultsRow = {
  player: EnrichedPlayer
  divisionIds: ULID[]
  scoredAt: Timestamp | null
  scores: Record<ULID, ItemResult | undefined>
}

export function cloneResults(results: Results): Results {
  const clone: Results = new Map()
  for (const [playerId, playerResult] of results) {
    const itemClone = new Map<ULID, ItemResult>()
    for (const [metricId, result] of playerResult.items) {
      itemClone.set(metricId, { ...result })
    }
    clone.set(playerId, { items: itemClone, scoredAt: playerResult.scoredAt ?? null })
  }
  return clone
}

/**
 * Add a player to a results map and set items to empty map.
 */
export function addPlayerToResults(results: Results, playerId: ULID) {
  const items = new Map<ULID, ItemResult>()
  const playerResult: PlayerResult = { items, scoredAt: null }
  results.set(playerId, playerResult)
  return playerResult
}

/**
 * Looks into a Results map and returns a player's items or undefined if player
 * does not exist in results
 */
export function getPlayerItems(results: Results, playerId: ULID) {
  return results.get(playerId)?.items
}

/**
 * Looks into a Results map to get a player's items. If nothing exists for the
 * player it adds the player to results and sets their items to an empty Map.
 */

export function getOrCreatePlayerItems(results: Results, playerId: ULID) {
  const playerResult = getOrCreatePlayerResult(results, playerId)
  return playerResult.items
}

export function getOrCreatePlayerResult(results: Results, playerId: ULID): PlayerResult {
  let entry = results.get(playerId)
  if (!entry) {
    entry = addPlayerToResults(results, playerId)
  }
  return entry
}

/**
 * Build a results map from all the events in a given store/DB
 */
export function buildResults(db: AppDatabase) {
  const events = listAllEvents(db)
  const resolve = (id: ULID) => getEvent(db, id)
  const emptyResults: Results = new Map()

  return reduceBatch(emptyResults, events, resolve)
}

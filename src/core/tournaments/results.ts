import { Timestamp } from '@core/types/Shared'

import type { ULID } from 'ulid'
import { EventId } from '@core/types/events'

export type ItemResult = {
  name: string
  value: number
  srcEventId: EventId // last event responsible for this value
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type PlayerItems = Map<ULID, ItemResult>
export type Results = Map<ULID, PlayerItems> // playerId -> itemId -> ItemResult

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

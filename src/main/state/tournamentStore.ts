import { appendEvent, getEvent, type RodeoEvent } from '@core/events/events'
import { computeAllDivisionStandings } from '@core/tournaments/standings'
import { buildResults, type Results } from '@core/tournaments/results'
import { listDivisions } from '@core/tournaments/divisions'
import { listViewablePlayers, type PlayerViewable } from '@core/players/players'
import type { AppDatabase } from '@core/db/db'
import type { SerializableTournamentState, SerializedResults } from '@core/tournaments/state'
import type { DivisionStanding } from '@core/tournaments/standings'
import { reduceEvent } from '@core/events/eventReducer'
import type { ULID } from 'ulid'
import {
  appendPodiumEvent,
  listPodiumEvents,
  type PodiumEvent
} from '@core/tournaments/podiumEvents'
import {
  applyPodiumEventToAdjustments,
  createEmptyPodiumAdjustments,
  serializePodiumAdjustments,
  type PodiumAdjustments
} from '@core/tournaments/podiumAdjustments'

/**
 * A listener is a function that is called with `state` when store `state` changes.
 */
type Listener = (serializedState: SerializableTournamentState) => void

type TournamentState = {
  results: Results
  standings: DivisionStanding[]
  podiumAdjustments: PodiumAdjustments
}

const createEmptyState = (): TournamentState => ({
  results: new Map(),
  standings: [],
  podiumAdjustments: createEmptyPodiumAdjustments()
})

let state: TournamentState = createEmptyState()
const listeners = new Set<Listener>()
const EMPTY_STATE: SerializableTournamentState = {
  standings: [],
  results: [],
  podiumAdjustments: serializePodiumAdjustments(createEmptyPodiumAdjustments())
}

export function getState(): TournamentState {
  return state
}

export function getSerializableState(): SerializableTournamentState {
  return serializeState(state)
}

export function hydrate(db: AppDatabase): SerializableTournamentState {
  const { results, errors } = buildResults(db)

  if (errors.length) {
    console.warn('Errors encountered while hydrating results', errors)
  }

  const divisions = listDivisions(db)
  const playerDirectory = loadPlayerDirectory(db)
  const standings = computeAllDivisionStandings(results, divisions, playerDirectory)
  const podiumAdjustments = reducePodiumEvents(listPodiumEvents(db))

  state = {
    results,
    standings,
    podiumAdjustments
  }

  const serializable = serializeState(state)

  notify(serializable)

  return serializable
}

export function clear() {
  state = createEmptyState()
  notify(EMPTY_STATE)
}

/**
 * Registers a function in Listeners that will be called with `state` when the store state changes.
 * Returns a delete hook for use if we incorporate temporary listeners.
 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  listener(getSerializableState())
  return () => {
    listeners.delete(listener)
  }
}

export function applyEvent(db: AppDatabase, event: RodeoEvent): ReturnType<typeof reduceEvent> {
  appendEvent(db, event)

  const resolve = (id: ULID) => getEvent(db, id)
  const errors = reduceEvent(state.results, event, resolve)

  if (errors.length) return errors

  refreshStandings(db)

  return errors
}

export function applyPodiumEvent(db: AppDatabase, event: PodiumEvent) {
  appendPodiumEvent(db, event)
  state = {
    ...state,
    podiumAdjustments: applyPodiumEventToAdjustments(
      clonePodiumAdjustments(state.podiumAdjustments),
      event
    )
  }
  notify(serializeState(state))
}

export function refreshStandings(db: AppDatabase) {
  const divisions = listDivisions(db)
  const playerDirectory = loadPlayerDirectory(db)

  const standings = computeAllDivisionStandings(state.results, divisions, playerDirectory)

  state = {
    ...state,
    standings
  }

  notify(serializeState(state))
}

function serializeState(current: TournamentState): SerializableTournamentState {
  return {
    standings: current.standings,
    results: serializeResults(current.results),
    podiumAdjustments: serializePodiumAdjustments(current.podiumAdjustments)
  }
}

function serializeResults(results: Results): SerializedResults {
  const serialized: SerializedResults = []

  for (const [playerId, playerResult] of results) {
    serialized.push({
      playerId,
      scoredAt: playerResult.scoredAt ?? null,
      items: Array.from(playerResult.items.entries()).map(([metricId, result]) => ({
        metricId,
        result
      }))
    })
  }

  return serialized
}

function notify(update: SerializableTournamentState) {
  listeners.forEach((listener) => {
    try {
      listener(update)
    } catch (error) {
      console.error('Tournament store listener failed', error)
    }
  })
}

function reducePodiumEvents(events: PodiumEvent[]): PodiumAdjustments {
  const adjustments = createEmptyPodiumAdjustments()
  for (const event of events) {
    applyPodiumEventToAdjustments(adjustments, event)
  }
  return adjustments
}

function clonePodiumAdjustments(source: PodiumAdjustments): PodiumAdjustments {
  const removed = new Map<string, Map<string, Set<string>>>()
  source.removed.forEach((categories, divisionId) => {
    const categoryCopy = new Map<string, Set<string>>()
    categories.forEach((players, categoryId) => {
      categoryCopy.set(categoryId, new Set(players))
    })
    removed.set(divisionId, categoryCopy)
  })
  return { removed }
}

function loadPlayerDirectory(db: AppDatabase): Map<string, PlayerViewable> {
  const players = listViewablePlayers(db)
  return new Map(players.map((player) => [player.id, player]))
}

/**
 * Helper to run with functions that change structural parts of a tournament. Like when we
 * edit a division we can wrap that in `withStandingsRefresh` so that this store refreshes
 * if that edit is successful.
 *
 * Takes an optional `shouldRefresh` that you can use to indicate if the return value from
 * the mutator is valid or not.
 *
 * Takes an optional onRefresh if we want to alter what happens on refresh
 */
export function withStandingsRefresh<T>(
  db: AppDatabase,
  mutator: () => T,
  shouldRefresh: (value: T) => boolean = Boolean,
  onRefresh: (db: AppDatabase) => void = refreshStandings
): T {
  const result = mutator()
  if (shouldRefresh(result)) {
    onRefresh(db)
  }
  return result
}

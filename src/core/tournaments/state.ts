import type { ItemResult } from './results'
import type { Timestamp } from '@core/types/Shared'
import type { DivisionStanding } from './standings'

export type SerializedResults = Array<{
  playerId: string
  scoredAt?: Timestamp | null
  items: Array<{
    metricId: string
    result: ItemResult
  }>
}>

export type SerializableTournamentState = {
  standings: DivisionStanding[]
  results: SerializedResults
}

import type { ItemResult } from './results'
import type { DivisionStanding } from './standings'

export type SerializedResults = Array<{
  playerId: string
  items: Array<{
    scoreableId: string
    result: ItemResult
  }>
}>

export type SerializableTournamentState = {
  standings: DivisionStanding[]
  results: SerializedResults
}

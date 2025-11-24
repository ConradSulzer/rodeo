import { useMemo } from 'react'
import type { Player } from '@core/players/players'
import type { ItemResult } from '@core/tournaments/results'
import type { MetricRecord } from '@core/tournaments/metrics'
import { useMetricCatalog } from '@renderer/queries/metrics'
import { usePlayersQuery } from '@renderer/queries/players'
import { useTournamentStateQuery } from '@renderer/queries/tournament'

export type ResultRow = {
  player: Player
  displayName: string
  email: string
  divisionIds: string[]
  scores: Record<string, ItemResult | undefined>
}

export type ResultsData = {
  metrics: MetricRecord[]
  rows: ResultRow[]
  isLoading: boolean
}

export function useResultsData(): ResultsData {
  const { list: metrics, isLoading: metricsLoading } = useMetricCatalog()
  const { data: players = [], isLoading: playersLoading } = usePlayersQuery()
  const { data: tournamentState, isLoading: stateLoading } = useTournamentStateQuery()

  const playerMap = useMemo(() => {
    return new Map(players.map((player) => [player.id, player]))
  }, [players])

  const rows = useMemo<ResultRow[]>(() => {
    if (!tournamentState) return []
    return tournamentState.results
      .map((entry) => {
        const player = playerMap.get(entry.playerId)
        if (!player) return null
        const scores: Record<string, ItemResult | undefined> = {}
        entry.items.forEach((item) => {
          scores[item.metricId] = item.result
        })
        return {
          player,
          displayName: player.displayName,
          email: player.email ?? '',
          divisionIds: player.divisions.map((division) => division.id),
          scores
        }
      })
      .filter((row): row is ResultRow => row !== null)
  }, [playerMap, tournamentState])

  return {
    metrics,
    rows,
    isLoading: metricsLoading || playersLoading || stateLoading
  }
}

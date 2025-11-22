import { useMemo } from 'react'
import type { Player } from '@core/players/players'
import type { ItemResult } from '@core/tournaments/results'
import type { Metric } from '@core/tournaments/metrics'
import { useMetricCatalog } from '@renderer/queries/metrics'
import { usePlayerAssignmentsQuery } from '@renderer/queries/players'
import { useTournamentStateQuery } from '@renderer/queries/tournament'

export type ResultRow = {
  player: Player
  displayName: string
  email: string
  divisionIds: string[]
  scores: Record<string, ItemResult | undefined>
}

export type ResultsData = {
  metrics: Metric[]
  rows: ResultRow[]
  isLoading: boolean
}

export function useResultsData(): ResultsData {
  const { list: metrics, isLoading: metricsLoading } = useMetricCatalog()
  const { data: playerAssignments = [], isLoading: playersLoading } = usePlayerAssignmentsQuery()
  const { data: tournamentState, isLoading: stateLoading } = useTournamentStateQuery()

  const { playerMap, divisionMembership } = useMemo(() => {
    const playerMap = new Map<string, Player>()
    const divisionMembership = new Map<string, string[]>()

    playerAssignments.forEach(({ player, divisionIds }) => {
      playerMap.set(player.id, player)
      divisionMembership.set(player.id, divisionIds ?? [])
    })

    return { playerMap, divisionMembership }
  }, [playerAssignments])

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
          divisionIds: divisionMembership.get(entry.playerId) ?? [],
          scores
        }
      })
      .filter((row): row is ResultRow => row !== null)
  }, [divisionMembership, playerMap, tournamentState])

  return {
    metrics,
    rows,
    isLoading: metricsLoading || playersLoading || stateLoading
  }
}

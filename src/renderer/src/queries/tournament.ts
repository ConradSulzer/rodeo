import { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { SerializableTournamentState } from '@core/tournaments/state'
import type { ItemResult, ResultsRow } from '@core/tournaments/results'
import { queryKeys } from './queryKeys'
import { usePlayersMap } from './players'

export function useTournamentStateQuery() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.tournament.state(),
    queryFn: () => window.api.tournaments.getState(),
    staleTime: Infinity,
    refetchOnWindowFocus: false
  })

  useEffect(() => {
    const unsubscribe = window.api.tournaments.subscribe(
      (snapshot: SerializableTournamentState) => {
        queryClient.setQueryData(queryKeys.tournament.state(), snapshot)
      }
    )

    return () => {
      unsubscribe?.()
    }
  }, [queryClient])

  return query
}

type PlayerResultsMap = Map<string, { items: Map<string, ItemResult>; scoredAt: number | null }>

const buildResultsMap = (state?: SerializableTournamentState): PlayerResultsMap => {
  const map: PlayerResultsMap = new Map()
  if (!state) return map
  for (const entry of state.results) {
    map.set(entry.playerId, {
      scoredAt: entry.scoredAt ?? null,
      items: new Map(entry.items.map(({ metricId, result }) => [metricId, result]))
    })
  }
  return map
}

export function useTournamentResultsMap() {
  const query = useTournamentStateQuery()

  const map = useMemo(() => buildResultsMap(query.data), [query.data])

  return {
    ...query,
    map
  }
}

export function useTournamentResultsRows(): { rows: ResultsRow[]; isLoading: boolean } {
  const { map: resultsMap, isLoading: resultsLoading } = useTournamentResultsMap()
  const { map: playerMap, isLoading: playersLoading } = usePlayersMap()

  const rows = useMemo<ResultsRow[]>(() => {
    const list: ResultsRow[] = []
    for (const [playerId, playerResult] of resultsMap) {
      const player = playerMap?.get(playerId)
      if (!player) continue
      const scores: Record<string, ItemResult | undefined> = {}
      playerResult.items.forEach((itemResult, metricId) => {
        scores[metricId] = itemResult
      })
      list.push({
        player,
        divisionIds: player.divisions.map((division) => division.id),
        scoredAt: playerResult.scoredAt ?? null,
        scores
      })
    }
    return list
  }, [playerMap, resultsMap])

  return {
    rows,
    isLoading: resultsLoading || playersLoading
  }
}

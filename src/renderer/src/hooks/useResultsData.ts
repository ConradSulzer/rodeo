import { useMemo } from 'react'
import type { Player } from '@core/players/players'
import type { ItemResult } from '@core/tournaments/results'
import { useScoreablesListQuery } from '@renderer/queries/scoreables'
import { usePlayersListQuery } from '@renderer/queries/players'
import { useTournamentStateQuery } from '@renderer/queries/tournament'

const sortScoreables = (list: ReturnType<typeof useScoreablesListQuery>['data']) => {
  return [...(list ?? [])].sort((a, b) => a.label.localeCompare(b.label))
}

export type ResultRow = {
  playerId: string
  name: string
  scores: Record<string, ItemResult | undefined>
}

export type ResultsData = {
  scoreables: ReturnType<typeof sortScoreables>
  rows: ResultRow[]
  isLoading: boolean
}

export function useResultsData(): ResultsData {
  const { data: scoreableList, isLoading: scoreablesLoading } = useScoreablesListQuery()
  const { data: playerList = [], isLoading: playersLoading } = usePlayersListQuery()
  const { data: tournamentState, isLoading: stateLoading } = useTournamentStateQuery()

  const scoreables = useMemo(() => sortScoreables(scoreableList), [scoreableList])
  const playerMap = useMemo(() => {
    const map = new Map<string, Player>()
    playerList.forEach((player) => map.set(player.id, player))
    return map
  }, [playerList])

  const rows = useMemo<ResultRow[]>(() => {
    if (!tournamentState) return []
    return tournamentState.results.map((entry) => {
      const player = playerMap.get(entry.playerId)
      const scores: Record<string, ItemResult | undefined> = {}
      for (const item of entry.items) {
        scores[item.scoreableId] = item.result
      }
      return {
        playerId: entry.playerId,
        name: player?.displayName ?? 'Unknown Player',
        scores
      }
    })
  }, [playerMap, tournamentState])

  return {
    scoreables,
    rows,
    isLoading: scoreablesLoading || playersLoading || stateLoading
  }
}

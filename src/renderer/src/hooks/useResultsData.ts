import { useMemo } from 'react'
import type { Player } from '@core/players/players'
import type { ItemResult } from '@core/tournaments/results'
import { useScoreablesListQuery } from '@renderer/queries/scoreables'
import { usePlayersWithDivisionsQuery } from '@renderer/queries/players'
import { useTournamentStateQuery } from '@renderer/queries/tournament'

const sortScoreables = (list: ReturnType<typeof useScoreablesListQuery>['data']) => {
  return [...(list ?? [])].sort((a, b) => a.label.localeCompare(b.label))
}

export type ResultRow = {
  player: Player
  displayName: string
  email: string
  divisionIds: string[]
  scores: Record<string, ItemResult | undefined>
}

export type ResultsData = {
  scoreables: ReturnType<typeof sortScoreables>
  rows: ResultRow[]
  players: Player[]
  isLoading: boolean
}

export function useResultsData(): ResultsData {
  const { data: scoreableList, isLoading: scoreablesLoading } = useScoreablesListQuery()
  const { data: playerTuples = [], isLoading: playersLoading } = usePlayersWithDivisionsQuery()
  const { data: tournamentState, isLoading: stateLoading } = useTournamentStateQuery()

  const scoreables = useMemo(() => sortScoreables(scoreableList), [scoreableList])
  const { players, playerMap, divisionMembership } = useMemo(() => {
    const players: Player[] = []
    const playerMap = new Map<string, Player>()
    const divisionMembership = new Map<string, string[]>()

    playerTuples.forEach(([player, divisions]) => {
      players.push(player)
      playerMap.set(player.id, player)
      divisionMembership.set(player.id, divisions?.map((division) => division.id) ?? [])
    })

    return { players, playerMap, divisionMembership }
  }, [playerTuples])

  const rows = useMemo<ResultRow[]>(() => {
    if (!tournamentState) return []
    return tournamentState.results
      .map((entry) => {
        const player = playerMap.get(entry.playerId)
        if (!player) return null
        const scores: Record<string, ItemResult | undefined> = {}
        entry.items.forEach((item) => {
          scores[item.scoreableId] = item.result
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
    scoreables,
    rows,
    players,
    isLoading: scoreablesLoading || playersLoading || stateLoading
  }
}

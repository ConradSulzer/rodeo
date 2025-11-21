import { useQuery } from '@tanstack/react-query'
import type { Player, PlayerDivisionTuple } from '@core/players/players'
import { queryKeys } from './queryKeys'

const fetchPlayersWithDivisions = async (): Promise<PlayerDivisionTuple[]> => {
  return window.api.players.listWithDivisions()
}

const fetchPlayers = async (): Promise<Player[]> => {
  return window.api.players.list()
}

export function usePlayersWithDivisionsQuery() {
  return useQuery({
    queryKey: queryKeys.players.withDivisions(),
    queryFn: fetchPlayersWithDivisions
  })
}

export function usePlayersListQuery() {
  return useQuery({
    queryKey: queryKeys.players.list(),
    queryFn: fetchPlayers
  })
}

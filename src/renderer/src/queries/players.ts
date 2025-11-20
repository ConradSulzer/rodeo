import { useQuery } from '@tanstack/react-query'
import type { PlayerDivisionTuple } from '@core/players/players'
import { queryKeys } from './queryKeys'

const fetchPlayersWithDivisions = async (): Promise<PlayerDivisionTuple[]> => {
  return window.api.players.listWithDivisions()
}

export function usePlayersWithDivisionsQuery() {
  return useQuery({
    queryKey: queryKeys.players.withDivisions(),
    queryFn: fetchPlayersWithDivisions
  })
}

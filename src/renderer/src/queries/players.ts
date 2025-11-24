import { useQuery } from '@tanstack/react-query'
import type { Player } from '@core/players/players'
import { queryKeys } from './queryKeys'

const fetchPlayers = async (): Promise<Player[]> => {
  return window.api.players.list()
}

export function usePlayersQuery() {
  return useQuery({
    queryKey: queryKeys.players.list(),
    queryFn: fetchPlayers
  })
}

export function usePlayerDirectory() {
  const query = useQuery({
    queryKey: queryKeys.players.list(),
    queryFn: fetchPlayers,
    select: (players) => {
      const map = new Map<string, string>()
      players.forEach((player) => {
        map.set(player.id, player.displayName)
      })
      return map
    }
  })

  return {
    map: query.data ?? new Map<string, string>(),
    ...query
  }
}

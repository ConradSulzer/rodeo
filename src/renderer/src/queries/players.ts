import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { EnrichedPlayer } from '@core/players/players'
import { queryKeys } from './queryKeys'

const fetchPlayers = async (): Promise<EnrichedPlayer[]> => {
  return window.api.players.list()
}

export function usePlayersQuery() {
  return useQuery({
    queryKey: queryKeys.players.list(),
    queryFn: fetchPlayers
  })
}

export function usePlayerDirectory() {
  const { data, ...rest } = usePlayersQuery()

  const map = useMemo(() => {
    const players = data ?? []
    const directory = new Map(players.map((player) => [player.id, player.displayName]))
    return directory
  }, [data])

  return {
    ...rest,
    map
  }
}

export function usePlayersMap() {
  const { data, ...rest } = usePlayersQuery()

  const map = useMemo(() => {
    const players = data ?? []
    return new Map(players.map((player) => [player.id, player]))
  }, [data])

  return {
    ...rest,
    map
  }
}

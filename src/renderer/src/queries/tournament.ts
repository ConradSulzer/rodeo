import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { SerializableTournamentState } from '@core/tournaments/state'
import { queryKeys } from './queryKeys'

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

import { useQuery } from '@tanstack/react-query'
import type { PlayerAssignment } from '@core/players/players'
import { queryKeys } from './queryKeys'

const fetchPlayerAssignments = async (): Promise<PlayerAssignment[]> => {
  return window.api.players.listAssignments()
}

export function usePlayerAssignmentsQuery() {
  return useQuery({
    queryKey: queryKeys.players.assignments(),
    queryFn: fetchPlayerAssignments
  })
}

export function usePlayerDirectory() {
  const query = useQuery({
    queryKey: queryKeys.players.assignments(),
    queryFn: fetchPlayerAssignments,
    select: (assignments) => {
      const map = new Map<string, string>()
      assignments.forEach(({ player }) => {
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

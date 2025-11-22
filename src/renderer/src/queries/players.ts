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

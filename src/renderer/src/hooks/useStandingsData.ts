import { useMemo } from 'react'
import type { DivisionStanding } from '@core/tournaments/standings'
import { useDivisionCatalog } from '@renderer/queries/divisions'
import { usePlayerAssignmentsQuery } from '@renderer/queries/players'
import { useTournamentStateQuery } from '@renderer/queries/tournament'

export type StandingsData = {
  divisionViews: ReturnType<typeof useDivisionCatalog>['list']
  standings: DivisionStanding[]
  players: Map<string, string>
  isLoading: boolean
}

export function useStandingsData(): StandingsData {
  const { data: tournamentState, isLoading: stateLoading } = useTournamentStateQuery()
  const { list: divisionViews, isLoading: divisionsLoading } = useDivisionCatalog()
  const { data: playerAssignments = [], isLoading: playersLoading } = usePlayerAssignmentsQuery()

  const standings = useMemo(() => tournamentState?.standings ?? [], [tournamentState])
  const players = useMemo(() => {
    const lookup = new Map<string, string>()
    playerAssignments.forEach(({ player }) => lookup.set(player.id, player.displayName))
    return lookup
  }, [playerAssignments])

  return {
    divisionViews,
    standings,
    players,
    isLoading: stateLoading || divisionsLoading || playersLoading
  }
}

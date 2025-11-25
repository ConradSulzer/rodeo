import { useMemo } from 'react'
import type { DivisionStanding } from '@core/tournaments/standings'
import { useDivisionCatalog } from '@renderer/queries/divisions'
import { usePlayerDirectory } from '@renderer/queries/players'
import { useTournamentStateQuery } from '@renderer/queries/tournament'

export type StandingsData = {
  divisions: ReturnType<typeof useDivisionCatalog>['list']
  standings: DivisionStanding[]
  players: Map<string, string>
  isLoading: boolean
}

export function useStandingsData(): StandingsData {
  const { data: tournamentState, isLoading: stateLoading } = useTournamentStateQuery()
  const { list: divisions, isLoading: divisionsLoading } = useDivisionCatalog()
  const { data: players, isLoading: playersLoading } = usePlayerDirectory()

  const standings = useMemo(() => tournamentState?.standings ?? [], [tournamentState])

  return {
    divisions,
    standings,
    players,
    isLoading: stateLoading || divisionsLoading || playersLoading
  }
}

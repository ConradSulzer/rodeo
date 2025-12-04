import { useMemo } from 'react'
import type { DivisionStanding } from '@core/tournaments/standings'
import { useDivisionCatalog } from '@renderer/queries/divisions'
import { useTournamentStateQuery } from '@renderer/queries/tournament'

export type StandingsData = {
  divisions: ReturnType<typeof useDivisionCatalog>['list']
  standings: DivisionStanding[]
  isLoading: boolean
}

export function useStandingsData(): StandingsData {
  const { data: tournamentState, isLoading: stateLoading } = useTournamentStateQuery()
  const { list: divisions, isLoading: divisionsLoading } = useDivisionCatalog()

  const standings = useMemo(() => tournamentState?.standings ?? [], [tournamentState])

  return {
    divisions,
    standings,
    isLoading: stateLoading || divisionsLoading
  }
}

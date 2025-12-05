import { useMemo } from 'react'
import type { DivisionStanding } from '@core/tournaments/standings'
import {
  EMPTY_SERIALIZED_PODIUM_ADJUSTMENTS,
  type SerializedPodiumAdjustments
} from '@core/tournaments/podiumAdjustments'
import { useDivisionCatalog } from '@renderer/queries/divisions'
import { useTournamentStateQuery } from '@renderer/queries/tournament'

export type StandingsData = {
  divisions: ReturnType<typeof useDivisionCatalog>['list']
  standings: DivisionStanding[]
  podiumAdjustments: SerializedPodiumAdjustments
  isLoading: boolean
}

export function useStandingsData(): StandingsData {
  const { data: tournamentState, isLoading: stateLoading } = useTournamentStateQuery()
  const { list: divisions, isLoading: divisionsLoading } = useDivisionCatalog()

  const standings = useMemo(() => tournamentState?.standings ?? [], [tournamentState])
  const podiumAdjustments = useMemo(
    () => tournamentState?.podiumAdjustments ?? EMPTY_SERIALIZED_PODIUM_ADJUSTMENTS,
    [tournamentState]
  )

  return {
    divisions,
    standings,
    podiumAdjustments,
    isLoading: stateLoading || divisionsLoading
  }
}

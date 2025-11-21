import { useMemo } from 'react'
import type { DivisionStanding } from '@core/tournaments/standings'
import type { DivisionView } from '@core/tournaments/divisions'
import { useDivisionViewsQuery } from '@renderer/queries/divisions'
import { usePlayersListQuery } from '@renderer/queries/players'
import { useTournamentStateQuery } from '@renderer/queries/tournament'

const sortDivisions = (views: DivisionView[]): DivisionView[] => {
  return [...views].sort((a, b) => {
    const orderDiff = (a.order ?? 0) - (b.order ?? 0)
    if (orderDiff !== 0) return orderDiff
    return a.name.localeCompare(b.name)
  })
}

export type StandingsData = {
  divisionViews: DivisionView[]
  standings: DivisionStanding[]
  players: Map<string, string>
  isLoading: boolean
}

export function useStandingsData(): StandingsData {
  const { data: tournamentState, isLoading: stateLoading } = useTournamentStateQuery()
  const { data: divisionData = [], isLoading: divisionsLoading } = useDivisionViewsQuery()
  const { data: playerList = [], isLoading: playersLoading } = usePlayersListQuery()

  const divisionViews = useMemo(() => sortDivisions(divisionData), [divisionData])
  const standings = useMemo(() => tournamentState?.standings ?? [], [tournamentState])
  const players = useMemo(() => {
    const lookup = new Map<string, string>()
    playerList.forEach((player) => lookup.set(player.id, player.displayName))
    return lookup
  }, [playerList])

  return {
    divisionViews,
    standings,
    players,
    isLoading: stateLoading || divisionsLoading || playersLoading
  }
}

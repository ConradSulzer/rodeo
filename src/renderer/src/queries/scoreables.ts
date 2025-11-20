import { useQuery } from '@tanstack/react-query'
import type { Scoreable, ScoreableView } from '@core/tournaments/scoreables'
import { queryKeys } from './queryKeys'

const fetchScoreableViews = async (): Promise<ScoreableView[]> => {
  return window.api.scoreables.listViews()
}

const fetchScoreables = async (): Promise<Scoreable[]> => {
  return window.api.scoreables.list()
}

export function useScoreableViewsQuery() {
  return useQuery({
    queryKey: queryKeys.scoreables.views(),
    queryFn: fetchScoreableViews
  })
}

export function useScoreablesListQuery() {
  return useQuery({
    queryKey: queryKeys.scoreables.list(),
    queryFn: fetchScoreables
  })
}

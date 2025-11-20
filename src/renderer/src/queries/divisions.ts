import { useQuery } from '@tanstack/react-query'
import type { Division } from '@core/tournaments/divisions'
import type { DivisionView } from '@core/tournaments/divisions'
import { queryKeys } from './queryKeys'

const fetchDivisionViews = async (): Promise<DivisionView[]> => {
  return window.api.divisions.listViews()
}

const fetchDivisions = async (): Promise<Division[]> => {
  return window.api.divisions.list()
}

export function useDivisionViewsQuery() {
  return useQuery({
    queryKey: queryKeys.divisions.views(),
    queryFn: fetchDivisionViews
  })
}

export function useDivisionsListQuery() {
  return useQuery({
    queryKey: queryKeys.divisions.list(),
    queryFn: fetchDivisions
  })
}

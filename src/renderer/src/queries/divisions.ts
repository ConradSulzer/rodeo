import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Division } from '@core/tournaments/divisions'
import { queryKeys } from './queryKeys'

const fetchDivisions = async (): Promise<Division[]> => {
  return window.api.divisions.list()
}

export function useDivisionViewsQuery() {
  return useQuery({
    queryKey: queryKeys.divisions.views(),
    queryFn: fetchDivisions
  })
}

export function useDivisionsListQuery() {
  return useQuery({
    queryKey: queryKeys.divisions.list(),
    queryFn: fetchDivisions
  })
}

export function useDivisionCatalog() {
  const { data: views = [], ...rest } = useDivisionViewsQuery()

  const { list, map } = useMemo(() => {
    const sorted = [...views].sort((a, b) => {
      const orderDiff = (a.order ?? 0) - (b.order ?? 0)
      if (orderDiff !== 0) return orderDiff
      return a.name.localeCompare(b.name)
    })
    const lookup = new Map(sorted.map((division) => [division.id, division]))
    return { list: sorted, map: lookup }
  }, [views])

  return {
    list,
    map,
    ...rest
  }
}

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Metric } from '@core/tournaments/metrics'
import { queryKeys } from './queryKeys'

const fetchMetrics = async (): Promise<Metric[]> => {
  return window.api.metrics.list()
}

export function useMetricsListQuery() {
  return useQuery({
    queryKey: queryKeys.metrics.list(),
    queryFn: fetchMetrics
  })
}

export function useMetricCatalog() {
  const { data: metrics = [], ...rest } = useMetricsListQuery()

  const { list, map } = useMemo(() => {
    const sorted = [...metrics].sort((a, b) => a.label.localeCompare(b.label))
    const lookup = new Map(sorted.map((metric) => [metric.id, metric]))
    return { list: sorted, map: lookup }
  }, [metrics])

  return {
    list,
    map,
    ...rest
  }
}

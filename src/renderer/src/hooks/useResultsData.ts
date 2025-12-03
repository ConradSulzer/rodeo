import type { MetricRecord } from '@core/tournaments/metrics'
import { useMetricCatalog } from '@renderer/queries/metrics'
import { useTournamentResultsRows } from '@renderer/queries/tournament'
import type { ResultsRow } from '@core/tournaments/results'

export type ResultsTableData = {
  metrics: MetricRecord[]
  rows: ResultsRow[]
  isLoading: boolean
}

export function useResultsTableData(): ResultsTableData {
  const { list: metrics, isLoading: metricsLoading } = useMetricCatalog()
  const { rows, isLoading: resultsLoading } = useTournamentResultsRows()

  return {
    metrics,
    rows,
    isLoading: metricsLoading || resultsLoading
  }
}

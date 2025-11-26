import type { MetricRecord } from '@core/tournaments/metrics'
import { useMetricCatalog } from '@renderer/queries/metrics'
import { useTournamentResultsRows, type TournamentResultRow } from '@renderer/queries/tournament'

export type ResultRow = TournamentResultRow

export type ResultsTableData = {
  metrics: MetricRecord[]
  rows: ResultRow[]
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

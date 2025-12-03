import Papa from 'papaparse'
import type { DivisionRecord } from '@core/tournaments/divisions'
import type { MetricRecord } from '@core/tournaments/metrics'
import type { EnrichedPlayer } from '@core/players/players'
import type { ResultsRow } from '@core/tournaments/results'

export function buildResultsCsv({
  metrics,
  players,
  rows,
  divisions,
  includeUnscored
}: {
  metrics: MetricRecord[]
  players: EnrichedPlayer[]
  rows: ResultsRow[]
  divisions: DivisionRecord[]
  includeUnscored: boolean
}): string {
  const divisionOrder = [...divisions].sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER
    if (orderA !== orderB) return orderA - orderB
    return a.name.localeCompare(b.name)
  })

  const combinedRows = [...rows]

  if (includeUnscored) {
    const scoredIds = new Set(rows.map((row) => row.player.id))
    players.forEach((player) => {
      if (scoredIds.has(player.id)) return
      combinedRows.push({
        player,
        divisionIds: player.divisions.map((division) => division.id),
        scoredAt: null,
        scores: {}
      })
    })
  }

  const header = [
    'Player Name',
    'Email',
    ...metrics.map((metric) => metric.label),
    ...divisionOrder.map((division) => division.name)
  ]

  const rowsData = combinedRows.map((row) => formatRowForCsv(row, metrics, divisionOrder))

  return Papa.unparse({ fields: header, data: rowsData })
}

function formatRowForCsv(
  row: ResultsRow,
  metrics: MetricRecord[],
  divisions: DivisionRecord[]
): string[] {
  const membershipSet = new Set(row.divisionIds)
  return [
    row.player.displayName,
    row.player.email ?? '',
    ...metrics.map((metric) => {
      const result = row.scores[metric.id]
      const value = result?.value
      return Number.isFinite(value ?? NaN) ? String(value) : ''
    }),
    ...divisions.map((division) => (membershipSet.has(division.id) ? 'TRUE' : 'FALSE'))
  ]
}

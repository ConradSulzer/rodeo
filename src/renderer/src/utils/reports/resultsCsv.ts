import type { Division } from '@core/tournaments/divisions'
import type { PlayerAssignment } from '@core/players/players'
import type { MetricRecord } from '@core/tournaments/metrics'
import type { ResultRow } from '@renderer/hooks/useResultsData'
import Papa from 'papaparse'

export function buildResultsCsv({
  metrics,
  playerAssignments,
  rows,
  divisions,
  includeUnscored
}: {
  metrics: MetricRecord[]
  playerAssignments: PlayerAssignment[]
  rows: ResultRow[]
  divisions: Division[]
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
    playerAssignments.forEach(({ player, divisionIds }) => {
      if (scoredIds.has(player.id)) return
      combinedRows.push({
        player,
        displayName: player.displayName,
        email: player.email ?? '',
        divisionIds: divisionIds ?? [],
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

function formatRowForCsv(row: ResultRow, metrics: MetricRecord[], divisions: Division[]): string[] {
  const membershipSet = new Set(row.divisionIds)
  return [
    row.displayName,
    row.email,
    ...metrics.map((metric) => {
      const result = row.scores[metric.id]
      const value = result?.value
      return Number.isFinite(value ?? NaN) ? String(value) : ''
    }),
    ...divisions.map((division) => (membershipSet.has(division.id) ? 'TRUE' : 'FALSE'))
  ]
}

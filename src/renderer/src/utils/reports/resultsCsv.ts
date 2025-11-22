import type { Division } from '@core/tournaments/divisions'
import type { PlayerDivisionTuple } from '@core/players/players'
import type { Scoreable } from '@core/tournaments/scoreables'
import type { ResultRow } from '@renderer/hooks/useResultsData'
import Papa from 'papaparse'

export function buildResultsCsv({
  scoreables,
  playerTuples,
  rows,
  divisions,
  includeUnscored
}: {
  scoreables: Scoreable[]
  playerTuples: PlayerDivisionTuple[]
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
    playerTuples.forEach(([player, divisions]) => {
      if (scoredIds.has(player.id)) return
      combinedRows.push({
        player,
        displayName: player.displayName,
        email: player.email ?? '',
        divisionIds: divisions?.map((division) => division.id) ?? [],
        scores: {}
      })
    })
  }

  const header = [
    'Player Name',
    'Email',
    ...scoreables.map((scoreable) => scoreable.label),
    ...divisionOrder.map((division) => division.name)
  ]

  const rowsData = combinedRows.map((row) => formatRowForCsv(row, scoreables, divisionOrder))

  return Papa.unparse({ fields: header, data: rowsData })
}

function formatRowForCsv(row: ResultRow, scoreables: Scoreable[], divisions: Division[]): string[] {
  const membershipSet = new Set(row.divisionIds)
  return [
    row.displayName,
    row.email,
    ...scoreables.map((scoreable) => {
      const result = row.scores[scoreable.id]
      const value = result?.value
      return Number.isFinite(value ?? NaN) ? String(value) : ''
    }),
    ...divisions.map((division) => (membershipSet.has(division.id) ? 'TRUE' : 'FALSE'))
  ]
}

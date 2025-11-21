import { useState } from 'react'
import Papa from 'papaparse'
import { Button } from '@renderer/components/ui/button'
import { Modal } from '@renderer/components/Modal'
import { toast } from 'sonner'
import type { Player } from '@core/players/players'
import type { Scoreable } from '@core/tournaments/scoreables'
import type { Division } from '@core/tournaments/divisions'
import { buildCsvExportFilename } from '@core/utils/csv'
import { useResultsData, type ResultRow } from '@renderer/hooks/useResultsData'
import { useDivisionsListQuery } from '@renderer/queries/divisions'
import { usePlayersWithDivisionsQuery } from '@renderer/queries/players'

export function ResultsExportButton() {
  const [open, setOpen] = useState(false)
  const [includeUnscored, setIncludeUnscored] = useState(true)
  const [exporting, setExporting] = useState(false)
  const { scoreables, rows, isLoading } = useResultsData()
  const { data: playerTuples = [], isLoading: playersLoading } = usePlayersWithDivisionsQuery()
  const { data: divisionList = [], isLoading: divisionsLoading } = useDivisionsListQuery()
  const players = playerTuples.map(([player]) => player)
  const divisionMembership = new Map(
    playerTuples.map(([player, divisions]) => [
      player.id,
      divisions?.map((division) => division.id) ?? []
    ])
  )

  const handleExport = async () => {
    if (isLoading || divisionsLoading || playersLoading) {
      toast.error('Data still loading. Please try again.')
      return
    }
    setExporting(true)
    try {
      const metadata = await window.api.tournaments.getMetadata()
      const csv = buildResultsCsv({
        scoreables,
        players,
        rows,
        divisions: divisionList,
        includeUnscored,
        divisionMembership
      })
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = buildCsvExportFilename(metadata.name, 'results')
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success('Exported results')
      setOpen(false)
    } catch (error) {
      console.error('Failed to export results', error)
      toast.error('Unable to export results')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Export Results
      </Button>
      <Modal open={open} onClose={() => (exporting ? null : setOpen(false))} title="Export Results">
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeUnscored}
              onChange={(event) => setIncludeUnscored(event.target.checked)}
              disabled={exporting}
            />
            Include players without scores
          </label>
          <p className="text-xs ro-text-muted">
            CSV columns: player name, email, one column per scoreable, and one column per division.
            Score columns show recorded values; division columns show TRUE/FALSE for membership.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline-muted"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={exporting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="positive"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function buildResultsCsv({
  scoreables,
  players,
  rows,
  divisions,
  includeUnscored,
  divisionMembership
}: {
  scoreables: Scoreable[]
  players: Player[]
  rows: ResultRow[]
  divisions: Division[]
  includeUnscored: boolean
  divisionMembership: Map<string, string[]>
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
        displayName: player.displayName,
        email: player.email ?? '',
        divisionIds: divisionMembership.get(player.id) ?? [],
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

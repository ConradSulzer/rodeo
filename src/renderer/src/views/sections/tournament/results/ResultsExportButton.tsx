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

export function ResultsExportButton() {
  const [open, setOpen] = useState(false)
  const [includeUnscored, setIncludeUnscored] = useState(true)
  const [exporting, setExporting] = useState(false)
  const { scoreables, rows, players, isLoading } = useResultsData()
  const { data: divisionList = [], isLoading: divisionsLoading } = useDivisionsListQuery()

  const handleExport = async () => {
    if (isLoading || divisionsLoading) {
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
        divisionMembership: new Map(rows.map((row) => [row.player.id, row.divisionIds]))
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
  const scoreableOrder = scoreables
  const playerMap = new Map(players.map((player) => [player.id, player]))
  const rowMap = new Map(rows.map((row) => [row.player.id, row]))

  const playerIds = new Set<string>()
  if (includeUnscored) {
    players.forEach((player) => playerIds.add(player.id))
  }
  rows.forEach((row) => playerIds.add(row.player.id))

  const divisionOrder = [...divisions].sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER
    if (orderA !== orderB) return orderA - orderB
    return a.name.localeCompare(b.name)
  })
  const header = [
    'Player Name',
    'Email',
    ...scoreableOrder.map((scoreable) => scoreable.label),
    ...divisionOrder.map((division) => division.name)
  ]
  const rowsData = Array.from(playerIds).map((playerId) => {
    const player = playerMap.get(playerId)
    const resultRow = rowMap.get(playerId)
    const displayName = player?.displayName ?? resultRow?.displayName ?? 'Unknown Player'
    const email = player?.email ?? resultRow?.email ?? ''
    const scores = resultRow?.scores ?? {}
    const membershipIds = divisionMembership.get(playerId) ?? resultRow?.divisionIds ?? []
    const membershipSet = new Set(membershipIds)
    return [
      displayName,
      email,
      ...scoreableOrder.map((scoreable) => {
        const result = scores[scoreable.id]
        const value = result?.value
        return Number.isFinite(value ?? NaN) ? String(value) : ''
      }),
      ...divisionOrder.map((division) => {
        return membershipSet.has(division.id) ? 'TRUE' : 'FALSE'
      })
    ]
  })

  return Papa.unparse({ fields: header, data: rowsData })
}

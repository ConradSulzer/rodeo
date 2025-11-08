import { useState } from 'react'
import Papa from 'papaparse'
import { Button } from '@renderer/components/ui/button'
import { Modal } from '@renderer/components/Modal'
import { toast } from 'sonner'
import type { SerializableTournamentState } from '@core/tournaments/state'
import type { Player } from '@core/players/players'
import type { Scoreable } from '@core/tournaments/scoreables'
import type { Division } from '@core/tournaments/divisions'
import { buildCsvExportFilename } from '@core/utils/csv'

export function ResultsExportButton() {
  const [open, setOpen] = useState(false)
  const [includeUnscored, setIncludeUnscored] = useState(true)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const [scoreables, players, state, divisions, metadata] = await Promise.all([
        window.api.scoreables.list(),
        window.api.players.list(),
        window.api.tournaments.getState(),
        window.api.divisions.list(),
        window.api.tournaments.getMetadata()
      ])
      const divisionMembership = new Map<string, Set<string>>()
      await Promise.all(
        players.map(async (player) => {
          const list = await window.api.divisions.listForPlayer(player.id)
          divisionMembership.set(player.id, new Set(list))
        })
      )
      const csv = buildResultsCsv({
        scoreables,
        players,
        state,
        divisions,
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
  state,
  divisions,
  includeUnscored,
  divisionMembership
}: {
  scoreables: Scoreable[]
  players: Player[]
  state: SerializableTournamentState
  divisions: Division[]
  includeUnscored: boolean
  divisionMembership: Map<string, Set<string>>
}): string {
  const scoreableOrder = [...scoreables].sort((a, b) => a.label.localeCompare(b.label))
  const playerMap = new Map(players.map((player) => [player.id, player]))
  const resultMap = new Map(
    state.results.map((entry) => [
      entry.playerId,
      entry.items.reduce<Record<string, number>>((acc, item) => {
        acc[item.scoreableId] = item.result?.value ?? NaN
        return acc
      }, {})
    ])
  )

  const playersToExport = includeUnscored
    ? players
    : state.results
        .map((entry) => playerMap.get(entry.playerId))
        .filter((player): player is Player => Boolean(player))

  const uniquePlayers = new Map<string, Player>()
  playersToExport.forEach((player) => {
    if (player) uniquePlayers.set(player.id, player)
  })

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
  const rows = Array.from(uniquePlayers.values()).map((player) => {
    const scores = resultMap.get(player.id) ?? {}
    const memberships = divisionMembership.get(player.id) ?? new Set<string>()
    return [
      player.displayName,
      player.email ?? '',
      ...scoreableOrder.map((scoreable) => {
        const value = scores[scoreable.id]
        return Number.isFinite(value) ? String(value) : ''
      }),
      ...divisionOrder.map((division) => {
        return memberships.has(division.id) ? 'TRUE' : 'FALSE'
      })
    ]
  })

  return Papa.unparse({ fields: header, data: rows })
}

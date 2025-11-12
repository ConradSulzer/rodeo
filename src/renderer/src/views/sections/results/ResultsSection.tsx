import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Player } from '@core/players/players'
import type { Scoreable } from '@core/tournaments/scoreables'
import type { ItemResult } from '@core/tournaments/results'
import type { SerializableTournamentState } from '@core/tournaments/state'
import { ManageSectionShell } from '@renderer/components/ManageSectionShell'
import {
  renderCrudTableHeader,
  type CrudTableColumn
} from '@renderer/components/crud/CrudTableHeader'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@renderer/components/ui/table'
import { useUniversalSearchSort } from '@renderer/hooks/useUniversalSearchSort'
import { toast } from 'sonner'

type ResultRow = {
  playerId: string
  name: string
  scores: Record<string, ItemResult | undefined>
}

type ScoreColumnKey = `score-${string}`
type SortableRow = ResultRow & Partial<Record<ScoreColumnKey, number | undefined>>

export function ResultsSection() {
  const [loading, setLoading] = useState(true)
  const [scoreables, setScoreables] = useState<Scoreable[]>([])
  const [rows, setRows] = useState<ResultRow[]>([])

  const buildRows = useCallback((state: SerializableTournamentState, players: Player[]) => {
    const playerMap = new Map(players.map((player) => [player.id, player.displayName]))
    const next: ResultRow[] = state.results.map((entry) => {
      const name = playerMap.get(entry.playerId) ?? 'Unknown Player'
      const scores: Record<string, ItemResult | undefined> = {}
      for (const item of entry.items) {
        scores[item.scoreableId] = item.result
      }
      return {
        playerId: entry.playerId,
        name,
        scores
      }
    })
    setRows(next)
  }, [])

  const refreshData = useCallback(async () => {
    try {
      const [scoreableList, playerList, state] = await Promise.all([
        window.api.scoreables.list(),
        window.api.players.list(),
        window.api.tournaments.getState()
      ])
      setScoreables(scoreableList.sort((a, b) => a.label.localeCompare(b.label)))
      buildRows(state, playerList)
    } catch (error) {
      console.error('Failed to load results', error)
      toast.error('Failed to load results')
    } finally {
      setLoading(false)
    }
  }, [buildRows])

  useEffect(() => {
    refreshData()
    const unsubscribe = window.api.tournaments.subscribe((state) => {
      window.api.players.list().then((players) => buildRows(state, players))
    })
    return () => {
      unsubscribe()
    }
  }, [buildRows, refreshData])

  const columns: ReadonlyArray<CrudTableColumn<SortableRow, ScoreColumnKey>> = [
    { key: 'name', label: 'Player', sortable: true },
    ...scoreables.map((scoreable) => ({
      key: `score-${scoreable.id}` as ScoreColumnKey,
      label: scoreable.label,
      sortable: true
    }))
  ]

  const sortableRows: SortableRow[] = useMemo(() => {
    return rows.map((row) => {
      const flat: SortableRow = { ...row }
      for (const scoreable of scoreables) {
        const result = row.scores[scoreable.id]
        flat[`score-${scoreable.id}`] = result?.value
      }
      return flat
    })
  }, [rows, scoreables])

  const {
    results: filtered,
    query,
    setQuery,
    sort,
    toggleSort
  } = useUniversalSearchSort<SortableRow>({
    items: sortableRows,
    searchKeys: ['name'],
    initialSort: { key: 'name', direction: 'asc' }
  })

  return (
    <ManageSectionShell
      title="Results"
      description="View the latest recorded scores."
      searchPlaceholder="Search players"
      searchValue={query}
      onSearchChange={setQuery}
    >
      {loading ? (
        <div className="flex flex-1 items-center justify-center ro-text-muted">
          Loading results...
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <Table containerClassName="h-full overflow-auto">
              <TableHeader>
                <TableRow>
                  {renderCrudTableHeader<SortableRow, string>({
                    columns,
                    sort,
                    toggleSort
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.playerId}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{row.name}</span>
                        <span className="text-xs ro-text-muted">{row.playerId}</span>
                      </div>
                    </TableCell>
                    {scoreables.map((scoreable) => {
                      const result = row.scores[scoreable.id]
                      return (
                        <TableCell key={scoreable.id}>
                          {result ? (
                            result.status === 'empty' ? (
                              <span className="text-xs font-semibold uppercase tracking-[0.2em] ro-text-muted">
                                Empty
                              </span>
                            ) : (
                              <span className="font-mono text-sm">{result.value}</span>
                            )
                          ) : (
                            <span className="text-sm ro-text-muted">—</span>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </ManageSectionShell>
  )
}

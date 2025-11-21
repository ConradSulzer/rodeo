import { useMemo } from 'react'
import { ManageSectionShell } from '@renderer/components/ManageSectionShell'
import {
  renderCrudTableHeader,
  type CrudTableColumn
} from '@renderer/components/crud/CrudTableHeader'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@renderer/components/ui/table'
import { useUniversalSearchSort } from '@renderer/hooks/useUniversalSearchSort'
import { useResultsData } from '@renderer/hooks/useResultsData'

type ScoreColumnKey = `score-${string}`
type SortableRow = ReturnType<typeof useResultsData>['rows'][number] &
  Partial<Record<ScoreColumnKey, number | undefined>>

export function ResultsSection() {
  const { scoreables, rows, isLoading } = useResultsData()

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
      {isLoading ? (
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

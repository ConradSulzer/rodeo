import type { Division, DivisionCategory } from '@core/tournaments/divisions'
import type { PlayerStanding } from '@core/tournaments/standings'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow
} from '@renderer/components/ui/table'
import { cn } from '@renderer/lib/utils'

type StandingsTabsTableProps = {
  divisions: Division[]
  activeDivisionId: string | null
  divisionCategories: DivisionCategory[]
  activeDivisionCategory: DivisionCategory | null
  entries: PlayerStanding[]
  loading?: boolean
  onSelectDivision: (divisionId: string) => void
  onSelectCategory: (divisionId: string, categoryId: string) => void
}

export function StandingsTabsTable({
  divisions,
  activeDivisionId,
  divisionCategories,
  activeDivisionCategory,
  entries,
  loading = false,
  onSelectDivision,
  onSelectCategory
}: StandingsTabsTableProps) {
  const activeDivisionName =
    divisions.find((division) => division.id === activeDivisionId)?.name ?? null
  const showCountColumn = Boolean(activeDivisionCategory?.category.showMetricsCount)
  const countColumnLabel =
    activeDivisionCategory?.category.metricsCountName?.trim() || 'Entries Submitted'

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center ro-text-muted">
        Loading standings...
      </div>
    )
  }

  if (!divisions.length) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm ro-text-muted">
        Create a division to begin tracking standings.
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex flex-wrap gap-2">
        {divisions.map((division) => {
          const active = activeDivisionId === division.id
          return (
            <button
              key={division.id}
              type="button"
              className={cn(
                'rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition-colors',
                active
                  ? 'ro-border-main ro-bg-main/10 ro-text-main'
                  : 'ro-border ro-text-muted hover:ro-border-main hover:ro-text-main'
              )}
              onClick={() => onSelectDivision(division.id)}
            >
              {division.name}
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {divisionCategories.length ? (
          divisionCategories.map((category) => {
            const active = activeDivisionCategory?.category.id === category.category.id
            const currentDivisionId = activeDivisionId
            return (
              <button
                key={category.category.id}
                type="button"
                className={cn(
                  'rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition-colors',
                  active ? 'ro-bg-main/10 ro-text-main' : 'ro-text-muted hover:ro-text-main'
                )}
                onClick={() => {
                  if (!currentDivisionId) return
                  onSelectCategory(currentDivisionId, category.category.id)
                }}
                disabled={!currentDivisionId}
              >
                {category.category.name}
              </button>
            )
          })
        ) : (
          <span className="text-xs ro-text-muted">
            No categories assigned to {activeDivisionName ?? 'this division'}.
          </span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!activeDivisionCategory ? (
          <div className="flex flex-1 items-center justify-center text-sm ro-text-muted">
            Assign at least one category to this division to view standings.
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm ro-text-muted">
            No standings to display for {activeDivisionCategory.category.name}.
          </div>
        ) : (
          <Table containerClassName="h-full">
            <TableHeader>
              <TableRow>
                <TableHeaderCell className="w-16 text-left">Rank</TableHeaderCell>
                <TableHeaderCell>Player</TableHeaderCell>
                {showCountColumn ? (
                  <TableHeaderCell className="text-right">{countColumnLabel}</TableHeaderCell>
                ) : null}
                <TableHeaderCell className="w-32 text-right">Total</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                return (
                  <TableRow key={entry.playerId}>
                    <TableCell className="font-mono text-sm">{entry.rank}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">
                          {entry.player.displayName || entry.playerId}
                        </span>
                        <span className="text-xs ro-text-muted">{entry.playerId}</span>
                      </div>
                    </TableCell>
                    {showCountColumn ? (
                      <TableCell className="text-right font-mono text-sm">
                        {entry.itemCount}
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right font-mono text-sm">{entry.total}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

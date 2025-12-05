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
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

type StandingsTabsTableProps = {
  divisions: Division[]
  activeDivision: Division | null
  divisionCategories: DivisionCategory[]
  activeDivisionCategory: DivisionCategory | null
  entries: PlayerStanding[]
  loading?: boolean
  onSelectDivision: (divisionId: string) => void
  onSelectCategory: (divisionId: string, categoryId: string) => void
  onEntryAction?: (entry: PlayerStanding) => void
  entryActionLabel?: string
  entryActionDisabled?: boolean
}

export function StandingsTabsTable({
  divisions,
  activeDivision,
  divisionCategories,
  activeDivisionCategory,
  entries,
  loading = false,
  onSelectDivision,
  onSelectCategory,
  onEntryAction,
  entryActionLabel = 'Adjust',
  entryActionDisabled = false
}: StandingsTabsTableProps) {
  const activeDivisionName = activeDivision?.name ?? null
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
          const active = activeDivision?.id === division.id
          return (
            <Button
              key={division.id}
              type="button"
              variant={active ? 'outline' : 'outline-muted'}
              size="sm"
              className={cn(
                'uppercase tracking-[0.3em]',
                active ? 'ro-bg-main/10 ro-border-main ro-text-main' : 'ro-text-muted'
              )}
              onClick={() => onSelectDivision(division.id)}
            >
              {division.name}
            </Button>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {divisionCategories.length ? (
          divisionCategories.map((category) => {
            const active = activeDivisionCategory?.category.id === category.category.id
            const currentDivisionId = activeDivision?.id ?? null
            return (
              <Button
                key={category.category.id}
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'rounded-full uppercase tracking-[0.2em]',
                  active ? 'ro-bg-main/10 ro-text-main' : 'ro-text-muted'
                )}
                onClick={() => {
                  if (!currentDivisionId) return
                  onSelectCategory(currentDivisionId, category.category.id)
                }}
                disabled={!currentDivisionId}
              >
                {category.category.name}
              </Button>
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
              {onEntryAction ? (
                <TableHeaderCell className="w-28 text-right">Actions</TableHeaderCell>
              ) : null}
            </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const playerName = entry.player?.displayName || entry.playerId
                return (
                  <TableRow key={entry.playerId}>
                    <TableCell className="font-mono text-sm">{entry.rank}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{playerName}</span>
                        <span className="text-xs ro-text-muted">{entry.playerId}</span>
                      </div>
                    </TableCell>
                    {showCountColumn ? (
                      <TableCell className="text-right font-mono text-sm">
                        {entry.itemCount}
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right font-mono text-sm">{entry.total}</TableCell>
                    {onEntryAction ? (
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={cn(
                            'text-xs uppercase tracking-[0.2em]',
                            entryActionDisabled ? 'opacity-60' : 'hover:ro-text-main'
                          )}
                          onClick={() => onEntryAction(entry)}
                          disabled={entryActionDisabled}
                        >
                          {entryActionLabel}
                        </Button>
                      </TableCell>
                    ) : null}
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

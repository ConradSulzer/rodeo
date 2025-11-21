import { useEffect, useMemo, useState } from 'react'
import type { DivisionCategoryView } from '@core/tournaments/divisions'
import type { CategoryStanding } from '@core/tournaments/standings'
import { ManageSectionShell } from '@renderer/components/ManageSectionShell'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow
} from '@renderer/components/ui/table'
import { cn } from '@renderer/lib/utils'
import { useStandingsData } from '@renderer/hooks/useStandingsData'

const sortCategories = (categories: DivisionCategoryView[]): DivisionCategoryView[] => {
  return [...categories].sort((a, b) => {
    const orderDiff = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
    if (orderDiff !== 0) return orderDiff
    return a.category.name.localeCompare(b.category.name)
  })
}

export function StandingsSection() {
  const { divisionViews, standings, players, isLoading: loading } = useStandingsData()
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const [categorySelections, setCategorySelections] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')

  useEffect(() => {
    setSelectedDivisionId((prev) => {
      if (prev && divisionViews.some((division) => division.id === prev)) {
        return prev
      }
      return divisionViews[0]?.id ?? null
    })
  }, [divisionViews])

  useEffect(() => {
    setCategorySelections((prev) => {
      const next = { ...prev }
      let changed = false
      const divisionMap = new Map(divisionViews.map((division) => [division.id, division]))
      for (const [divisionId, categoryId] of Object.entries(prev)) {
        const division = divisionMap.get(divisionId)
        if (!division) {
          delete next[divisionId]
          changed = true
          continue
        }
        const hasCategory = division.categories.some(
          (category) => category.category.id === categoryId
        )
        if (!hasCategory) {
          delete next[divisionId]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [divisionViews])

  const handleSelectDivision = (divisionId: string) => {
    setSelectedDivisionId(divisionId)
  }

  const handleSelectCategory = (divisionId: string, categoryId: string) => {
    setCategorySelections((prev) => ({ ...prev, [divisionId]: categoryId }))
  }

  const activeDivision = useMemo(() => {
    if (!divisionViews.length) return null
    const fallback = divisionViews[0]
    if (!selectedDivisionId) return fallback
    return divisionViews.find((division) => division.id === selectedDivisionId) ?? fallback
  }, [divisionViews, selectedDivisionId])

  const divisionStanding = useMemo(() => {
    if (!activeDivision) return null
    return standings.find((standing) => standing.divisionId === activeDivision.id) ?? null
  }, [activeDivision, standings])

  const categoryTabs = useMemo(() => {
    if (!activeDivision) return []
    return sortCategories(activeDivision.categories)
  }, [activeDivision])

  const activeCategoryView = useMemo(() => {
    if (!activeDivision || !categoryTabs.length) return null
    const preset = categorySelections[activeDivision.id]
    if (preset) {
      return categoryTabs.find((category) => category.category.id === preset) ?? categoryTabs[0]
    }
    return categoryTabs[0]
  }, [activeDivision, categoryTabs, categorySelections])

  const activeCategoryStanding: CategoryStanding | null = useMemo(() => {
    if (!activeCategoryView || !divisionStanding) return null
    return (
      divisionStanding.categories.find(
        (category) => category.categoryId === activeCategoryView.category.id
      ) ?? null
    )
  }, [activeCategoryView, divisionStanding])

  const filteredEntries = useMemo(() => {
    if (!activeCategoryStanding) return []
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return activeCategoryStanding.entries
    return activeCategoryStanding.entries.filter((entry) => {
      const playerName = players.get(entry.playerId)
      const nameMatches = playerName?.toLowerCase().includes(normalizedQuery)
      const idMatches = entry.playerId.toLowerCase().includes(normalizedQuery)
      return Boolean(nameMatches || idMatches)
    })
  }, [activeCategoryStanding, players, query])

  const showCountColumn = Boolean(activeCategoryView?.category.showScoreablesCount)
  const countColumnLabel =
    activeCategoryView?.category.scoreablesCountName?.trim() || 'Entries Submitted'

  const renderTable = () => {
    if (!activeCategoryView) {
      return (
        <div className="flex flex-1 items-center justify-center text-sm ro-text-muted">
          Assign at least one category to this division to view standings.
        </div>
      )
    }
    if (!activeCategoryStanding || activeCategoryStanding.entries.length === 0) {
      return (
        <div className="flex flex-1 items-center justify-center text-sm ro-text-muted">
          No standings yet for {activeCategoryView.category.name}.
        </div>
      )
    }
    if (filteredEntries.length === 0) {
      return (
        <div className="flex flex-1 items-center justify-center text-sm ro-text-muted">
          No players match “{query}”.
        </div>
      )
    }

    return (
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
          {filteredEntries.map((entry) => {
            const playerName = players.get(entry.playerId)
            return (
              <TableRow key={entry.playerId}>
                <TableCell className="font-mono text-sm">{entry.rank}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold">{playerName ?? 'Unknown Player'}</span>
                    <span className="text-xs ro-text-muted">{entry.playerId}</span>
                  </div>
                </TableCell>
                {showCountColumn ? (
                  <TableCell className="text-right font-mono text-sm">{entry.itemCount}</TableCell>
                ) : null}
                <TableCell className="text-right font-mono text-sm">{entry.total}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }

  return (
    <ManageSectionShell
      title="Standings"
      searchPlaceholder="Search player name or ID"
      searchValue={query}
      onSearchChange={setQuery}
    >
      {loading ? (
        <div className="flex flex-1 items-center justify-center ro-text-muted">
          Loading standings...
        </div>
      ) : !divisionViews.length ? (
        <div className="flex flex-1 items-center justify-center text-sm ro-text-muted">
          Create a division to begin tracking standings.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="flex flex-wrap gap-2">
            {divisionViews.map((division) => {
              const active = activeDivision?.id === division.id
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
                  onClick={() => handleSelectDivision(division.id)}
                >
                  {division.name}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {categoryTabs.length ? (
              categoryTabs.map((category) => {
                const active = activeCategoryView?.category.id === category.category.id
                const currentDivisionId = activeDivision?.id ?? null
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
                      handleSelectCategory(currentDivisionId, category.category.id)
                    }}
                    disabled={!currentDivisionId}
                  >
                    {category.category.name}
                  </button>
                )
              })
            ) : (
              <span className="text-xs ro-text-muted">
                No categories assigned to {activeDivision?.name}.
              </span>
            )}
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{renderTable()}</div>
        </div>
      )}
    </ManageSectionShell>
  )
}

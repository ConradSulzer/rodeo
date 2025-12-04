import { useMemo, useState } from 'react'
import { universalSearchSort } from '@core/sort/universalSearchSort'
import { StandingsTabsTable } from '@renderer/components/standings/StandingsTabsTable'
import { useStandingsView } from '@renderer/components/standings/useStandingsView'
import { ManageSectionShell } from '@renderer/components/ManageSectionShell'
import { useStandingsData } from '@renderer/hooks/useStandingsData'

export function StandingsSection() {
  const { divisions, standings, isLoading } = useStandingsData()
  const [query, setQuery] = useState('')
  const {
    activeDivisionId,
    divisionCategories,
    activeDivisionCategory,
    activeCategoryStanding,
    handleSelectCategory,
    handleSelectDivision
  } = useStandingsView('standings', divisions, standings, isLoading)

  const filteredEntries = useMemo(() => {
    if (!activeCategoryStanding) return []
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) return activeCategoryStanding.entries

    const ranked = universalSearchSort({
      items: activeCategoryStanding.entries,
      query: normalizedQuery,
      searchKeys: ['player.displayName', 'player.id'],
      limit: activeCategoryStanding.entries.length
    })

    return ranked
  }, [activeCategoryStanding, query])

  return (
    <ManageSectionShell
      title="Standings"
      searchPlaceholder="Search player name or ID"
      searchValue={query}
      onSearchChange={setQuery}
    >
      <StandingsTabsTable
        divisions={divisions}
        activeDivisionId={activeDivisionId}
        divisionCategories={divisionCategories}
        activeDivisionCategory={activeDivisionCategory}
        entries={filteredEntries}
        loading={isLoading}
        onSelectDivision={(divisionId) => handleSelectDivision(divisionId)}
        onSelectCategory={(divisionId, categoryId) => handleSelectCategory(divisionId, categoryId)}
      />
    </ManageSectionShell>
  )
}

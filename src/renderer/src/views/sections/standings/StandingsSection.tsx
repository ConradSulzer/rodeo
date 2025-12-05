import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { universalSearchSort } from '@core/sort/universalSearchSort'
import { StandingsTabsTable } from '@renderer/components/standings/StandingsTabsTable'
import { useStandingsView } from '@renderer/components/standings/useStandingsView'
import { ManageSectionShell } from '@renderer/components/ManageSectionShell'
import { useStandingsData } from '@renderer/hooks/useStandingsData'
import { SearchInput } from '@renderer/components/ui/search_input'
import { Button } from '@renderer/components/ui/button'
import { FiRefreshCw } from 'react-icons/fi'
import { cn } from '@renderer/lib/utils'

export function StandingsSection() {
  const { divisions, standings, isLoading } = useStandingsData()
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const {
    activeDivision,
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

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await window.api.tournaments.refreshStandings()
      toast.success('Standings refreshed')
    } catch (error) {
      console.error('Failed to refresh standings', error)
      toast.error('Failed to refresh standings')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <ManageSectionShell
      title="Standings"
      refreshing={refreshing}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Refresh standings"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <FiRefreshCw className={cn('transition-transform', refreshing ? 'animate-spin' : '')} />
          </Button>
          <SearchInput
            placeholder="Search player name or ID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => setQuery('')}
            aria-label="Search standings"
            className="w-64"
          />
        </div>
      }
    >
      <StandingsTabsTable
        divisions={divisions}
        activeDivision={activeDivision}
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

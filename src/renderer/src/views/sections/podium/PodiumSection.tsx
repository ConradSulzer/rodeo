import { StandingsTabsTable } from '@renderer/components/standings/StandingsTabsTable'
import { useStandingsView } from '@renderer/components/standings/useStandingsView'
import { ManageSectionShell } from '@renderer/components/ManageSectionShell'
import { useStandingsData } from '@renderer/hooks/useStandingsData'

export function PodiumSection() {
  const { divisions, standings, isLoading } = useStandingsData()
  const {
    activeDivisionId,
    divisionCategories,
    activeDivisionCategory,
    activeCategoryStanding,
    handleSelectCategory,
    handleSelectDivision
  } = useStandingsView('podium', divisions, standings, isLoading)

  const entries = activeCategoryStanding?.entries ?? []

  return (
    <ManageSectionShell title="Podium">
      <StandingsTabsTable
        divisions={divisions}
        activeDivisionId={activeDivisionId}
        divisionCategories={divisionCategories}
        activeDivisionCategory={activeDivisionCategory}
        entries={entries}
        loading={isLoading}
        onSelectDivision={(divisionId) => handleSelectDivision(divisionId)}
        onSelectCategory={(divisionId, categoryId) => handleSelectCategory(divisionId, categoryId)}
      />
    </ManageSectionShell>
  )
}

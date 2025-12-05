import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { PlayerStanding } from '@core/tournaments/standings'
import {
  deserializePodiumAdjustments,
  derivePodiumStandings
} from '@core/tournaments/podiumAdjustments'
import { StandingsTabsTable } from '@renderer/components/standings/StandingsTabsTable'
import { useStandingsView } from '@renderer/components/standings/useStandingsView'
import { ManageSectionShell } from '@renderer/components/ManageSectionShell'
import { useStandingsData } from '@renderer/hooks/useStandingsData'
import { Button } from '@renderer/components/ui/button'
import { Modal } from '@renderer/components/Modal'
import { FiRefreshCw } from 'react-icons/fi'
import { cn } from '@renderer/lib/utils'

export function PodiumSection() {
  const { divisions, standings, podiumAdjustments, isLoading } = useStandingsData()
  const [isAdjustmentsOpen, setAdjustmentsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const adjustments = useMemo(
    () => deserializePodiumAdjustments(podiumAdjustments),
    [podiumAdjustments]
  )

  const derivedStandings = useMemo(
    () => derivePodiumStandings(standings, adjustments, 10),
    [standings, adjustments]
  )

  const {
    activeDivision,
    divisionCategories,
    activeDivisionCategory,
    handleSelectCategory,
    handleSelectDivision
  } = useStandingsView('podium', divisions, standings, isLoading)

  const activeDivisionId = activeDivision?.id ?? null
  const activeCategoryId = activeDivisionCategory?.category.id ?? null

  const activeDerivedStanding = useMemo(() => {
    if (!activeDivisionId || !activeCategoryId) return null
    const divisionStanding = derivedStandings.find(
      (division) => division.divisionId === activeDivisionId
    )
    if (!divisionStanding) return null
    return (
      divisionStanding.categories.find(
        (category) => category.categoryId === activeCategoryId
      ) ?? null
    )
  }, [activeCategoryId, activeDivisionId, derivedStandings])

  const entries = activeDerivedStanding?.entries ?? []

  const adjustmentsList = useMemo(() => {
    const list: Array<{
      divisionId: string
      divisionName: string
      categoryId: string
      categoryName: string
      playerId: string
      entry?: PlayerStanding
    }> = []

    adjustments.removed.forEach((categories, divisionId) => {
      const division = divisions.find((item) => item.id === divisionId)
      categories.forEach((players, categoryId) => {
        const categoryMeta = division?.categories.find(
          (category) => category.category.id === categoryId
        )
        const categoryStanding = standings
          .find((standing) => standing.divisionId === divisionId)
          ?.categories.find((category) => category.categoryId === categoryId)

        players.forEach((playerId) => {
          const entry = categoryStanding?.entries.find((item) => item.playerId === playerId)
          list.push({
            divisionId,
            categoryId,
            playerId,
            entry,
            divisionName: division?.name ?? divisionId,
            categoryName: categoryMeta?.category.name ?? categoryId
          })
        })
      })
    })

    return list.sort((a, b) => {
      const divisionDiff = a.divisionName.localeCompare(b.divisionName)
      if (divisionDiff !== 0) return divisionDiff
      const categoryDiff = a.categoryName.localeCompare(b.categoryName)
      if (categoryDiff !== 0) return categoryDiff
      return a.playerId.localeCompare(b.playerId)
    })
  }, [adjustments.removed, divisions, standings])

  const handleRemoveEntry = useCallback(
    async (entry: PlayerStanding) => {
      if (!activeDivisionId || !activeCategoryId) {
        toast.error('Select a division and category first')
        return
      }
      if (isSubmitting) return
      setIsSubmitting(true)
      try {
        await window.api.podium.recordEvent({
          type: 'podium:remove-player',
          divisionId: activeDivisionId,
          categoryId: activeCategoryId,
          playerId: entry.playerId
        })
        toast.success('Removed from podium')
      } catch (error) {
        console.error('Failed to record podium adjustment', error)
        toast.error('Failed to record podium adjustment')
      } finally {
        setIsSubmitting(false)
      }
    },
    [activeCategoryId, activeDivisionId, isSubmitting]
  )

  const handleRestore = useCallback(
    async (divisionId: string, categoryId: string, playerId: string) => {
      if (isSubmitting) return
      setIsSubmitting(true)
      try {
        await window.api.podium.recordEvent({
          type: 'podium:restore-player',
          divisionId,
          categoryId,
          playerId
        })
        toast.success('Restored to podium pool')
      } catch (error) {
        console.error('Failed to restore podium adjustment', error)
        toast.error('Failed to restore podium adjustment')
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSubmitting]
  )

  const adjustmentsCount = adjustmentsList.length

  const actions = (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={async () => {
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
        }}
        disabled={refreshing}
        aria-label="Refresh standings"
      >
        <FiRefreshCw className={cn('transition-transform', refreshing ? 'animate-spin' : '')} />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setAdjustmentsOpen(true)}
        className="tracking-[0.3em]"
      >
        Adjustments{adjustmentsCount ? ` (${adjustmentsCount})` : ''}
      </Button>
    </div>
  )

  return (
    <ManageSectionShell title="Podium" actions={actions} refreshing={refreshing}>
      <StandingsTabsTable
        divisions={divisions}
        activeDivision={activeDivision}
        divisionCategories={divisionCategories}
        activeDivisionCategory={activeDivisionCategory}
        entries={entries}
        loading={isLoading}
        entryActionLabel="Remove"
        entryActionDisabled={isSubmitting}
        onEntryAction={handleRemoveEntry}
        onSelectDivision={(divisionId) => handleSelectDivision(divisionId)}
        onSelectCategory={(divisionId, categoryId) => handleSelectCategory(divisionId, categoryId)}
      />

      <Modal
        open={isAdjustmentsOpen}
        onClose={() => setAdjustmentsOpen(false)}
        title="Podium Adjustments"
      >
        {adjustmentsList.length ? (
          <div className="flex flex-col gap-3">
            {adjustmentsList.map((item) => {
              const playerName = item.entry?.player?.displayName ?? item.playerId
              return (
                <div
                  key={`${item.divisionId}-${item.categoryId}-${item.playerId}`}
                  className="rounded-md border ro-border ro-bg-muted/40 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-mono uppercase tracking-[0.25em] ro-text-muted">
                        {item.divisionName} • {item.categoryName}
                      </span>
                      <span className="font-semibold">{playerName}</span>
                      <span className="text-xs ro-text-muted">{item.playerId}</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRestore(item.divisionId, item.categoryId, item.playerId)}
                      disabled={isSubmitting}
                    >
                      Restore
                    </Button>
                  </div>
                  {item.entry ? (
                    <div className="mt-2 text-xs ro-text-muted">
                      Original rank #{item.entry.rank} · Total {item.entry.total}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-sm ro-text-muted">
            No podium adjustments have been applied across this tournament.
          </div>
        )}
      </Modal>
    </ManageSectionShell>
  )
}

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { toastShortSuccess } from '@renderer/lib/toast'
import { FiCheck } from 'react-icons/fi'
import type { EnrichedPlayer, PlayerMetric } from '@core/players/players'
import type { ItemResult } from '@core/tournaments/results'
import type { ItemScoreEventInput } from '@core/events/events'
import { ManageSectionShell } from '@renderer/components/ManageSectionShell'
import {
  type CrudTableColumn,
  renderCrudTableHeader
} from '@renderer/components/crud/CrudTableHeader'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@renderer/components/ui/table'
import { Button } from '@renderer/components/ui/button'
import { Pill } from '@renderer/components/ui/pill'
import { useUniversalSearchSort } from '@renderer/hooks/useUniversalSearchSort'
import { ScorePlayerModal, type SubmissionResult } from './ScorePlayerModal'
import { cn } from '@renderer/lib/utils'
import { usePlayersQuery } from '@renderer/queries/players'
import { useTournamentResultsMap } from '@renderer/queries/tournament'
import { useMetricCatalog } from '@renderer/queries/metrics'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@renderer/queries/queryKeys'

type PlayerRow = EnrichedPlayer

type ScoreModalState =
  | { status: 'closed' }
  | {
      status: 'open'
      player: PlayerRow
      metrics: PlayerMetric[]
      existingResults?: Map<string, ItemResult>
    }

const columns: ReadonlyArray<CrudTableColumn<PlayerRow, 'actions' | 'divisions'>> = [
  { key: 'displayName', label: 'Player', sortable: true },
  { key: 'divisions', label: 'Divisions', sortable: false },
  { key: 'actions', label: 'Actions', sortable: false, align: 'right' }
]

const PLAYER_FUZZY_FIELDS: Array<keyof PlayerRow & string> = ['displayName', 'email', 'id']

export function ScoringSection() {
  const queryClient = useQueryClient()
  const [modalState, setModalState] = useState<ScoreModalState>({ status: 'closed' })
  const [modalSubmitting, setModalSubmitting] = useState(false)

  const {
    data: players = [],
    isLoading: playersLoading,
    isFetching: playersFetching
  } = usePlayersQuery()
  const {
    map: results,
    isLoading: resultsLoading,
    isFetching: resultsFetching
  } = useTournamentResultsMap()
  useMetricCatalog()

  const loading = playersLoading || resultsLoading
  const refreshing = (!loading && (playersFetching || resultsFetching)) || false

  const {
    results: filteredPlayers,
    query,
    setQuery,
    sort,
    toggleSort
  } = useUniversalSearchSort<PlayerRow>({
    items: players,
    searchKeys: PLAYER_FUZZY_FIELDS,
    initialSort: { key: 'displayName', direction: 'asc' }
  })

  const handleOpenModal = (player: PlayerRow, metrics: PlayerMetric[]) => {
    if (!metrics.length) return
    setModalState({
      status: 'open',
      player,
      metrics,
      existingResults: results.get(player.id)?.items
    })
  }

  const closeModal = () => {
    setModalState({ status: 'closed' })
    setModalSubmitting(false)
  }

  const reportMutationErrors = useCallback((errors: string[], fallbackMessage: string) => {
    if (errors.length) {
      errors.forEach((message) => toast.error(message))
    } else {
      toast.error(fallbackMessage)
    }
  }, [])

  const handleSaveScores = async (entries: ItemScoreEventInput[]): Promise<SubmissionResult> => {
    if (modalState.status !== 'open') {
      return { success: false, errors: ['Score modal is not open'] }
    }
    setModalSubmitting(true)
    try {
      const result = await window.api.events.record(entries)
      if (!result.success) {
        reportMutationErrors(result.errors, 'Unable to record scores')
        return result
      }
      toastShortSuccess('Scores saved')
      closeModal()
      await queryClient.invalidateQueries({ queryKey: queryKeys.tournament.state() })
      return result
    } catch (error) {
      console.error('Failed to record scores', error)
      toast.error('Unable to record scores')
      return { success: false, errors: ['Unable to record scores'] }
    } finally {
      setModalSubmitting(false)
    }
  }

  const handleVoidScorecard = async () => {
    if (modalState.status !== 'open') return
    setModalSubmitting(true)
    try {
      const payload = [
        {
          kind: 'scorecard-void' as const,
          playerId: modalState.player.id
        }
      ]
      const result = await window.api.events.record(payload)
      if (!result.success) {
        reportMutationErrors(result.errors, 'Unable to void scorecard')
        return
      }
      toastShortSuccess('Scorecard voided')
      closeModal()
      await queryClient.invalidateQueries({ queryKey: queryKeys.tournament.state() })
    } catch (error) {
      console.error('Failed to void scorecard', error)
      toast.error('Unable to void scorecard')
    } finally {
      setModalSubmitting(false)
    }
  }

  const isPlayerScored = useCallback(
    (playerId: string, metrics: PlayerMetric[]) => {
      if (!metrics.length) return false
      const playerResults = results.get(playerId)
      if (!playerResults) return false
      const items = playerResults.items
      for (const metric of metrics) {
        if (!items.has(metric.id)) {
          return false
        }
      }
      return true
    },
    [results]
  )

  const renderDivisions = (player: PlayerRow) => {
    if (!player.divisions.length) {
      return <span className="text-sm ro-text-muted">No divisions</span>
    }
    return (
      <div className="flex flex-wrap gap-2">
        {player.divisions.map((division) => (
          <Pill key={division.id} size="sm">
            {division.name}
          </Pill>
        ))}
      </div>
    )
  }

  const modalOpen = modalState.status === 'open'
  const modalPlayer = modalOpen ? modalState.player : undefined
  const modalMetrics = modalOpen ? modalState.metrics : []
  const modalResults = modalOpen ? modalState.existingResults : undefined

  return (
    <>
      <ManageSectionShell
        title="Scoring"
        titleAdornment={
          <Pill>
            {results.size.toLocaleString()} / {players.length.toLocaleString()}
          </Pill>
        }
        description="Enter or update scores for each angler."
        searchPlaceholder="Search players"
        searchValue={query}
        onSearchChange={setQuery}
        refreshing={refreshing}
      >
        {loading ? (
          <div className="flex flex-1 items-center justify-center ro-text-muted">
            Loading players...
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1">
              <Table containerClassName="h-full">
                <TableHeader>
                  <TableRow>
                    {renderCrudTableHeader<PlayerRow, 'actions' | 'divisions'>({
                      columns,
                      sort,
                      toggleSort
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.map((player) => {
                    const metrics = player.metrics
                    const hasRequirements = metrics.length > 0
                    const scored = isPlayerScored(player.id, metrics)
                    const hasScorecard = results.has(player.id)
                    const partial = hasScorecard && !scored
                    return (
                      <TableRow key={player.id} className="ro-row-hover">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{player.displayName}</span>
                            <span className="text-xs ro-text-muted">{player.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>{renderDivisions(player)}</TableCell>
                        <TableCell align="right">
                          <Button
                            type="button"
                            size="sm"
                            variant={scored ? 'default' : 'outline'}
                            className={cn(
                              'min-w-[120px]',
                              scored ? 'ro-bg-success ro-text-success-dark border-transparent' : '',
                              partial ? 'ro-bg-warn ro-text-warn-dark border-transparent' : ''
                            )}
                            disabled={!hasRequirements}
                            onClick={() => handleOpenModal(player, metrics)}
                          >
                            {scored ? (
                              <span className="flex items-center gap-2">
                                <FiCheck />
                                Scored
                              </span>
                            ) : partial ? (
                              'Partial'
                            ) : (
                              'Score'
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </ManageSectionShell>

      <ScorePlayerModal
        open={modalOpen}
        player={modalPlayer}
        metrics={modalMetrics}
        existingResults={modalResults}
        submitting={modalSubmitting}
        onSubmit={handleSaveScores}
        onVoidScorecard={modalOpen ? handleVoidScorecard : undefined}
        onClose={closeModal}
      />
    </>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { FiCheck } from 'react-icons/fi'
import type { EnrichedPlayer, PlayerMetric } from '@core/players/players'
import type { SerializableTournamentState } from '@core/tournaments/state'
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

type PlayerRow = EnrichedPlayer

type PlayerResultsMap = Map<string, Map<string, ItemResult>>

type ScoreModalState =
  | { open: false }
  | {
      open: true
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
  const [loading, setLoading] = useState(true)
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [results, setResults] = useState<PlayerResultsMap>(new Map())
  const [modalState, setModalState] = useState<ScoreModalState>({ open: false })
  const [modalSubmitting, setModalSubmitting] = useState(false)

  const fetchPlayers = useCallback(async () => {
    const list = await window.api.players.list()
    setPlayers(list)
  }, [])

  const fetchResults = useCallback(async () => {
    const state = await window.api.tournaments.getState()
    setResults(buildResultsMap(state))
  }, [])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        await Promise.all([fetchPlayers(), fetchResults()])
      } catch (error) {
        console.error('Failed to load scoring data', error)
        toast.error('Failed to load scoring data')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [fetchPlayers, fetchResults])

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
      open: true,
      player,
      metrics,
      existingResults: results.get(player.id)
    })
  }

  const closeModal = () => {
    setModalState({ open: false })
    setModalSubmitting(false)
  }

  const handleSaveScores = async (entries: ItemScoreEventInput[]): Promise<SubmissionResult> => {
    if (!modalState.open) {
      return { success: false, errors: ['Score modal is not open'] }
    }
    setModalSubmitting(true)
    try {
      const result = await window.api.events.record(entries)
      if (!result.success) {
        if (result.errors.length) {
          result.errors.forEach((message) => toast.error(message))
        } else {
          toast.error('Unable to record scores')
        }
        return result
      }
      toast.success('Scores saved')
      closeModal()
      await fetchResults()
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
    if (!modalState.open) return
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
        if (result.errors.length) {
          result.errors.forEach((message) => toast.error(message))
        } else {
          toast.error('Unable to void scorecard')
        }
        setModalSubmitting(false)
        return
      }
      toast.success('Scorecard voided')
      closeModal()
      await fetchResults()
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
      for (const metric of metrics) {
        if (!playerResults.has(metric.id)) {
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

  return (
    <>
      <ManageSectionShell
        title="Scoring"
        description="Enter or update scores for each angler."
        searchPlaceholder="Search players"
        searchValue={query}
        onSearchChange={setQuery}
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
                              scored ? 'ro-bg-success ro-text-success-dark border-transparent' : ''
                            )}
                            disabled={!hasRequirements}
                            onClick={() => handleOpenModal(player, metrics)}
                          >
                            {scored ? (
                              <span className="flex items-center gap-2">
                                <FiCheck />
                                Scored
                              </span>
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
        open={modalState.open}
        player={modalState.open ? modalState.player : undefined}
        metrics={modalState.open ? modalState.metrics : []}
        existingResults={modalState.open ? modalState.existingResults : undefined}
        submitting={modalSubmitting}
        onSubmit={handleSaveScores}
        onVoidScorecard={modalState.open ? handleVoidScorecard : undefined}
        onClose={closeModal}
      />
    </>
  )
}

function buildResultsMap(state: SerializableTournamentState): PlayerResultsMap {
  const map: PlayerResultsMap = new Map()
  for (const entry of state.results) {
    map.set(entry.playerId, new Map(entry.items.map(({ metricId, result }) => [metricId, result])))
  }
  return map
}

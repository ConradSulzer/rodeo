import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FiCheck } from 'react-icons/fi'
import type { Player } from '@core/players/players'
import type { Division, DivisionView } from '@core/tournaments/divisions'
import type { Scoreable } from '@core/tournaments/scoreables'
import type { SerializableTournamentState } from '@core/tournaments/state'
import type { ItemResult } from '@core/tournaments/results'
import { ManageSectionShell } from '@renderer/components/ManageSectionShell'
import {
  type CrudTableColumn,
  renderCrudTableHeader
} from '@renderer/components/crud/CrudTableHeader'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@renderer/components/ui/table'
import { Button } from '@renderer/components/ui/button'
import { Pill } from '@renderer/components/ui/pill'
import { useUniversalSearchSort } from '@renderer/hooks/useUniversalSearchSort'
import { ScorePlayerModal, type ScoreEntry } from './ScorePlayerModal'
import { cn } from '@renderer/lib/utils'

type PlayerRow = Player & {
  divisions: Division[]
}

type PlayerResultsMap = Map<string, Map<string, ItemResult>>

type ScoreModalState =
  | { open: false }
  | {
      open: true
      player: PlayerRow
      scoreables: Scoreable[]
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
  const [divisionViews, setDivisionViews] = useState<DivisionView[]>([])
  const [results, setResults] = useState<PlayerResultsMap>(new Map())
  const [modalState, setModalState] = useState<ScoreModalState>({ open: false })
  const [modalSubmitting, setModalSubmitting] = useState(false)

  const fetchPlayers = useCallback(async () => {
    const tuples = await window.api.players.listWithDivisions()
    setPlayers(tuples.map(([player, divisions]) => ({ ...player, divisions })))
  }, [])

  const fetchDivisionViews = useCallback(async () => {
    const views = await window.api.divisions.listViews()
    setDivisionViews(views)
  }, [])

  const fetchResults = useCallback(async () => {
    const state = await window.api.tournaments.getState()
    setResults(buildResultsMap(state))
  }, [])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        await Promise.all([fetchPlayers(), fetchDivisionViews(), fetchResults()])
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
  }, [fetchPlayers, fetchDivisionViews, fetchResults])

  const divisionMap = useMemo(() => {
    return new Map(divisionViews.map((view) => [view.id, view]))
  }, [divisionViews])

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

  const buildScoreables = useCallback(
    (player: PlayerRow): Scoreable[] => {
      const scoreableMap = new Map<string, Scoreable>()

      for (const division of player.divisions) {
        const view = divisionMap.get(division.id)
        if (!view) continue

        for (const categoryView of view.categories) {
          for (const scoreable of categoryView.scoreables) {
            if (!scoreableMap.has(scoreable.id)) {
              scoreableMap.set(scoreable.id, scoreable)
            }
          }
        }
      }

      return Array.from(scoreableMap.values()).sort((a, b) => a.label.localeCompare(b.label))
    },
    [divisionMap]
  )

  const handleOpenModal = (player: PlayerRow, scoreables: Scoreable[]) => {
    if (!scoreables.length) return
    setModalState({
      open: true,
      player,
      scoreables,
      existingResults: results.get(player.id)
    })
  }

  const closeModal = () => {
    setModalState({ open: false })
    setModalSubmitting(false)
  }

  const handleSaveScores = async (entries: ScoreEntry[]) => {
    if (!modalState.open) return
    setModalSubmitting(true)
    try {
      const payload = entries.map((entry) => ({
        playerId: modalState.player.id,
        scoreableId: entry.scoreableId,
        scoreableName: entry.scoreableName,
        value: entry.value,
        priorEventId: entry.priorEventId,
        void: entry.void
      }))
      const result = await window.api.events.record(payload)
      if (!result.success) {
        if (result.errors.length) {
          result.errors.forEach((message) => toast.error(message))
        } else {
          toast.error('Unable to record scores')
        }
        return
      }
      toast.success('Scores saved')
      closeModal()
      await fetchResults()
    } catch (error) {
      console.error('Failed to record scores', error)
      toast.error('Unable to record scores')
      setModalSubmitting(false)
    }
  }

  const isPlayerScored = useCallback(
    (playerId: string, scoreables: Scoreable[]) => {
      if (!scoreables.length) return false
      const playerResults = results.get(playerId)
      if (!playerResults) return false
      for (const scoreable of scoreables) {
        if (!playerResults.has(scoreable.id)) {
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
                    const scoreables = buildScoreables(player)
                    const hasRequirements = scoreables.length > 0
                    const scored = isPlayerScored(player.id, scoreables)
                    return (
                      <TableRow key={player.id}>
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
                            onClick={() => handleOpenModal(player, scoreables)}
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
        scoreables={modalState.open ? modalState.scoreables : []}
        existingResults={modalState.open ? modalState.existingResults : undefined}
        submitting={modalSubmitting}
        onSubmit={handleSaveScores}
        onClose={closeModal}
      />
    </>
  )
}

function buildResultsMap(state: SerializableTournamentState): PlayerResultsMap {
  const map: PlayerResultsMap = new Map()
  for (const entry of state.results) {
    map.set(
      entry.playerId,
      new Map(entry.items.map(({ scoreableId, result }) => [scoreableId, result]))
    )
  }
  return map
}

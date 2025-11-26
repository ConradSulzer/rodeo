import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { toastShortSuccess } from '@renderer/lib/toast'
import { FiEdit2, FiTrash2, FiEye } from 'react-icons/fi'
import type { EnrichedPlayer, PatchPlayer, NewPlayer } from '@core/players/players'
import { Button } from '@renderer/components/ui/button'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@renderer/components/ui/table'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import { PlayerDetailsModal } from './PlayerDetailsModal'
import { PlayerFormModal, type PlayerFormValues } from './PlayerFormModal'
import { useUniversalSearchSort } from '@renderer/hooks/useUniversalSearchSort'
import { CrudTableActions } from '@renderer/components/crud/CrudTableActions'
import { CrudTableColumn, renderCrudTableHeader } from '@renderer/components/crud/CrudTableHeader'
import { ManageSectionShell } from '@renderer/components/ManageSectionShell'
import { Pill } from '@renderer/components/ui/pill'
import { usePlayersQuery } from '@renderer/queries/players'
import { useDivisionsQuery } from '@renderer/queries/divisions'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@renderer/queries/queryKeys'

type PlayerRow = EnrichedPlayer

type FormState =
  | { open: false; mode: null; player?: undefined }
  | { open: true; mode: 'create'; player?: undefined }
  | { open: true; mode: 'edit'; player: PlayerRow }

type DeleteState = {
  open: boolean
  player?: PlayerRow
  deleting: boolean
}

type DetailsState = {
  open: boolean
  player?: PlayerRow
}

const columns: ReadonlyArray<CrudTableColumn<PlayerRow, 'actions'>> = [
  { key: 'displayName', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'divisions', label: 'Divisions', sortable: false },
  { key: 'actions', label: 'Actions', sortable: false, align: 'right' }
]

const FUZZY_FIELDS: Array<keyof PlayerRow & string> = [
  'displayName',
  'email',
  'firstName',
  'lastName',
  'id'
]

function buildPatch(values: PlayerFormValues, current: EnrichedPlayer): PatchPlayer | null {
  const patch: PatchPlayer = {}

  if (values.firstName !== current.firstName) patch.firstName = values.firstName
  if (values.lastName !== current.lastName) patch.lastName = values.lastName
  if (values.displayName !== current.displayName) patch.displayName = values.displayName
  if (values.email !== current.email) patch.email = values.email
  const nextCellPhone = values.cellPhone ? values.cellPhone : null
  const currentCellPhone = current.cellPhone ?? null
  if (nextCellPhone !== currentCellPhone) patch.cellPhone = nextCellPhone

  const nextEmergency = values.emergencyContact ? values.emergencyContact : null
  const currentEmergency = current.emergencyContact ?? null
  if (nextEmergency !== currentEmergency) patch.emergencyContact = nextEmergency

  return Object.keys(patch).length ? patch : null
}

export function PlayersSection() {
  const queryClient = useQueryClient()
  const [formState, setFormState] = useState<FormState>({ open: false, mode: null })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [deleteState, setDeleteState] = useState<DeleteState>({
    open: false,
    player: undefined,
    deleting: false
  })
  const [detailsState, setDetailsState] = useState<DetailsState>({
    open: false,
    player: undefined
  })

  const { data: players = [], isLoading, isFetching } = usePlayersQuery()
  const { data: divisionOptions = [] } = useDivisionsQuery()

  const invalidatePlayers = useCallback(() => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.players.list()
    })
  }, [queryClient])

  const {
    results: filteredPlayers,
    query,
    setQuery,
    sort,
    toggleSort
  } = useUniversalSearchSort<PlayerRow>({
    items: players,
    searchKeys: FUZZY_FIELDS,
    initialSort: {
      key: 'displayName',
      direction: 'asc'
    }
  })

  const openCreateModal = () => {
    setFormState({ open: true, mode: 'create' })
  }

  const openEditModal = (player: PlayerRow) => {
    setFormState({ open: true, mode: 'edit', player })
  }

  const closeFormModal = () => {
    if (formSubmitting) return
    setFormState({ open: false, mode: null })
  }

  const handleFormSubmit = async (values: PlayerFormValues & { divisionIds: string[] }) => {
    if (!formState.open) return

    setFormSubmitting(true)
    let shouldRefresh = false
    try {
      if (formState.mode === 'create') {
        const payload: NewPlayer = {
          firstName: values.firstName,
          lastName: values.lastName,
          displayName: values.displayName,
          email: values.email,
          cellPhone: values.cellPhone || undefined,
          emergencyContact: values.emergencyContact || undefined
        }

        const playerId = await window.api.players.create(payload)
        await Promise.all(
          values.divisionIds.map((divisionId) =>
            window.api.divisions.addPlayer(divisionId, playerId)
          )
        )
        toastShortSuccess('Player added')
        shouldRefresh = true
      } else if (formState.mode === 'edit') {
        const player = formState.player
        if (!player) return

        const patch = buildPatch(values, player)
        const currentDivisionIds = new Set(player.divisions.map((division) => division.id))
        const nextDivisionIds = new Set(values.divisionIds)

        const toAdd = values.divisionIds.filter((id) => !currentDivisionIds.has(id))
        const toRemove = Array.from(currentDivisionIds).filter((id) => !nextDivisionIds.has(id))

        if (!patch && toAdd.length === 0 && toRemove.length === 0) {
          toast.info('No changes to save')
          setFormState({ open: false, mode: null })
          return
        }

        if (patch) {
          const success = await window.api.players.update(player.id, patch)
          if (!success) {
            throw new Error('Update returned false')
          }
        }

        if (toAdd.length || toRemove.length) {
          await Promise.all([
            ...toAdd.map((divisionId) => window.api.divisions.addPlayer(divisionId, player.id)),
            ...toRemove.map((divisionId) =>
              window.api.divisions.removePlayer(divisionId, player.id)
            )
          ])
        }

        toastShortSuccess('Player updated')
        shouldRefresh = true
      }

      if (shouldRefresh) {
        await invalidatePlayers()
      }

      setFormState({ open: false, mode: null })
    } catch (error) {
      console.error('Failed to submit player form', error)
      toast.error('Unable to save player')
    } finally {
      setFormSubmitting(false)
    }
  }

  const requestDeletePlayer = (player: PlayerRow) => {
    // TODO:  Should not be able to delete a scored player, must void first then delete.
    // TODO: Should not be able to edit a player's divisions if they have already been scored.
    setDeleteState({ open: true, player, deleting: false })
  }

  const cancelDelete = () => {
    if (deleteState.deleting) return
    setDeleteState({ open: false, player: undefined, deleting: false })
  }

  const openDetails = (player: PlayerRow) => {
    setDetailsState({ open: true, player })
  }

  const closeDetails = () => {
    setDetailsState({ open: false, player: undefined })
  }

  const confirmDelete = async () => {
    if (!deleteState.open || !deleteState.player) return
    setDeleteState((prev) => ({ ...prev, deleting: true }))

    try {
      const success = await window.api.players.delete(deleteState.player.id)
      if (!success) {
        throw new Error('Delete returned false')
      }

      toastShortSuccess(`Deleted ${deleteState.player.displayName}`)
      setDeleteState({ open: false, player: undefined, deleting: false })
      await invalidatePlayers()
    } catch (error) {
      console.error('Failed to delete player', error)
      toast.error('Could not delete player')
      setDeleteState((prev) => ({ ...prev, deleting: false }))
    }
  }

  const refreshing = isFetching && !isLoading
  const isEmpty = !isLoading && filteredPlayers.length === 0
  const playerCount = players.length
  const playerCountLabel = isLoading ? '—' : playerCount.toLocaleString()

  return (
    <>
      <ManageSectionShell
        title="Players"
        titleAdornment={<Pill>{playerCountLabel}</Pill>}
        description="Manage the roster, eligibility, and division assignments for the event."
        searchPlaceholder="Search name, email, or division"
        searchValue={query}
        onSearchChange={setQuery}
        onAdd={openCreateModal}
        addLabel="Add Player"
        refreshing={refreshing}
      >
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center ro-text-muted">
            Loading players...
          </div>
        ) : isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center ro-text-muted">
            <p className="text-sm">No players yet. Start building the roster.</p>
            <Button type="button" variant="outline" size="sm" onClick={openCreateModal}>
              Add your first player
            </Button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 min-h-0">
              <Table containerClassName="h-full">
                <TableHeader>
                  <TableRow>
                    {renderCrudTableHeader<PlayerRow, 'actions'>({
                      columns,
                      sort,
                      toggleSort
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell>{player.displayName}</TableCell>
                      <TableCell>{player.email}</TableCell>
                      <TableCell>
                        {player.divisions.length ? (
                          <div className="flex flex-wrap gap-2">
                            {player.divisions.map((division) => (
                              <Pill variant="solid" key={division.id}>
                                {division.name}
                              </Pill>
                            ))}
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <CrudTableActions
                          actions={[
                            {
                              label: `View ${player.displayName}`,
                              icon: <FiEye />,
                              onClick: () => openDetails(player)
                            },
                            {
                              label: `Edit ${player.displayName}`,
                              icon: <FiEdit2 />,
                              onClick: () => openEditModal(player)
                            },
                            {
                              label: `Delete ${player.displayName}`,
                              icon: <FiTrash2 />,
                              onClick: () => requestDeletePlayer(player),
                              tone: 'danger'
                            }
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </ManageSectionShell>
      <PlayerFormModal
        open={formState.open}
        mode={formState.open ? formState.mode : 'create'}
        player={formState.open && formState.mode === 'edit' ? formState.player : undefined}
        submitting={formSubmitting}
        onSubmit={handleFormSubmit}
        divisions={divisionOptions}
        onClose={closeFormModal}
      />
      <ConfirmDialog
        open={deleteState.open}
        title="Delete Player"
        confirming={deleteState.deleting}
        confirmLabel="Delete Player"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        description={
          deleteState.player ? (
            <p>
              This will permanently remove <strong>{deleteState.player.displayName}</strong> and all
              of their division assignments. This action cannot be undone.
            </p>
          ) : (
            'Are you sure you want to delete this player?'
          )
        }
      />
      <PlayerDetailsModal
        open={detailsState.open}
        player={detailsState.player}
        onClose={closeDetails}
      />
    </>
  )
}

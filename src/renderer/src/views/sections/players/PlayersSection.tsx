import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { FiEdit2, FiTrash2, FiEye } from 'react-icons/fi'
import type { Player, PatchPlayer, NewPlayer } from '@core/players/players'
import { Button } from '@renderer/components/ui/button'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@renderer/components/ui/table'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import { PlayerDetailsModal } from './PlayerDetailsModal'
import { PlayerFormModal, type PlayerFormValues } from './PlayerFormModal'
import { useUniversalSearchSort } from '@renderer/hooks/useUniversalSearchSort'
import { CrudTableActions } from '@renderer/components/crud/CrudTableActions'
import { CrudTableColumn, renderCrudTableHeader } from '@renderer/components/crud/CrudTableHeader'
import { ManageSectionShell } from '@renderer/components/ManageSectionShell'

type FormState =
  | { open: false; mode: null; player?: undefined }
  | { open: true; mode: 'create'; player?: undefined }
  | { open: true; mode: 'edit'; player: Player }

type DeleteState = {
  open: boolean
  player?: Player
  deleting: boolean
}

type DetailsState = {
  open: boolean
  player?: Player
}

const columns: ReadonlyArray<CrudTableColumn<Player, 'actions'>> = [
  { key: 'displayName', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false, align: 'right' }
]

const FUZZY_FIELDS: Array<keyof Player & string> = [
  'displayName',
  'email',
  'cellPhone',
  'firstName',
  'lastName',
  'id'
]

function buildPatch(values: PlayerFormValues, current: Player): PatchPlayer | null {
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
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
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

  const fetchPlayers = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      const list = await window.api.players.list()
      setPlayers(list)
    } catch (error) {
      console.error('Failed to load players', error)
      toast.error('Failed to load players')
    } finally {
      if (silent) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  const {
    results: filteredPlayers,
    query,
    setQuery,
    sort,
    toggleSort
  } = useUniversalSearchSort<Player>({
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

  const openEditModal = (player: Player) => {
    setFormState({ open: true, mode: 'edit', player })
  }

  const closeFormModal = () => {
    if (formSubmitting) return
    setFormState({ open: false, mode: null })
  }

  const handleFormSubmit = async (values: PlayerFormValues) => {
    if (!formState.open) return

    setFormSubmitting(true)
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

        await window.api.players.create(payload)
        toast.success('Player added')
      } else if (formState.mode === 'edit') {
        const player = formState.player
        if (!player) return

        const patch = buildPatch(values, player)
        if (!patch) {
          toast.info('No changes to save')
          setFormState({ open: false, mode: null })
          return
        }

        const success = await window.api.players.update(player.id, patch)
        if (!success) {
          throw new Error('Update returned false')
        }
        toast.success('Player updated')
      }

      await fetchPlayers(true)
      setFormState({ open: false, mode: null })
    } catch (error) {
      console.error('Failed to submit player form', error)
      toast.error('Unable to save player')
    } finally {
      setFormSubmitting(false)
    }
  }

  const requestDeletePlayer = (player: Player) => {
    setDeleteState({ open: true, player, deleting: false })
  }

  const cancelDelete = () => {
    if (deleteState.deleting) return
    setDeleteState({ open: false, player: undefined, deleting: false })
  }

  const openDetails = (player: Player) => {
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

      toast.success(`Deleted ${deleteState.player.displayName}`)
      setDeleteState({ open: false, player: undefined, deleting: false })
      await fetchPlayers(true)
    } catch (error) {
      console.error('Failed to delete player', error)
      toast.error('Could not delete player')
      setDeleteState((prev) => ({ ...prev, deleting: false }))
    }
  }

  const isEmpty = !loading && filteredPlayers.length === 0

  return (
    <>
      <ManageSectionShell
        title="Players"
        description="Manage the roster, eligibility, and division assignments for the event."
        searchPlaceholder="Search by name or email"
        searchValue={query}
        onSearchChange={setQuery}
        onAdd={openCreateModal}
        addLabel="Add Player"
        refreshing={refreshing}
      >
        {loading ? (
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
                    {renderCrudTableHeader<Player, 'actions'>({
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

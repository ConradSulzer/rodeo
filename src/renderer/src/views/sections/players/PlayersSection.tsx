import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { FiEdit2, FiTrash2, FiEye } from 'react-icons/fi'
import type { Player, PatchPlayer, NewPlayer } from '@core/players/players'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow
} from '@renderer/components/ui/table'
import { PlayerFormModal, type PlayerFormValues } from './PlayerFormModal'
import { Button } from '@renderer/components/ui/button'
import { PlayerDetailsModal } from './PlayerDetailsModal'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'

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

function buildPatch(values: PlayerFormValues, current: Player): PatchPlayer | null {
  const patch: PatchPlayer = {}

  if (values.firstName !== current.firstName) patch.firstName = values.firstName
  if (values.lastName !== current.lastName) patch.lastName = values.lastName
  if (values.displayName !== current.displayName) patch.displayName = values.displayName
  if (values.email !== current.email) patch.email = values.email
  if (values.cellPhone !== current.cellPhone) patch.cellPhone = values.cellPhone
  if (values.emergencyContact !== current.emergencyContact)
    patch.emergencyContact = values.emergencyContact

  return Object.keys(patch).length ? patch : null
}

function formatOptional(value?: string | null) {
  return value?.trim() ? value : '—'
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
          cellPhone: values.cellPhone,
          emergencyContact: values.emergencyContact
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

  const isEmpty = !loading && players.length === 0

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-mono text-[16px] font-semibold uppercase tracking-[2px]">Players</h2>
          <p className="mt-2 text-sm ro-text-dim max-w-2xl">
            Manage the roster, eligibility, and division assignments for the event.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {refreshing ? (
            <span className="text-xs uppercase tracking-[0.3em] ro-text-muted">Refreshing...</span>
          ) : null}
          <Button type="button" variant="positive" size="sm" onClick={openCreateModal}>
            Add Player
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Cell Phone</TableHeaderCell>
                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell>{player.displayName}</TableCell>
                      <TableCell>{player.email}</TableCell>
                      <TableCell>{formatOptional(player.cellPhone)}</TableCell>
                      <TableCell align="right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openDetails(player)}
                            aria-label={`View ${player.displayName}`}
                          >
                            <FiEye />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEditModal(player)}
                            aria-label={`Edit ${player.displayName}`}
                          >
                            <FiEdit2 />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-300"
                            onClick={() => requestDeletePlayer(player)}
                            aria-label={`Delete ${player.displayName}`}
                          >
                            <FiTrash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
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
    </section>
  )
}

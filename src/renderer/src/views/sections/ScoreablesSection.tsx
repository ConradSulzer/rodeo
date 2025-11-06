import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { FiArrowDown, FiArrowUp, FiEdit2, FiEye, FiTrash2 } from 'react-icons/fi'
import type { ScoreableFormData } from '@core/scoreables/scoreableFormSchema'
import type { NewScoreable, PatchScoreable, ScoreableView } from '@core/tournaments/scoreables'
import { ManageSectionShell } from '@renderer/components/ManageSectionShell'
import { CrudTableActions } from '@renderer/components/crud/CrudTableActions'
import {
  type CrudTableColumn,
  renderCrudTableHeader
} from '@renderer/components/crud/CrudTableHeader'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@renderer/components/ui/table'
import { Button } from '@renderer/components/ui/button'
import { ScoreableFormModal } from './scoreables/ScoreableFormModal'
import { ScoreableDetailsModal } from './scoreables/ScoreableDetailsModal'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'

type FormState =
  | { open: false; mode: null; scoreable?: undefined }
  | { open: true; mode: 'create'; scoreable?: undefined }
  | { open: true; mode: 'edit'; scoreable: ScoreableView }

type DetailsState = {
  open: boolean
  scoreable?: ScoreableView
}

type DeleteState = {
  open: boolean
  scoreable?: ScoreableView
  deleting: boolean
}

const columns: ReadonlyArray<CrudTableColumn<ScoreableView, 'actions' | 'divisions'>> = [
  { key: 'order', label: '#', sortable: false },
  { key: 'label', label: 'Scoreable', sortable: false },
  { key: 'divisions', label: 'Divisions', sortable: false },
  { key: 'actions', label: 'Actions', sortable: false, align: 'right' }
]

export function ScoreablesSection() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [scoreables, setScoreables] = useState<ScoreableView[]>([])
  const [formState, setFormState] = useState<FormState>({ open: false, mode: null })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [detailsState, setDetailsState] = useState<DetailsState>({ open: false })
  const [deleteState, setDeleteState] = useState<DeleteState>({
    open: false,
    deleting: false
  })
  const [reorderingId, setReorderingId] = useState<string | null>(null)

  const fetchScoreables = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      const views = await window.api.scoreables.listViews()
      setScoreables(views)
    } catch (error) {
      console.error('Failed to load scoreables', error)
      toast.error('Failed to load scoreables')
    } finally {
      if (silent) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchScoreables()
  }, [fetchScoreables])

  const openCreateModal = () => {
    setFormState({ open: true, mode: 'create' })
  }

  const openEditModal = (scoreable: ScoreableView) => {
    setFormState({ open: true, mode: 'edit', scoreable })
  }

  const closeFormModal = () => {
    if (formSubmitting) return
    setFormState({ open: false, mode: null })
  }

  const openDetails = (scoreable: ScoreableView) => {
    setDetailsState({ open: true, scoreable })
  }

  const closeDetails = () => setDetailsState({ open: false })

  const requestDelete = (scoreable: ScoreableView) => {
    setDeleteState({ open: true, scoreable, deleting: false })
  }

  const cancelDelete = () => {
    if (deleteState.deleting) return
    setDeleteState({ open: false, scoreable: undefined, deleting: false })
  }

  const handleFormSubmit = async (values: ScoreableFormData) => {
    if (!formState.open) return

    setFormSubmitting(true)
    try {
      if (formState.mode === 'create') {
        const payload: NewScoreable = {
          label: values.label,
          unit: values.unit
        }
        await window.api.scoreables.create(payload)
        toast.success('Scoreable added')
      } else if (formState.mode === 'edit' && formState.scoreable) {
        const scoreable = formState.scoreable
        const patch: PatchScoreable = {}
        if (values.label !== scoreable.label) patch.label = values.label
        if (values.unit !== scoreable.unit) patch.unit = values.unit

        if (!Object.keys(patch).length) {
          toast.info('No changes to save')
          closeFormModal()
          return
        }

        const success = await window.api.scoreables.update(scoreable.id, patch)
        if (!success) {
          throw new Error('Update returned false')
        }
        toast.success('Scoreable updated')
      }

      await fetchScoreables(true)
      setFormState({ open: false, mode: null })
    } catch (error) {
      console.error('Failed to submit scoreable form', error)
      toast.error('Unable to save scoreable')
    } finally {
      setFormSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteState.open || !deleteState.scoreable) return
    setDeleteState((prev) => ({ ...prev, deleting: true }))

    try {
      const success = await window.api.scoreables.delete(deleteState.scoreable.id)
      if (!success) {
        throw new Error('Delete returned false')
      }
      toast.success(`Deleted ${deleteState.scoreable.label}`)
      setDeleteState({ open: false, scoreable: undefined, deleting: false })
      await fetchScoreables(true)
    } catch (error) {
      console.error('Failed to delete scoreable', error)
      toast.error('Could not delete scoreable')
      setDeleteState((prev) => ({ ...prev, deleting: false }))
    }
  }

  const handleMove = async (scoreable: ScoreableView, direction: 'up' | 'down') => {
    setReorderingId(scoreable.id)
    try {
      const success = await window.api.scoreables.move(scoreable.id, direction)
      if (!success) {
        toast.error('Unable to reorder scoreable')
      } else {
        await fetchScoreables(true)
      }
    } catch (error) {
      console.error('Failed to reorder scoreable', error)
      toast.error('Unable to reorder scoreable')
    } finally {
      setReorderingId(null)
    }
  }

  const isEmpty = !loading && scoreables.length === 0

  return (
    <>
      <ManageSectionShell
        title="Scoreables"
        description="Manage scoreable metrics available for scoring."
        onAdd={openCreateModal}
        addLabel="Add Scoreable"
        refreshing={refreshing}
      >
        {loading ? (
          <div className="flex flex-1 items-center justify-center ro-text-muted">
            Loading scoreables...
          </div>
        ) : isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center ro-text-muted">
            <p className="text-sm">No scoreables yet. Start by adding one.</p>
            <Button type="button" variant="outline" size="sm" onClick={openCreateModal}>
              Add your first scoreable
            </Button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 min-h-0">
              <Table containerClassName="h-full">
                <TableHeader>
                  <TableRow>
                    {renderCrudTableHeader<ScoreableView, 'actions' | 'divisions'>({
                      columns,
                      sort: { key: 'order', direction: 'asc' },
                      toggleSort: () => {}
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scoreables.map((scoreable, index) => {
                    const isFirst = index === 0
                    const isLast = index === scoreables.length - 1
                    return (
                      <TableRow key={scoreable.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="w-6 text-sm">{scoreable.order}</span>
                            <div className="flex flex-col gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleMove(scoreable, 'up')}
                                disabled={isFirst || reorderingId === scoreable.id}
                                aria-label={`Move ${scoreable.label} up`}
                              >
                                <FiArrowUp />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleMove(scoreable, 'down')}
                                disabled={isLast || reorderingId === scoreable.id}
                                aria-label={`Move ${scoreable.label} down`}
                              >
                                <FiArrowDown />
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{scoreable.label}</TableCell>
                        <TableCell>
                          {scoreable.divisions.length ? scoreable.divisions.join(', ') : '—'}
                        </TableCell>
                        <TableCell align="right">
                          <CrudTableActions
                            actions={[
                              {
                                label: `View ${scoreable.label}`,
                                icon: <FiEye />,
                                onClick: () => openDetails(scoreable)
                              },
                              {
                                label: `Edit ${scoreable.label}`,
                                icon: <FiEdit2 />,
                                onClick: () => openEditModal(scoreable)
                              },
                              {
                                label: `Delete ${scoreable.label}`,
                                icon: <FiTrash2 />,
                                onClick: () => requestDelete(scoreable),
                                tone: 'danger'
                              }
                            ]}
                          />
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

      <ScoreableFormModal
        open={formState.open}
        mode={formState.open ? formState.mode : 'create'}
        scoreable={formState.open && formState.mode === 'edit' ? formState.scoreable : undefined}
        submitting={formSubmitting}
        onSubmit={handleFormSubmit}
        onClose={closeFormModal}
      />

      <ScoreableDetailsModal
        open={detailsState.open}
        scoreable={detailsState.scoreable}
        onClose={closeDetails}
      />

      <ConfirmDialog
        open={deleteState.open}
        title="Delete Scoreable"
        confirming={deleteState.deleting}
        confirmLabel="Delete Scoreable"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        description={
          deleteState.scoreable ? (
            <p>
              This will permanently remove <strong>{deleteState.scoreable.label}</strong> from the
              tournament. This action cannot be undone.
            </p>
          ) : (
            'Are you sure you want to delete this scoreable?'
          )
        }
      />
    </>
  )
}

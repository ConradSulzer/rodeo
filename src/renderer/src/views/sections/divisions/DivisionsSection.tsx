import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FiEdit2, FiEye, FiTrash2 } from 'react-icons/fi'
import type { Division, NewDivision, PatchDivision } from '@core/tournaments/divisions'
import { ManageSectionShell } from '@renderer/components/ManageSectionShell'
import {
  type CrudTableColumn,
  renderCrudTableHeader
} from '@renderer/components/crud/CrudTableHeader'
import { CrudTableActions } from '@renderer/components/crud/CrudTableActions'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@renderer/components/ui/table'
import { Button } from '@renderer/components/ui/button'
import { DragDropTable, DragHandle } from '@renderer/components/dnd/DragDropTable'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import { DraggablePillList } from '@renderer/components/dnd/DraggablePillList'
import { DivisionFormModal, type DivisionFormValues } from './DivisionFormModal'
import { DivisionDetailsModal } from './DivisionDetailsModal'
import { Pill } from '@renderer/components/ui/pill'
import { useCategoriesQuery } from '@renderer/queries/categories'
import { useDivisionsQuery } from '@renderer/queries/divisions'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@renderer/queries/queryKeys'

type FormState =
  | { status: 'closed' }
  | { status: 'creating' }
  | { status: 'editing'; division: Division }

type DetailsState =
  | { status: 'closed' }
  | { status: 'open'; division: Division }

type DeleteState =
  | { status: 'closed'; deleting: false }
  | { status: 'confirming'; division: Division; deleting: boolean }

const columns: ReadonlyArray<CrudTableColumn<Division, 'actions' | 'categories'>> = [
  { key: 'order', label: '#', sortable: false },
  { key: 'name', label: 'Division', sortable: false },
  { key: 'categories', label: 'Categories', sortable: false },
  { key: 'actions', label: 'Actions', sortable: false, align: 'right' }
]

const sortPlaceholder = { key: 'order' as keyof Division & string, direction: 'asc' as const }

export function DivisionsSection() {
  const queryClient = useQueryClient()
  const { data: categories = [] } = useCategoriesQuery()
  const [formState, setFormState] = useState<FormState>({ status: 'closed' })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [detailsState, setDetailsState] = useState<DetailsState>({ status: 'closed' })
  const [deleteState, setDeleteState] = useState<DeleteState>({ status: 'closed', deleting: false })

  const { data: divisionData = [], isLoading, isFetching } = useDivisionsQuery()
  const invalidateDivisions = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.divisions.list() }),
    [queryClient]
  )

  const runDivisionMutation = useCallback(
    async (action: () => Promise<unknown>, successMessage: string, errorMessage: string) => {
      try {
        const result = await action()
        if (result === false) throw new Error('Mutation returned false')
        toast.success(successMessage)
        await invalidateDivisions()
        return true
      } catch (error) {
        console.error(errorMessage, error)
        toast.error(errorMessage)
        return false
      }
    },
    [invalidateDivisions]
  )

  const openCreateModal = () => setFormState({ status: 'creating' })
  const openEditModal = (division: Division) => setFormState({ status: 'editing', division })

  const closeFormModal = () => {
    if (formSubmitting) return
    setFormState({ status: 'closed' })
  }

  const openDetails = (division: Division) => setDetailsState({ status: 'open', division })
  const closeDetails = () => setDetailsState({ status: 'closed' })

  const requestDelete = (division: Division) =>
    setDeleteState({ status: 'confirming', deleting: false, division })
  const cancelDelete = () => {
    if (deleteState.status === 'confirming' && deleteState.deleting) return
    setDeleteState({ status: 'closed', deleting: false })
  }

  const handleFormSubmit = async (values: DivisionFormValues) => {
    if (formState.status === 'closed') return
    setFormSubmitting(true)
    try {
      if (formState.status === 'creating') {
        const success = await runDivisionMutation(
          async () => {
            const payload: NewDivision = { name: values.name }
            const divisionId: string = await window.api.divisions.create(payload)
            if (values.categoryIds.length) {
              await Promise.all(
                values.categoryIds.map((categoryId, index) =>
                  window.api.divisions.addCategory(divisionId, categoryId, 1, index + 1)
                )
              )
            }
            return true
          },
          'Division added',
          'Unable to add division'
        )
        if (!success) {
          return
        }
      } else if (formState.status === 'editing') {
        const division = formState.division
        const patch: PatchDivision = {}
        if (values.name !== division.name) patch.name = values.name

        const prevIds = division.categories.map((entry) => entry.category.id)
        const prevSet = new Set(prevIds)
        const nextSet = new Set(values.categoryIds)
        const toAdd = values.categoryIds.filter((id) => !prevSet.has(id))
        const toRemove = prevIds.filter((id) => !nextSet.has(id))
        const desiredOrder = new Map(values.categoryIds.map((id, index) => [id, index + 1]))
        const orderChanges = division.categories.filter((entry) => {
          const desired = desiredOrder.get(entry.category.id)
          return desired !== undefined && desired !== entry.order
        })

        if (!Object.keys(patch).length && !toAdd.length && !toRemove.length && !orderChanges.length) {
          toast.info('No changes to save')
          setFormState({ status: 'closed' })
          return
        }

        const success = await runDivisionMutation(
          async () => {
            if (Object.keys(patch).length) {
              const updated = await window.api.divisions.update(division.id, patch)
              if (!updated) throw new Error('Update returned false')
            }

            if (toAdd.length || toRemove.length || orderChanges.length) {
              await Promise.all([
                ...toAdd.map((id) =>
                  window.api.divisions.addCategory(
                    division.id,
                    id,
                    1,
                    desiredOrder.get(id) ?? values.categoryIds.indexOf(id) + 1
                  )
                ),
                ...toRemove.map((id) => window.api.divisions.removeCategory(division.id, id)),
                ...orderChanges.map((entry) =>
                  window.api.divisions.updateCategoryLink(division.id, entry.category.id, {
                    order: desiredOrder.get(entry.category.id)
                  })
                )
              ])
            }
            return true
          },
          'Division updated',
          'Unable to update division'
        )

        if (!success) {
          return
        }
      }

      setFormState({ status: 'closed' })
    } catch (error) {
      console.error('Failed to submit division form', error)
      toast.error('Unable to save division')
    } finally {
      setFormSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (deleteState.status !== 'confirming') return
    setDeleteState({ ...deleteState, deleting: true })
    const success = await runDivisionMutation(
      () => window.api.divisions.delete(deleteState.division.id),
      `Deleted ${deleteState.division.name}`,
      'Could not delete division'
    )
    if (success) {
      setDeleteState({ status: 'closed', deleting: false })
    } else {
      setDeleteState((prev) =>
        prev.status === 'confirming' ? { ...prev, deleting: false } : prev
      )
    }
  }
  const handleReorder = async (ordered: Division[]) => {
    try {
      const success = await window.api.divisions.reorder(ordered.map((item) => item.id))
      if (!success) {
        toast.error('Unable to reorder divisions')
      } else {
        await invalidateDivisions()
      }
    } catch (error) {
      console.error('Failed to reorder divisions', error)
      toast.error('Unable to reorder divisions')
      await invalidateDivisions()
    }
  }

  const handleCategoryPillReorder = async (divisionId: string, orderedCategoryIds: string[]) => {
    try {
      await Promise.all(
        orderedCategoryIds.map((categoryId, index) =>
          window.api.divisions.updateCategoryLink(divisionId, categoryId, { order: index + 1 })
        )
      )
      await invalidateDivisions()
    } catch (error) {
      console.error('Failed to reorder division categories', error)
      toast.error('Unable to reorder categories')
      await invalidateDivisions()
    }
  }

  const refreshing = isFetching && !isLoading
  const isEmpty = !isLoading && divisionData.length === 0
  const divisionCount = divisionData.length
  const divisionCountLabel = isLoading ? '—' : divisionCount.toLocaleString()

  const editModalDivision = useMemo(() => {
    if (formState.status !== 'editing') return undefined
    return {
      ...formState.division,
      categoryIds: formState.division.categories.map((entry) => entry.category.id)
    }
  }, [formState])

  return (
    <>
      <ManageSectionShell
        title="Divisions"
        titleAdornment={<Pill>{divisionCountLabel}</Pill>}
        description="Group categories into divisions to manage scoring."
        onAdd={openCreateModal}
        addLabel="Add Division"
        refreshing={refreshing}
      >
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center ro-text-muted">
            Loading divisions...
          </div>
        ) : isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center ro-text-muted">
            <p className="text-sm">No divisions yet. Start by adding one.</p>
            <Button type="button" variant="outline" size="sm" onClick={openCreateModal}>
              Add your first division
            </Button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1">
              <Table containerClassName="h-full">
                <TableHeader>
                  <TableRow>
                    {renderCrudTableHeader<Division, 'actions' | 'categories'>({
                      columns,
                      sort: sortPlaceholder,
                      toggleSort: () => {}
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <DragDropTable items={divisionData} onReorder={handleReorder}>
                    {(division, { listeners, setActivatorNodeRef }) => (
                      <>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <DragHandle
                              listeners={listeners}
                              setActivatorNodeRef={setActivatorNodeRef}
                              label={`Reorder ${division.name}`}
                            />
                            <span className="text-sm">{division.order}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{division.name}</span>
                        </TableCell>
                        <TableCell>
                          {division.categories.length ? (
                            <DraggablePillList
                              items={division.categories.map((entry) => ({
                                id: entry.category.id,
                                label: entry.category.name,
                                ariaLabel: `Reorder ${entry.category.name}`
                              }))}
                              onReorder={(ordered) =>
                                handleCategoryPillReorder(division.id, ordered)
                              }
                            />
                          ) : (
                            <span className="text-sm ro-text-muted">No categories</span>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <CrudTableActions
                            actions={[
                              {
                                label: `View ${division.name}`,
                                icon: <FiEye />,
                                onClick: () => openDetails(division)
                              },
                              {
                                label: `Edit ${division.name}`,
                                icon: <FiEdit2 />,
                                onClick: () => openEditModal(division)
                              },
                              {
                                label: `Delete ${division.name}`,
                                icon: <FiTrash2 />,
                                onClick: () => requestDelete(division),
                                tone: 'danger'
                              }
                            ]}
                          />
                        </TableCell>
                      </>
                    )}
                  </DragDropTable>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </ManageSectionShell>

      <DivisionFormModal
        open={formState.status !== 'closed'}
        mode={formState.status === 'creating' ? 'create' : 'edit'}
        division={editModalDivision}
        categories={categories}
        submitting={formSubmitting}
        onSubmit={handleFormSubmit}
        onClose={closeFormModal}
      />

      <DivisionDetailsModal
        open={detailsState.status === 'open'}
        division={detailsState.status === 'open' ? detailsState.division : undefined}
        onClose={closeDetails}
      />

      <ConfirmDialog
        open={deleteState.status === 'confirming'}
        title="Delete Division"
        confirming={deleteState.status === 'confirming' ? deleteState.deleting : false}
        confirmLabel="Delete Division"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        description={
          deleteState.status === 'confirming' ? (
            <p>
              This will permanently remove <strong>{deleteState.division.name}</strong> and unlink it
              from players and categories. This action cannot be undone.
            </p>
          ) : (
            'Are you sure you want to delete this division?'
          )
        }
      />
    </>
  )
}

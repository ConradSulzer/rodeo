import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FiEdit2, FiEye, FiTrash2 } from 'react-icons/fi'
import type { DivisionCategory, Division, NewDivision, PatchDivision } from '@core/tournaments/divisions'
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
import { useDivisionViewsQuery } from '@renderer/queries/divisions'
import { useDataStore } from '@renderer/store/useDataStore'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@renderer/queries/queryKeys'

type FormState =
  | { open: false; mode: null; division?: undefined }
  | { open: true; mode: 'create'; division?: undefined }
  | { open: true; mode: 'edit'; division: Division }

type DetailsState = {
  open: boolean
  division?: Division
}

type DeleteState = {
  open: boolean
  division?: Division
  deleting: boolean
}

const columns: ReadonlyArray<CrudTableColumn<Division, 'actions' | 'categories'>> = [
  { key: 'order', label: '#', sortable: false },
  { key: 'name', label: 'Division', sortable: false },
  { key: 'categories', label: 'Categories', sortable: false },
  { key: 'actions', label: 'Actions', sortable: false, align: 'right' }
]

const sortPlaceholder = { key: 'order' as keyof Division & string, direction: 'asc' as const }

export function DivisionsSection() {
  const queryClient = useQueryClient()
  const [divisions, setDivisions] = useState<Division[]>([])

  const [formState, setFormState] = useState<FormState>({ open: false, mode: null })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [detailsState, setDetailsState] = useState<DetailsState>({ open: false })
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false, deleting: false })

  const { data: divisionData = [], isLoading, isFetching } = useDivisionViewsQuery()
  const categories = useDataStore((state) => state.categories)

  useEffect(() => {
    setDivisions(divisionData)
  }, [divisionData])

  const invalidateDivisions = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.divisions.views() })

  const openCreateModal = () => setFormState({ open: true, mode: 'create' })
  const openEditModal = (division: Division) =>
    setFormState({ open: true, mode: 'edit', division })

  const closeFormModal = () => {
    if (formSubmitting) return
    setFormState({ open: false, mode: null })
  }

  const openDetails = (division: Division) => setDetailsState({ open: true, division })
  const closeDetails = () => setDetailsState({ open: false })

  const requestDelete = (division: Division) =>
    setDeleteState({ open: true, deleting: false, division })
  const cancelDelete = () => {
    if (deleteState.deleting) return
    setDeleteState({ open: false, deleting: false, division: undefined })
  }

  const handleFormSubmit = async (values: DivisionFormValues) => {
    if (!formState.open) return
    setFormSubmitting(true)
    try {
      if (formState.mode === 'create') {
        const payload: NewDivision = { name: values.name }
        const divisionId: string = await window.api.divisions.create(payload)
        if (values.categoryIds.length) {
          await Promise.all(
            values.categoryIds.map((categoryId, index) =>
              window.api.divisions.addCategory(divisionId, categoryId, 1, index + 1)
            )
          )
        }
        toast.success('Division added')
      } else if (formState.mode === 'edit' && formState.division) {
        const division = formState.division
        const patch: PatchDivision = {}
        if (values.name !== division.name) patch.name = values.name
        let changed = false

        if (Object.keys(patch).length) {
          const success = await window.api.divisions.update(division.id, patch)
          if (!success) throw new Error('Update returned false')
          changed = true
        }

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
          changed = true
        }

        if (!changed) {
          toast.info('No changes to save')
          setFormState({ open: false, mode: null })
          return
        }

        toast.success('Division updated')
      }

      await invalidateDivisions()
      setFormState({ open: false, mode: null })
    } catch (error) {
      console.error('Failed to submit division form', error)
      toast.error('Unable to save division')
    } finally {
      setFormSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteState.division) return
    setDeleteState((prev) => ({ ...prev, deleting: true }))
    try {
      const success = await window.api.divisions.delete(deleteState.division.id)
      if (!success) throw new Error('Delete returned false')
      toast.success(`Deleted ${deleteState.division.name}`)
      setDeleteState({ open: false, deleting: false, division: undefined })
      await invalidateDivisions()
    } catch (error) {
      console.error('Failed to delete division', error)
      toast.error('Could not delete division')
      setDeleteState((prev) => ({ ...prev, deleting: false }))
    }
  }

  const handleReorder = async (ordered: Division[]) => {
    setDivisions(ordered)
    try {
      const success = await window.api.divisions.reorder(ordered.map((item) => item.id))
      if (!success) {
        toast.error('Unable to reorder divisions')
        setDivisions(divisionData)
      } else {
        await invalidateDivisions()
      }
    } catch (error) {
      console.error('Failed to reorder divisions', error)
      toast.error('Unable to reorder divisions')
      setDivisions(divisionData)
    }
  }

  const handleCategoryPillReorder = async (divisionId: string, orderedCategoryIds: string[]) => {
    setDivisions((prev) =>
      prev.map((division) => {
        if (division.id !== divisionId) return division
        const dictionary = new Map(division.categories.map((entry) => [entry.category.id, entry]))
        const reordered: DivisionCategory[] = orderedCategoryIds
          .map((categoryId, index) => {
            const entry = dictionary.get(categoryId)
            if (!entry) return null
            return {
              ...entry,
              order: index + 1
            }
          })
          .filter((entry): entry is DivisionCategory => entry !== null)
        return {
          ...division,
          categories: reordered.length ? reordered : division.categories
        }
      })
    )

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
      invalidateDivisions()
    }
  }

  const refreshing = isFetching && !isLoading
  const isEmpty = !isLoading && divisionData.length === 0
  const divisionCount = divisionData.length
  const divisionCountLabel = isLoading ? '—' : divisionCount.toLocaleString()

  const editModalDivision = useMemo(() => {
    if (!formState.open || formState.mode !== 'edit' || !formState.division) return undefined
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
                  <DragDropTable items={divisions} onReorder={handleReorder}>
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
        open={formState.open}
        mode={formState.open ? (formState.mode ?? 'create') : 'create'}
        division={editModalDivision}
        categories={categories}
        submitting={formSubmitting}
        onSubmit={handleFormSubmit}
        onClose={closeFormModal}
      />

      <DivisionDetailsModal
        open={detailsState.open}
        division={detailsState.division}
        onClose={closeDetails}
      />

      <ConfirmDialog
        open={deleteState.open}
        title="Delete Division"
        confirming={deleteState.deleting}
        confirmLabel="Delete Division"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        description={
          deleteState.division ? (
            <p>
              This will permanently remove <strong>{deleteState.division.name}</strong> and unlink
              it from players and categories. This action cannot be undone.
            </p>
          ) : (
            'Are you sure you want to delete this division?'
          )
        }
      />
    </>
  )
}

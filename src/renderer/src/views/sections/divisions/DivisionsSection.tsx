import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { toastShortSuccess } from '@renderer/lib/toast'
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
import { DragHandle } from '@renderer/components/dnd/DragDropTable'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import { DraggablePillList } from '@renderer/components/dnd/DraggablePillList'
import {
  DivisionFormModal,
  type DivisionCategorySelection,
  type DivisionFormValues
} from './DivisionFormModal'
import { DivisionDetailsModal } from './DivisionDetailsModal'
import { Pill } from '@renderer/components/ui/pill'
import { useCategoriesQuery } from '@renderer/queries/categories'
import { useDivisionsQuery } from '@renderer/queries/divisions'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@renderer/queries/queryKeys'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type FormState =
  | { status: 'closed' }
  | { status: 'creating' }
  | { status: 'editing'; division: Division }

type DetailsState = { status: 'closed' } | { status: 'open'; division: Division }

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
        toastShortSuccess(successMessage)
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
            if (values.categories.length) {
              await Promise.all(
                values.categories.map((entry, index) =>
                  window.api.divisions.addCategory(
                    divisionId,
                    entry.categoryId,
                    entry.depth,
                    index + 1
                  )
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

        const prevMap = new Map(
          division.categories.map((entry) => [
            entry.category.id,
            { order: entry.order, depth: entry.depth }
          ])
        )
        const desiredOrder = new Map(
          values.categories.map((entry, index) => [entry.categoryId, index + 1])
        )
        const desiredDepth = new Map(
          values.categories.map((entry) => [entry.categoryId, entry.depth])
        )

        const toAdd: DivisionCategorySelection[] = []
        const toRemove: string[] = []
        const linkPatches: Array<{ id: string; patch: { order?: number; depth?: number } }> = []

        for (const [categoryId, prev] of prevMap) {
          const order = desiredOrder.get(categoryId)
          const depth = desiredDepth.get(categoryId)
          if (order === undefined || depth === undefined) {
            toRemove.push(categoryId)
            continue
          }
          const patch: { order?: number; depth?: number } = {}
          if (order !== prev.order) patch.order = order
          if (depth !== prev.depth) patch.depth = depth
          if (Object.keys(patch).length) {
            linkPatches.push({ id: categoryId, patch })
          }
        }

        for (const entry of values.categories) {
          if (!prevMap.has(entry.categoryId)) {
            toAdd.push(entry)
          }
        }

        if (
          !Object.keys(patch).length &&
          !toAdd.length &&
          !toRemove.length &&
          !linkPatches.length
        ) {
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

            if (toAdd.length || toRemove.length || linkPatches.length) {
              await Promise.all([
                ...toAdd.map((entry, index) =>
                  window.api.divisions.addCategory(
                    division.id,
                    entry.categoryId,
                    entry.depth,
                    desiredOrder.get(entry.categoryId) ?? index + 1
                  )
                ),
                ...toRemove.map((id) => window.api.divisions.removeCategory(division.id, id)),
                ...linkPatches.map((entry) =>
                  window.api.divisions.updateCategoryLink(division.id, entry.id, entry.patch)
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
      setDeleteState((prev) => (prev.status === 'confirming' ? { ...prev, deleting: false } : prev))
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
    await runDivisionMutation(
      async () => {
        const results = await Promise.all(
          orderedCategoryIds.map((categoryId, index) =>
            window.api.divisions.updateCategoryLink(divisionId, categoryId, { order: index + 1 })
          )
        )
        if (results.some((res) => res === false)) {
          throw new Error('At least one category reorder failed')
        }
        return true
      },
      'Categories reordered',
      'Unable to reorder categories'
    )
  }

  const refreshing = isFetching && !isLoading
  const isEmpty = !isLoading && divisionData.length === 0
  const divisionCount = divisionData.length
  const divisionCountLabel = isLoading ? '—' : divisionCount.toLocaleString()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDivisionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = divisionData.findIndex((item) => item.id === active.id)
    const newIndex = divisionData.findIndex((item) => item.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(divisionData, oldIndex, newIndex)
    handleReorder(reordered)
  }

  const editModalDivision = useMemo(() => {
    if (formState.status !== 'editing') return undefined
    return formState.division
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
              <DndContext sensors={sensors} onDragEnd={handleDivisionDragEnd} autoScroll={false}>
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
                    <SortableContext
                      items={divisionData.map((item) => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {divisionData.map((division) => (
                        <SortableDivisionRow key={division.id} division={division}>
                          {(listeners, setActivatorNodeRef) => (
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
                        </SortableDivisionRow>
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
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

type SortableDivisionRowProps = {
  division: Division
  children: (
    listeners: ReturnType<typeof useSortable>['listeners'],
    setActivatorNodeRef: ReturnType<typeof useSortable>['setActivatorNodeRef']
  ) => React.ReactNode
}

function SortableDivisionRow({ division, children }: SortableDivisionRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id: division.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <TableRow ref={setNodeRef} style={style} className="transition-opacity" {...attributes}>
      {children(listeners, setActivatorNodeRef)}
    </TableRow>
  )
}

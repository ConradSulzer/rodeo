import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FiEdit2, FiEye, FiTrash2 } from 'react-icons/fi'
import type { CategoryView, NewCategory, PatchCategory } from '@core/tournaments/categories'
import type { Scoreable } from '@core/tournaments/scoreables'
import type { StandingRuleSummary } from '@core/tournaments/standingRules'
import { ManageSectionShell } from '@renderer/components/ManageSectionShell'
import {
  type CrudTableColumn,
  renderCrudTableHeader
} from '@renderer/components/crud/CrudTableHeader'
import { CrudTableActions } from '@renderer/components/crud/CrudTableActions'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@renderer/components/ui/table'
import { Button } from '@renderer/components/ui/button'
import { Pill } from '@renderer/components/ui/pill'
import { DragDropTable, DragHandle } from '@renderer/components/dnd/DragDropTable'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import { CategoryFormModal, type CategoryFormValues } from './CategoryFormModal'
import { CategoryDetailsModal } from './CategoryDetailsModal'

type FormState =
  | { open: false; mode: null; category?: undefined }
  | { open: true; mode: 'create'; category?: undefined }
  | { open: true; mode: 'edit'; category: CategoryView }

type DetailsState = {
  open: boolean
  category?: CategoryView
}

type DeleteState = {
  open: boolean
  category?: CategoryView
  deleting: boolean
}

const columns: ReadonlyArray<CrudTableColumn<CategoryView, 'actions'>> = [
  { key: 'order', label: '#', sortable: false },
  { key: 'name', label: 'Category', sortable: false },
  { key: 'scoreables', label: 'Scoreables', sortable: false },
  { key: 'actions', label: 'Actions', sortable: false, align: 'right' }
]

const sortPlaceholder = { key: 'order' as keyof CategoryView & string, direction: 'asc' as const }

export function CategoriesSection() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [categories, setCategories] = useState<CategoryView[]>([])
  const [scoreables, setScoreables] = useState<Scoreable[]>([])
  const [standingRules, setStandingRules] = useState<StandingRuleSummary[]>([])

  const [formState, setFormState] = useState<FormState>({ open: false, mode: null })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [detailsState, setDetailsState] = useState<DetailsState>({ open: false })
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false, deleting: false })

  const fetchCategories = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      const views = await window.api.categories.listViews()
      setCategories(views)
    } catch (error) {
      console.error('Failed to load categories', error)
      toast.error('Failed to load categories')
    } finally {
      if (silent) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }, [])

  const fetchScoreables = useCallback(async () => {
    try {
      const list = await window.api.scoreables.list()
      const sorted = [...list].sort((a, b) => {
        if (a.order !== b.order) {
          return (a.order ?? 0) - (b.order ?? 0)
        }
        return a.label.localeCompare(b.label)
      })
      setScoreables(sorted)
    } catch (error) {
      console.error('Failed to load scoreables for categories form', error)
      toast.error('Failed to load scoreables')
    }
  }, [])

  const fetchStandingRules = useCallback(async () => {
    try {
      const rules = await window.api.categories.listRules()
      setStandingRules(rules)
    } catch (error) {
      console.error('Failed to load standing rules', error)
      toast.error('Failed to load standing rules')
    }
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchScoreables()
    fetchStandingRules()
  }, [fetchCategories, fetchScoreables, fetchStandingRules])

  const openCreateModal = () => setFormState({ open: true, mode: 'create' })

  const openEditModal = (category: CategoryView) =>
    setFormState({ open: true, mode: 'edit', category })

  const closeFormModal = () => {
    if (formSubmitting) return
    setFormState({ open: false, mode: null })
  }

  const openDetails = (category: CategoryView) => setDetailsState({ open: true, category })
  const closeDetails = () => setDetailsState({ open: false })

  const requestDelete = (category: CategoryView) =>
    setDeleteState({ open: true, deleting: false, category })

  const cancelDelete = () => {
    if (deleteState.deleting) return
    setDeleteState({ open: false, deleting: false, category: undefined })
  }

  const handleFormSubmit = async (values: CategoryFormValues) => {
    if (!formState.open) return
    setFormSubmitting(true)
    try {
      if (formState.mode === 'create') {
        const payload: NewCategory = {
          name: values.name,
          direction: values.direction,
          rules: values.rules
        }
        const categoryId: string = await window.api.categories.create(payload)
        if (values.scoreableIds.length) {
          await Promise.all(
            values.scoreableIds.map((scoreableId) =>
              window.api.categories.addScoreable(categoryId, scoreableId)
            )
          )
        }
        toast.success('Category added')
      } else if (formState.mode === 'edit' && formState.category) {
        const category = formState.category
        const patch: PatchCategory = {}
        if (values.name !== category.name) patch.name = values.name
        if (values.direction !== category.direction) patch.direction = values.direction
        if (!areStringArraysEqual(values.rules, category.rules)) {
          patch.rules = values.rules
        }

        let changed = false

        if (Object.keys(patch).length) {
          const success = await window.api.categories.update(category.id, patch)
          if (!success) throw new Error('Update returned false')
          changed = true
        }

        const prevIds = new Set(category.scoreables.map((scoreable) => scoreable.id))
        const nextIds = new Set(values.scoreableIds)

        const toAdd = [...nextIds].filter((id) => !prevIds.has(id))
        const toRemove = [...prevIds].filter((id) => !nextIds.has(id))

        if (toAdd.length || toRemove.length) {
          await Promise.all([
            ...toAdd.map((id) => window.api.categories.addScoreable(category.id, id)),
            ...toRemove.map((id) => window.api.categories.removeScoreable(category.id, id))
          ])
          changed = true
        }

        if (!changed) {
          toast.info('No changes to save')
          setFormState({ open: false, mode: null })
          return
        }

        toast.success('Category updated')
      }

      await fetchCategories(true)
      setFormState({ open: false, mode: null })
    } catch (error) {
      console.error('Failed to submit category form', error)
      toast.error('Unable to save category')
    } finally {
      setFormSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteState.category) return
    setDeleteState((prev) => ({ ...prev, deleting: true }))
    try {
      const success = await window.api.categories.delete(deleteState.category.id)
      if (!success) {
        throw new Error('Delete returned false')
      }
      toast.success(`Deleted ${deleteState.category.name}`)
      setDeleteState({ open: false, deleting: false, category: undefined })
      await fetchCategories(true)
    } catch (error) {
      console.error('Failed to delete category', error)
      toast.error('Could not delete category')
      setDeleteState((prev) => ({ ...prev, deleting: false }))
    }
  }

  const handleReorder = async (ordered: CategoryView[]) => {
    setCategories(ordered)
    try {
      const success = await window.api.categories.reorder(ordered.map((item) => item.id))
      if (!success) {
        toast.error('Unable to reorder categories')
      } else {
        await fetchCategories(true)
      }
    } catch (error) {
      console.error('Failed to reorder categories', error)
      toast.error('Unable to reorder categories')
    }
  }

  const isEmpty = !loading && categories.length === 0

  const editModalCategory = useMemo(() => {
    if (!formState.open || formState.mode !== 'edit' || !formState.category) return undefined
    return {
      ...formState.category,
      scoreableIds: formState.category.scoreables.map((scoreable) => scoreable.id)
    }
  }, [formState])

  return (
    <>
      <ManageSectionShell
        title="Categories"
        description="Group scoreables into logical buckets for scoring."
        onAdd={openCreateModal}
        addLabel="Add Category"
        refreshing={refreshing}
      >
        {loading ? (
          <div className="flex flex-1 items-center justify-center ro-text-muted">
            Loading categories...
          </div>
        ) : isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center ro-text-muted">
            <p className="text-sm">No categories yet. Start by adding one.</p>
            <Button type="button" variant="outline" size="sm" onClick={openCreateModal}>
              Add your first category
            </Button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1">
              <Table containerClassName="h-full">
                <TableHeader>
                  <TableRow>
                    {renderCrudTableHeader<CategoryView, 'actions'>({
                      columns,
                      sort: sortPlaceholder,
                      toggleSort: () => {}
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <DragDropTable items={categories} onReorder={handleReorder}>
                    {(category, { listeners, setActivatorNodeRef }) => (
                      <>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <DragHandle
                              listeners={listeners}
                              setActivatorNodeRef={setActivatorNodeRef}
                              label={`Reorder ${category.name}`}
                            />
                            <span className="text-sm">{category.order}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <span className="font-medium">{category.name}</span>
                            <span className="text-[11px] uppercase tracking-[0.3em] ro-text-muted">
                              {category.direction === 'asc'
                                ? 'Lower is better'
                                : 'Higher is better'}
                            </span>
                            {category.rules.length ? (
                              <div className="flex flex-wrap gap-2">
                                {category.rules.map((rule, idx) => (
                                  <Pill key={`${rule}-${idx}`} size="sm" variant="muted">
                                    {rule}
                                  </Pill>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {category.scoreables.length ? (
                            <div className="flex flex-wrap gap-2">
                              {category.scoreables.map((scoreable) => (
                                <Pill key={scoreable.id} size="sm">
                                  {scoreable.label}
                                </Pill>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm ro-text-muted">No scoreables</span>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <CrudTableActions
                            actions={[
                              {
                                label: `View ${category.name}`,
                                icon: <FiEye />,
                                onClick: () => openDetails(category)
                              },
                              {
                                label: `Edit ${category.name}`,
                                icon: <FiEdit2 />,
                                onClick: () => openEditModal(category)
                              },
                              {
                                label: `Delete ${category.name}`,
                                icon: <FiTrash2 />,
                                onClick: () => requestDelete(category),
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

      <CategoryFormModal
        open={formState.open}
        mode={formState.open ? (formState.mode ?? 'create') : 'create'}
        category={editModalCategory}
        scoreables={scoreables}
        standingRules={standingRules}
        submitting={formSubmitting}
        onSubmit={handleFormSubmit}
        onClose={closeFormModal}
      />

      <CategoryDetailsModal
        open={detailsState.open}
        category={detailsState.category}
        onClose={closeDetails}
      />

      <ConfirmDialog
        open={deleteState.open}
        title="Delete Category"
        confirming={deleteState.deleting}
        confirmLabel="Delete Category"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        description={
          deleteState.category ? (
            <p>
              This will permanently remove <strong>{deleteState.category.name}</strong> and unlink
              it from all divisions and scoreables. This action cannot be undone.
            </p>
          ) : (
            'Are you sure you want to delete this category?'
          )
        }
      />
    </>
  )
}

function areStringArraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}

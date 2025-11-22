import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FiEdit2, FiEye, FiTrash2 } from 'react-icons/fi'
import type { CategoryView, NewCategory, PatchCategory } from '@core/tournaments/categories'
import { ManageSectionShell } from '@renderer/components/ManageSectionShell'
import {
  type CrudTableColumn,
  renderCrudTableHeader
} from '@renderer/components/crud/CrudTableHeader'
import { CrudTableActions } from '@renderer/components/crud/CrudTableActions'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@renderer/components/ui/table'
import { Button } from '@renderer/components/ui/button'
import { Pill } from '@renderer/components/ui/pill'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import { CategoryFormModal, type CategoryFormValues } from './CategoryFormModal'
import { CategoryDetailsModal } from './CategoryDetailsModal'
import { useUniversalSearchSort } from '@renderer/hooks/useUniversalSearchSort'
import { useCategoryViewsQuery, useStandingRulesQuery } from '@renderer/queries/categories'
import { useMetricsListQuery } from '@renderer/queries/metrics'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@renderer/queries/queryKeys'

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
  { key: 'name', label: 'Category', sortable: true },
  { key: 'metrics', label: 'Metrics', sortable: false },
  { key: 'actions', label: 'Actions', sortable: false, align: 'right' }
]

const CATEGORY_FUZZY_FIELDS: Array<keyof CategoryView & string> = ['name', 'id']

export function CategoriesSection() {
  const queryClient = useQueryClient()
  const [formState, setFormState] = useState<FormState>({ open: false, mode: null })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [detailsState, setDetailsState] = useState<DetailsState>({ open: false })
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false, deleting: false })
  const { data: categories = [], isLoading, isFetching } = useCategoryViewsQuery()
  const { data: metrics = [] } = useMetricsListQuery()
  const { data: standingRules = [] } = useStandingRulesQuery()

  const invalidateCategories = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.categories.views() })

  const {
    results: filteredCategories,
    query,
    setQuery,
    sort,
    toggleSort
  } = useUniversalSearchSort<CategoryView>({
    items: categories,
    searchKeys: CATEGORY_FUZZY_FIELDS,
    initialSort: { key: 'name', direction: 'asc' }
  })

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
      const trimmedCountName = values.metricsCountName.trim()
      if (formState.mode === 'create') {
        const payload: NewCategory = {
          name: values.name,
          direction: values.direction,
          rules: values.rules,
          showMetricsCount: values.showMetricsCount,
          metricsCountName: values.showMetricsCount ? trimmedCountName : ''
        }
        const categoryId: string = await window.api.categories.create(payload)
        if (values.metricIds.length) {
          await Promise.all(
            values.metricIds.map((metricId) =>
              window.api.categories.addMetric(categoryId, metricId)
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
        if (values.showMetricsCount !== Boolean(category.showMetricsCount)) {
          patch.showMetricsCount = values.showMetricsCount
          if (!values.showMetricsCount) {
            patch.metricsCountName = ''
          }
        }
        const previousCountName = category.metricsCountName ?? ''
        if (values.showMetricsCount && trimmedCountName !== previousCountName) {
          patch.metricsCountName = trimmedCountName
        }

        let changed = false

        if (Object.keys(patch).length) {
          const success = await window.api.categories.update(category.id, patch)
          if (!success) throw new Error('Update returned false')
          changed = true
        }

        const prevIds = new Set(category.metrics.map((metric) => metric.id))
        const nextIds = new Set(values.metricIds)

        const toAdd = [...nextIds].filter((id) => !prevIds.has(id))
        const toRemove = [...prevIds].filter((id) => !nextIds.has(id))

        if (toAdd.length || toRemove.length) {
          await Promise.all([
            ...toAdd.map((id) => window.api.categories.addMetric(category.id, id)),
            ...toRemove.map((id) => window.api.categories.removeMetric(category.id, id))
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

      await invalidateCategories()
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
      await invalidateCategories()
    } catch (error) {
      console.error('Failed to delete category', error)
      toast.error('Could not delete category')
      setDeleteState((prev) => ({ ...prev, deleting: false }))
    }
  }

  const refreshing = isFetching && !isLoading
  const isEmpty = !isLoading && categories.length === 0
  const categoryCount = categories.length
  const categoryCountLabel = isLoading ? '—' : categoryCount.toLocaleString()

  const editModalCategory = useMemo(() => {
    if (!formState.open || formState.mode !== 'edit' || !formState.category) return undefined
    return {
      ...formState.category,
      metricIds: formState.category.metrics.map((metric) => metric.id)
    }
  }, [formState])

  return (
    <>
      <ManageSectionShell
        title="Categories"
        titleAdornment={<Pill>{categoryCountLabel}</Pill>}
        description="Group metrics into logical buckets for scoring."
        onAdd={openCreateModal}
        addLabel="Add Category"
        refreshing={refreshing}
        searchPlaceholder="Search categories"
        searchValue={query}
        onSearchChange={setQuery}
      >
        {isLoading ? (
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
                      sort,
                      toggleSort
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{category.name}</span>
                          <span className="text-[11px] uppercase tracking-[0.3em] ro-text-muted">
                            {category.direction === 'asc' ? 'Lower is better' : 'Higher is better'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {category.metrics.length ? (
                          <div className="flex flex-wrap gap-2">
                            {category.metrics.map((metric) => (
                              <Pill key={metric.id} size="sm">
                                {metric.label}
                              </Pill>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm ro-text-muted">No metrics</span>
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
                    </TableRow>
                  ))}
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
        metrics={metrics}
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
              it from all divisions and metrics. This action cannot be undone.
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

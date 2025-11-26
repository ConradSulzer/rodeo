import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FiEdit2, FiEye, FiTrash2 } from 'react-icons/fi'
import type { Category, NewCategory, PatchCategory } from '@core/tournaments/categories'
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
import { useCategoriesQuery, useStandingRulesQuery } from '@renderer/queries/categories'
import { useMetricsListQuery } from '@renderer/queries/metrics'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@renderer/queries/queryKeys'

type FormState =
  | { status: 'closed' }
  | { status: 'creating' }
  | { status: 'editing'; category: Category }

type DetailsState = { status: 'closed' } | { status: 'open'; category: Category }

type DeleteState =
  | { status: 'closed'; deleting: false }
  | { status: 'confirming'; category: Category; deleting: boolean }

const columns: ReadonlyArray<CrudTableColumn<Category, 'actions'>> = [
  { key: 'name', label: 'Category', sortable: true },
  { key: 'metrics', label: 'Metrics', sortable: false },
  { key: 'actions', label: 'Actions', sortable: false, align: 'right' }
]

const CATEGORY_FUZZY_FIELDS: Array<keyof Category & string> = ['name', 'id']

export function CategoriesSection() {
  const queryClient = useQueryClient()
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isFetching: categoriesFetching
  } = useCategoriesQuery()
  const [formState, setFormState] = useState<FormState>({ status: 'closed' })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [detailsState, setDetailsState] = useState<DetailsState>({ status: 'closed' })
  const [deleteState, setDeleteState] = useState<DeleteState>({ status: 'closed', deleting: false })
  const { data: metrics = [] } = useMetricsListQuery()
  const { data: standingRules = [] } = useStandingRulesQuery()

  const {
    results: filteredCategories,
    query,
    setQuery,
    sort,
    toggleSort
  } = useUniversalSearchSort<Category>({
    items: categories,
    searchKeys: CATEGORY_FUZZY_FIELDS,
    initialSort: { key: 'name', direction: 'asc' }
  })

  const refreshCategories = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.categories.all() })
  }, [queryClient])

  const runCategoryMutation = useCallback(
    async (action: () => Promise<unknown>, successMessage: string, errorMessage: string) => {
      try {
        const result = await action()
        if (result === false) throw new Error('Mutation returned false')
        toast.success(successMessage)
        await refreshCategories()
        return true
      } catch (error) {
        console.error(errorMessage, error)
        toast.error(errorMessage)
        return false
      }
    },
    [refreshCategories]
  )

  const openCreateModal = () => setFormState({ status: 'creating' })

  const openEditModal = (category: Category) => setFormState({ status: 'editing', category })

  const closeFormModal = () => {
    if (formSubmitting) return
    setFormState({ status: 'closed' })
  }

  const openDetails = (category: Category) => setDetailsState({ status: 'open', category })
  const closeDetails = () => setDetailsState({ status: 'closed' })

  const requestDelete = (category: Category) =>
    setDeleteState({ status: 'confirming', deleting: false, category })

  const cancelDelete = () => {
    if (deleteState.status === 'confirming' && deleteState.deleting) return
    setDeleteState({ status: 'closed', deleting: false })
  }

  const handleFormSubmit = async (values: CategoryFormValues) => {
    if (formState.status === 'closed') return
    setFormSubmitting(true)
    try {
      const trimmedCountName = values.metricsCountName.trim()
      if (formState.status === 'creating') {
        const payload: NewCategory = {
          name: values.name,
          direction: values.direction,
          rules: values.rules,
          showMetricsCount: values.showMetricsCount,
          metricsCountName: values.showMetricsCount ? trimmedCountName : ''
        }
        const success = await runCategoryMutation(
          async () => {
            const categoryId: string = await window.api.categories.create(payload)
            if (values.metricIds.length) {
              await Promise.all(
                values.metricIds.map((metricId) =>
                  window.api.categories.addMetric(categoryId, metricId)
                )
              )
            }
            return true
          },
          'Category added',
          'Unable to add category'
        )
        if (!success) {
          return
        }
      } else if (formState.status === 'editing') {
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

        const prevIds = new Set(category.metrics.map((metric) => metric.id))
        const nextIds = new Set(values.metricIds)

        const toAdd = [...nextIds].filter((id) => !prevIds.has(id))
        const toRemove = [...prevIds].filter((id) => !nextIds.has(id))

        if (!Object.keys(patch).length && toAdd.length === 0 && toRemove.length === 0) {
          toast.info('No changes to save')
          setFormState({ status: 'closed' })
          return
        }

        const success = await runCategoryMutation(
          async () => {
            if (Object.keys(patch).length) {
              const updated = await window.api.categories.update(category.id, patch)
              if (!updated) throw new Error('Update returned false')
            }

            if (toAdd.length || toRemove.length) {
              await Promise.all([
                ...toAdd.map((id) => window.api.categories.addMetric(category.id, id)),
                ...toRemove.map((id) => window.api.categories.removeMetric(category.id, id))
              ])
            }
            return true
          },
          'Category updated',
          'Unable to update category'
        )

        if (!success) {
          return
        }
      }

      setFormState({ status: 'closed' })
    } catch (error) {
      console.error('Failed to submit category form', error)
      toast.error('Unable to save category')
    } finally {
      setFormSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (deleteState.status !== 'confirming') return
    setDeleteState({ ...deleteState, deleting: true })

    const success = await runCategoryMutation(
      () => window.api.categories.delete(deleteState.category.id),
      `Deleted ${deleteState.category.name}`,
      'Could not delete category'
    )

    if (success) {
      setDeleteState({ status: 'closed', deleting: false })
    } else {
      setDeleteState((prev) => (prev.status === 'confirming' ? { ...prev, deleting: false } : prev))
    }
  }

  const loading = categoriesLoading
  const refreshing = (!loading && categoriesFetching) || false
  const isEmpty = !loading && categories.length === 0
  const categoryCount = categories.length
  const categoryCountLabel = loading ? '—' : categoryCount.toLocaleString()

  const editModalCategory = useMemo(() => {
    if (formState.status !== 'editing') return undefined
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
                    {renderCrudTableHeader<Category, 'actions'>({
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
        open={formState.status !== 'closed'}
        mode={formState.status === 'creating' ? 'create' : 'edit'}
        category={editModalCategory}
        metrics={metrics}
        standingRules={standingRules}
        submitting={formSubmitting}
        onSubmit={handleFormSubmit}
        onClose={closeFormModal}
      />

      <CategoryDetailsModal
        open={detailsState.status === 'open'}
        category={detailsState.status === 'open' ? detailsState.category : undefined}
        onClose={closeDetails}
      />

      <ConfirmDialog
        open={deleteState.status === 'confirming'}
        title="Delete Category"
        confirming={deleteState.status === 'confirming' ? deleteState.deleting : false}
        confirmLabel="Delete Category"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        description={
          deleteState.status === 'confirming' ? (
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

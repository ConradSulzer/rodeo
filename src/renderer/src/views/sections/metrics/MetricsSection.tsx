import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FiEdit2, FiEye, FiTrash2 } from 'react-icons/fi'
import type { MetricFormData } from '@core/metrics/metricFormSchema'
import type { MetricRecord, NewMetric, PatchMetric } from '@core/tournaments/metrics'
import { ManageSectionShell } from '@renderer/components/ManageSectionShell'
import { CrudTableActions } from '@renderer/components/crud/CrudTableActions'
import {
  type CrudTableColumn,
  renderCrudTableHeader
} from '@renderer/components/crud/CrudTableHeader'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@renderer/components/ui/table'
import { Button } from '@renderer/components/ui/button'
import { MetricFormModal } from './MetricFormModal'
import { MetricDetailsModal } from './MetricDetailsModal'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import { useUniversalSearchSort } from '@renderer/hooks/useUniversalSearchSort'
import { Pill } from '@renderer/components/ui/pill'
import { useMetricsListQuery } from '@renderer/queries/metrics'
import { useCategoriesQuery } from '@renderer/queries/categories'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@renderer/queries/queryKeys'

type MetricRow = MetricRecord & { categoryNames: string[] }

type FormState =
  | { status: 'closed' }
  | { status: 'creating' }
  | { status: 'editing'; metric: MetricRow }

type DetailsState = { status: 'closed' } | { status: 'open'; metric: MetricRow }

type DeleteState =
  | { status: 'closed'; deleting: false }
  | { status: 'confirming'; metric: MetricRow; deleting: boolean }

const columns: ReadonlyArray<CrudTableColumn<MetricRow, 'actions' | 'categoryNames'>> = [
  { key: 'label', label: 'Metric', sortable: true },
  { key: 'unit', label: 'Unit', sortable: true },
  { key: 'categoryNames', label: 'Categories', sortable: false },
  { key: 'actions', label: 'Actions', sortable: false, align: 'right' }
]

const METRIC_FUZZY_FIELDS: Array<keyof MetricRow & string> = ['label', 'id']

export function MetricsSection() {
  const queryClient = useQueryClient()
  const {
    data: metrics = [],
    isLoading: metricsLoading,
    isFetching: metricsFetching
  } = useMetricsListQuery()
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isFetching: categoriesFetching
  } = useCategoriesQuery()
  const [formState, setFormState] = useState<FormState>({ status: 'closed' })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [detailsState, setDetailsState] = useState<DetailsState>({ status: 'closed' })
  const [deleteState, setDeleteState] = useState<DeleteState>({ status: 'closed', deleting: false })

  const categoryLookup = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  )

  const metricsWithCategories = useMemo<MetricRow[]>(
    () =>
      metrics.map((metric) => ({
        ...metric,
        categoryNames: metric.categories
          .map((categoryId) => categoryLookup.get(categoryId) ?? 'Unknown')
          .sort((a, b) => a.localeCompare(b))
      })),
    [metrics, categoryLookup]
  )

  const {
    results: filteredMetrics,
    query,
    setQuery,
    sort,
    toggleSort
  } = useUniversalSearchSort<MetricRow>({
    items: metricsWithCategories,
    searchKeys: METRIC_FUZZY_FIELDS,
    initialSort: { key: 'label', direction: 'asc' }
  })

  const openCreateModal = () => {
    setFormState({ status: 'creating' })
  }

  const openEditModal = (metric: MetricRow) => {
    setFormState({ status: 'editing', metric })
  }

  const closeFormModal = () => {
    if (formSubmitting) return
    setFormState({ status: 'closed' })
  }

  const openDetails = (metric: MetricRow) => {
    setDetailsState({ status: 'open', metric })
  }

  const closeDetails = () => setDetailsState({ status: 'closed' })

  const requestDelete = (metric: MetricRow) => {
    setDeleteState({ status: 'confirming', metric, deleting: false })
  }

  const cancelDelete = () => {
    if (deleteState.deleting) return
    setDeleteState({ status: 'closed', deleting: false })
  }

  const refreshMetrics = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.metrics.list() })
  }, [queryClient])

  const runMetricMutation = useCallback(
    async (action: () => Promise<unknown>, successMessage: string, errorMessage: string) => {
      try {
        const result = await action()
        if (result === false) {
          throw new Error('Mutation returned false')
        }
        toast.success(successMessage)
        await refreshMetrics()
        return true
      } catch (error) {
        console.error(errorMessage, error)
        toast.error(errorMessage)
        return false
      }
    },
    [refreshMetrics]
  )

  const handleFormSubmit = async (values: MetricFormData) => {
    if (formState.status === 'closed') return

    setFormSubmitting(true)
    try {
      if (formState.status === 'creating') {
        const payload: NewMetric = {
          label: values.label,
          unit: values.unit
        }
        const success = await runMetricMutation(
          () => window.api.metrics.create(payload),
          'Metric added',
          'Unable to add metric'
        )
        if (!success) return
      } else if (formState.status === 'editing') {
        const metric = formState.metric
        const patch: PatchMetric = {}
        if (values.label !== metric.label) patch.label = values.label
        if (values.unit !== metric.unit) patch.unit = values.unit

        if (!Object.keys(patch).length) {
          toast.info('No changes to save')
          closeFormModal()
          return
        }

        const success = await runMetricMutation(
          () => window.api.metrics.update(metric.id, patch),
          'Metric updated',
          'Unable to update metric'
        )
        if (!success) return
      }

      setFormState({ status: 'closed' })
    } catch (error) {
      console.error('Failed to submit metric form', error)
      toast.error('Unable to save metric')
    } finally {
      setFormSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (deleteState.status !== 'confirming') return
    setDeleteState({ ...deleteState, deleting: true })

    const success = await runMetricMutation(
      () => window.api.metrics.delete(deleteState.metric.id),
      `Deleted ${deleteState.metric.label}`,
      'Could not delete ${deleteState.metric.label}'
    )

    if (success) {
      setDeleteState({ status: 'closed', deleting: false })
    } else {
      setDeleteState((prev) => (prev.status === 'confirming' ? { ...prev, deleting: false } : prev))
    }
  }

  const loading = metricsLoading || categoriesLoading
  const refreshing = (!loading && (metricsFetching || categoriesFetching)) || false
  const isEmpty = !loading && metricsWithCategories.length === 0
  const metricCount = metricsWithCategories.length
  const metricCountLabel = loading ? '—' : metricCount.toLocaleString()
  const formOpen = formState.status !== 'closed'
  const formMode: 'create' | 'edit' = formState.status === 'editing' ? 'edit' : 'create'
  const editingMetric = formState.status === 'editing' ? formState.metric : undefined
  const detailsOpen = detailsState.status === 'open'
  const detailsMetric = detailsState.status === 'open' ? detailsState.metric : undefined
  const deleteOpen = deleteState.status === 'confirming'
  const deleting = deleteState.status === 'confirming' ? deleteState.deleting : false
  const deleteMetric = deleteState.status === 'confirming' ? deleteState.metric : undefined

  return (
    <>
      <ManageSectionShell
        title="Metrics"
        titleAdornment={<Pill>{metricCountLabel}</Pill>}
        description="The measurable entries players will submit."
        onAdd={openCreateModal}
        addLabel="Add Metric"
        refreshing={refreshing}
        searchPlaceholder="Search metrics"
        searchValue={query}
        onSearchChange={setQuery}
      >
        {loading ? (
          <div className="flex flex-1 items-center justify-center ro-text-muted">
            Loading metrics...
          </div>
        ) : isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center ro-text-muted">
            <p className="text-sm">No metrics yet. Start by adding one.</p>
            <Button type="button" variant="outline" size="sm" onClick={openCreateModal}>
              Add your first metric
            </Button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 min-h-0">
              <Table containerClassName="h-full">
                <TableHeader>
                  <TableRow>
                    {renderCrudTableHeader<MetricRow, 'actions' | 'categoryNames'>({
                      columns,
                      sort,
                      toggleSort
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMetrics.map((metric) => (
                    <TableRow key={metric.id}>
                      <TableCell>{metric.label}</TableCell>
                      <TableCell>{metric.unit}</TableCell>
                      <TableCell>
                        {metric.categoryNames.length ? (
                          <div className="flex flex-wrap gap-2">
                            {metric.categoryNames.map((category) => (
                              <Pill key={category} size="sm">
                                {category}
                              </Pill>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm ro-text-muted">No categories</span>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <CrudTableActions
                          actions={[
                            {
                              label: `View ${metric.label}`,
                              icon: <FiEye />,
                              onClick: () => openDetails(metric)
                            },
                            {
                              label: `Edit ${metric.label}`,
                              icon: <FiEdit2 />,
                              onClick: () => openEditModal(metric)
                            },
                            {
                              label: `Delete ${metric.label}`,
                              icon: <FiTrash2 />,
                              onClick: () => requestDelete(metric),
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

      <MetricFormModal
        open={formOpen}
        mode={formMode}
        metric={editingMetric}
        submitting={formSubmitting}
        onSubmit={handleFormSubmit}
        onClose={closeFormModal}
      />

      <MetricDetailsModal open={detailsOpen} metric={detailsMetric} onClose={closeDetails} />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Metric"
        confirming={deleting}
        confirmLabel="Delete Metric"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        description={
          deleteMetric ? (
            <p>
              This will permanently remove <strong>{deleteMetric.label}</strong> from the
              tournament. This action cannot be undone.
            </p>
          ) : (
            'Are you sure you want to delete this metric?'
          )
        }
      />
    </>
  )
}

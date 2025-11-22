import { useState } from 'react'
import { toast } from 'sonner'
import { FiEdit2, FiEye, FiTrash2 } from 'react-icons/fi'
import type { MetricFormData } from '@core/metrics/metricFormSchema'
import type { NewMetric, PatchMetric, MetricView } from '@core/tournaments/metrics'
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
import { useMetricViewsQuery } from '@renderer/queries/metrics'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@renderer/queries/queryKeys'

type FormState =
  | { open: false; mode: null; metric?: undefined }
  | { open: true; mode: 'create'; metric?: undefined }
  | { open: true; mode: 'edit'; metric: MetricView }

type DetailsState = {
  open: boolean
  metric?: MetricView
}

type DeleteState = {
  open: boolean
  metric?: MetricView
  deleting: boolean
}

const columns: ReadonlyArray<CrudTableColumn<MetricView, 'actions' | 'divisions'>> = [
  { key: 'label', label: 'Metric', sortable: true },
  { key: 'unit', label: 'Unit', sortable: true },
  { key: 'divisions', label: 'Divisions', sortable: false },
  { key: 'actions', label: 'Actions', sortable: false, align: 'right' }
]

const METRIC_FUZZY_FIELDS: Array<keyof MetricView & string> = ['label', 'id']

export function MetricsSection() {
  const queryClient = useQueryClient()
  const [formState, setFormState] = useState<FormState>({ open: false, mode: null })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [detailsState, setDetailsState] = useState<DetailsState>({ open: false })
  const [deleteState, setDeleteState] = useState<DeleteState>({
    open: false,
    deleting: false
  })

  const { data: metrics = [], isLoading, isFetching } = useMetricViewsQuery()

  const invalidateMetrics = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.metrics.views() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.metrics.list() })
    ])

  const {
    results: filteredMetrics,
    query,
    setQuery,
    sort,
    toggleSort
  } = useUniversalSearchSort<MetricView>({
    items: metrics,
    searchKeys: METRIC_FUZZY_FIELDS,
    initialSort: { key: 'label', direction: 'asc' }
  })

  const openCreateModal = () => {
    setFormState({ open: true, mode: 'create' })
  }

  const openEditModal = (metric: MetricView) => {
    setFormState({ open: true, mode: 'edit', metric })
  }

  const closeFormModal = () => {
    if (formSubmitting) return
    setFormState({ open: false, mode: null })
  }

  const openDetails = (metric: MetricView) => {
    setDetailsState({ open: true, metric })
  }

  const closeDetails = () => setDetailsState({ open: false })

  const requestDelete = (metric: MetricView) => {
    setDeleteState({ open: true, metric, deleting: false })
  }

  const cancelDelete = () => {
    if (deleteState.deleting) return
    setDeleteState({ open: false, metric: undefined, deleting: false })
  }

  const handleFormSubmit = async (values: MetricFormData) => {
    if (!formState.open) return

    setFormSubmitting(true)
    try {
      if (formState.mode === 'create') {
        const payload: NewMetric = {
          label: values.label,
          unit: values.unit
        }
        await window.api.metrics.create(payload)
        toast.success('Metric added')
      } else if (formState.mode === 'edit' && formState.metric) {
        const metric = formState.metric
        const patch: PatchMetric = {}
        if (values.label !== metric.label) patch.label = values.label
        if (values.unit !== metric.unit) patch.unit = values.unit

        if (!Object.keys(patch).length) {
          toast.info('No changes to save')
          closeFormModal()
          return
        }

        const success = await window.api.metrics.update(metric.id, patch)
        if (!success) {
          throw new Error('Update returned false')
        }
        toast.success('Metric updated')
      }

      await invalidateMetrics()
      setFormState({ open: false, mode: null })
    } catch (error) {
      console.error('Failed to submit metric form', error)
      toast.error('Unable to save metric')
    } finally {
      setFormSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteState.open || !deleteState.metric) return
    setDeleteState((prev) => ({ ...prev, deleting: true }))

    try {
      const success = await window.api.metrics.delete(deleteState.metric.id)
      if (!success) {
        throw new Error('Delete returned false')
      }
      toast.success(`Deleted ${deleteState.metric.label}`)
      setDeleteState({ open: false, metric: undefined, deleting: false })
      await invalidateMetrics()
    } catch (error) {
      console.error('Failed to delete metric', error)
      toast.error('Could not delete metric')
      setDeleteState((prev) => ({ ...prev, deleting: false }))
    }
  }

  const refreshing = isFetching && !isLoading
  const isEmpty = !isLoading && metrics.length === 0
  const metricCount = metrics.length
  const metricCountLabel = isLoading ? '—' : metricCount.toLocaleString()

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
        {isLoading ? (
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
                    {renderCrudTableHeader<MetricView, 'actions' | 'divisions'>({
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
                        {metric.divisions.length ? (
                          <div className="flex flex-wrap gap-2">
                            {metric.divisions.map((division) => (
                              <Pill key={division} size="sm">
                                {division}
                              </Pill>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm ro-text-muted">No divisions</span>
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
        open={formState.open}
        mode={formState.open ? formState.mode : 'create'}
        metric={formState.open && formState.mode === 'edit' ? formState.metric : undefined}
        submitting={formSubmitting}
        onSubmit={handleFormSubmit}
        onClose={closeFormModal}
      />

      <MetricDetailsModal
        open={detailsState.open}
        metric={detailsState.metric}
        onClose={closeDetails}
      />

      <ConfirmDialog
        open={deleteState.open}
        title="Delete Metric"
        confirming={deleteState.deleting}
        confirmLabel="Delete Metric"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        description={
          deleteState.metric ? (
            <p>
              This will permanently remove <strong>{deleteState.metric.label}</strong> from the
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

import { useEffect, useState, type FormEvent } from 'react'
import type { Category, CategoryMode } from '@core/tournaments/categories'
import type { MetricRecord } from '@core/tournaments/metrics'
import type { StandingRuleSummary } from '@core/tournaments/standingRules'
import { Modal } from '@renderer/components/Modal'
import { Field } from '@renderer/components/ui/field'
import { Label } from '@renderer/components/ui/label'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'

export type CategoryFormValues = {
  name: string
  mode: CategoryMode
  direction: 'asc' | 'desc'
  rules: string[]
  metricIds: string[]
  showMetricsCount: boolean
  metricsCountName: string
}

const defaultValues: CategoryFormValues = {
  name: '',
  mode: 'aggregate',
  direction: 'asc',
  rules: [],
  metricIds: [],
  showMetricsCount: false,
  metricsCountName: ''
}

type CategoryFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  category?: Category & { metricIds?: string[] }
  metrics: MetricRecord[]
  standingRules: StandingRuleSummary[]
  submitting?: boolean
  onSubmit: (values: CategoryFormValues) => Promise<void>
  onClose: () => void
}

export function CategoryFormModal({
  open,
  mode,
  category,
  metrics,
  standingRules,
  submitting = false,
  onSubmit,
  onClose
}: CategoryFormModalProps) {
  const [values, setValues] = useState<CategoryFormValues>(defaultValues)
  const [errors, setErrors] = useState<{ name?: string; metricsCountName?: string }>()

  useEffect(() => {
    if (!open) return

    setErrors({})

    if (category) {
      setValues({
        name: category.name,
        mode: category.mode ?? 'aggregate',
        direction: category.direction as 'asc' | 'desc',
        rules: category.rules ?? [],
        metricIds: category.metricIds ?? [],
        showMetricsCount: Boolean(category.showMetricsCount),
        metricsCountName: category.metricsCountName ?? ''
      })
    } else {
      setValues(defaultValues)
    }
  }, [open, category])

  const title = mode === 'create' ? 'Add Category' : 'Edit Category'
  const submitLabel = mode === 'create' ? 'Add Category' : 'Save Changes'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const nextErrors: { name?: string; metricsCountName?: string } = {}

    const trimmedName = values.name.trim()

    if (!trimmedName) {
      nextErrors.name = 'Name is required'
    }

    const trimmedCountName = values.metricsCountName.trim()

    if (values.showMetricsCount && !trimmedCountName) {
      nextErrors.metricsCountName = 'Column name is required'
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    await onSubmit({
      ...values,
      name: trimmedName,
      rules: values.rules.filter((rule) => rule.trim().length),
      metricsCountName: values.showMetricsCount ? trimmedCountName : ''
    })
  }

  const toggleMetric = (id: string) => {
    setValues((prev) => {
      const set = new Set(prev.metricIds)
      if (set.has(id)) {
        set.delete(id)
      } else {
        set.add(id)
      }
      return { ...prev, metricIds: Array.from(set) }
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={title} contentClassName="w-[900px]">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="flex gap-5">
          <Field
            className="flex-1"
            label={<Label htmlFor="category-name">Name</Label>}
            error={errors?.name}
          >
            <Input
              id="category-name"
              value={values.name}
              onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
              autoFocus
            />
          </Field>
          <Field className="flex-1" label={<Label htmlFor="category-mode">Scoring Mode</Label>}>
            <select
              id="category-mode"
              className="rounded-md border ro-border ro-bg-dim px-3 py-2 text-sm ro-text-main"
              value={values.mode}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  mode: event.target.value as CategoryMode
                }))
              }
            >
              <option value="aggregate">Sum All</option>
              <option value="pick_one">Pick One</option>
            </select>
          </Field>
          <Field
            className="flex-1"
            label={<Label htmlFor="category-direction">Scoring Direction</Label>}
          >
            <select
              id="category-direction"
              className="rounded-md border ro-border ro-bg-dim px-3 py-2 text-sm ro-text-main"
              value={values.direction}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, direction: event.target.value as 'asc' | 'desc' }))
              }
            >
              <option value="asc">Lower is better</option>
              <option value="desc">Higher is better</option>
            </select>
          </Field>
        </div>
        <div className="flex flex-col gap-2">
          <Label className="border-b">Pick Metrics To Include</Label>
          {metrics.length ? (
            <div className="grid gap-2 md:grid-cols-2 px-3">
              {metrics.map((metric) => (
                <label key={metric.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={values.metricIds.includes(metric.id)}
                    onChange={() => toggleMetric(metric.id)}
                  />
                  <span>{metric.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs ro-text-muted">No metrics available.</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label className="border-b">Optional Rules</Label>
          <div className="flex flex-col gap-3 px-3">
            {standingRules.map((rule) => (
              <label key={rule.name} className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={values.rules.includes(rule.name)}
                  onChange={() =>
                    setValues((prev) => {
                      const set = new Set(prev.rules)
                      if (set.has(rule.name)) {
                        set.delete(rule.name)
                      } else {
                        set.add(rule.name)
                      }
                      return { ...prev, rules: Array.from(set) }
                    })
                  }
                />
                <span>
                  <span className="font-medium">{rule.label}</span>
                  <span className="mt-1 block text-xs ro-text-muted">{rule.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Label className="border-b">Optional Display Settings</Label>
          <div className="px-3 flex flex-col gap-1">
            <label className="flex items-center gap-3 text-sm font-medium ro-text-main">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={values.showMetricsCount}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    showMetricsCount: event.target.checked
                  }))
                }
              />
              Display Metric Count Column
            </label>
            <p className="text-xs ro-text-muted">
              Adds a column in standings to show how many metrics a player obtained from this
              category.
            </p>
            <Field
              className="mt-3"
              label={<Label htmlFor="category-metrics-count-name">Count Column Name</Label>}
              error={errors?.metricsCountName}
            >
              <Input
                id="category-metrics-count-name"
                placeholder="e.g. Total Fish"
                value={values.metricsCountName}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    metricsCountName: event.target.value
                  }))
                }
              />
            </Field>
          </div>
        </div>
        <div className="mt-2 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline-muted"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" variant="positive" disabled={submitting}>
            {submitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

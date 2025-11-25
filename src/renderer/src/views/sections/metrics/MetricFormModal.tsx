import { useEffect, useState, type FormEvent } from 'react'
import type { MetricRecord } from '@core/tournaments/metrics'
import {
  metricFormSchema,
  type MetricFormData,
  type MetricFormInput
} from '@core/metrics/metricFormSchema'
import { Modal } from '../../../components/Modal'
import { Field } from '../../../components/ui/field'
import { Label } from '../../../components/ui/label'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'

type MetricFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  metric?: MetricRecord
  submitting?: boolean
  onSubmit: (values: MetricFormData) => Promise<void>
  onClose: () => void
}

type ValidationErrors = Partial<Record<keyof MetricFormData, string>>

const emptyForm: MetricFormInput = {
  label: '',
  unit: ''
}

function toInitialValues(metric?: MetricRecord): MetricFormInput {
  if (!metric) return emptyForm
  return {
    label: metric.label ?? '',
    unit: metric.unit ?? ''
  }
}

export function MetricFormModal({
  open,
  mode,
  metric,
  submitting = false,
  onSubmit,
  onClose
}: MetricFormModalProps) {
  const [values, setValues] = useState<MetricFormInput>(emptyForm)
  const [errors, setErrors] = useState<ValidationErrors>({})

  useEffect(() => {
    if (!open) return
    const next = toInitialValues(metric)
    setValues(next)
    setErrors({})
  }, [open, metric])

  const title = mode === 'create' ? 'Add Metric' : 'Edit Metric'
  const submitLabel = mode === 'create' ? 'Add Metric' : 'Save Changes'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const parsed = metricFormSchema.safeParse(values)
    if (!parsed.success) {
      const fieldErrors: ValidationErrors = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path[0]
        if (typeof path === 'string') {
          fieldErrors[path as keyof MetricFormData] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    setErrors({})
    await onSubmit(parsed.data)
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <Field label={<Label htmlFor="metric-label">Label</Label>} error={errors.label}>
          <Input
            id="metric-label"
            value={values.label}
            onChange={(event) => setValues((prev) => ({ ...prev, label: event.target.value }))}
            autoFocus
          />
        </Field>
        <Field label={<Label htmlFor="metric-unit">Unit</Label>} error={errors.unit}>
          <Input
            id="metric-unit"
            value={values.unit}
            onChange={(event) => setValues((prev) => ({ ...prev, unit: event.target.value }))}
            placeholder="e.g. seconds, points"
          />
        </Field>
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

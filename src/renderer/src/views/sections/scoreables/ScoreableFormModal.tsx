import { useEffect, useState, type FormEvent } from 'react'
import type { Scoreable } from '@core/tournaments/scoreables'
import {
  scoreableFormSchema,
  type ScoreableFormData,
  type ScoreableFormInput
} from '@core/scoreables/scoreableFormSchema'
import { Modal } from '../../../components/Modal'
import { Field } from '../../../components/ui/field'
import { Label } from '../../../components/ui/label'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'

type ScoreableFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  scoreable?: Scoreable
  submitting?: boolean
  onSubmit: (values: ScoreableFormData) => Promise<void>
  onClose: () => void
}

type ValidationErrors = Partial<Record<keyof ScoreableFormData, string>>

const emptyForm: ScoreableFormInput = {
  label: '',
  unit: ''
}

function toInitialValues(scoreable?: Scoreable): ScoreableFormInput {
  if (!scoreable) return emptyForm
  return {
    label: scoreable.label ?? '',
    unit: scoreable.unit ?? ''
  }
}

export function ScoreableFormModal({
  open,
  mode,
  scoreable,
  submitting = false,
  onSubmit,
  onClose
}: ScoreableFormModalProps) {
  const [values, setValues] = useState<ScoreableFormInput>(emptyForm)
  const [errors, setErrors] = useState<ValidationErrors>({})

  useEffect(() => {
    if (!open) return
    const next = toInitialValues(scoreable)
    setValues(next)
    setErrors({})
  }, [open, scoreable])

  const title = mode === 'create' ? 'Add Scoreable' : 'Edit Scoreable'
  const submitLabel = mode === 'create' ? 'Add Scoreable' : 'Save Changes'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const parsed = scoreableFormSchema.safeParse(values)
    if (!parsed.success) {
      const fieldErrors: ValidationErrors = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path[0]
        if (typeof path === 'string') {
          fieldErrors[path as keyof ScoreableFormData] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    setErrors({})
    await onSubmit(parsed.data)
  }

  return (
    <Modal open={open} onClose={onClose} title={title} contentClassName="max-w-[600px]">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <Field label={<Label htmlFor="scoreable-label">Label</Label>} error={errors.label}>
          <Input
            id="scoreable-label"
            value={values.label}
            onChange={(event) => setValues((prev) => ({ ...prev, label: event.target.value }))}
            autoFocus
          />
        </Field>
        <Field label={<Label htmlFor="scoreable-unit">Unit</Label>} error={errors.unit}>
          <Input
            id="scoreable-unit"
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

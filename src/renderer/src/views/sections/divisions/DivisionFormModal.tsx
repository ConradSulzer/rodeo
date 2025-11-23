import { useEffect, useState, type FormEvent } from 'react'
import type { CategoryRecord } from '@core/tournaments/categories'
import type { DivisionView } from '@core/tournaments/divisions'
import { Modal } from '../../../components/Modal'
import { Field } from '../../../components/ui/field'
import { Label } from '../../../components/ui/label'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'

export type DivisionFormValues = {
  name: string
  categoryIds: string[]
}

type DivisionFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  division?: DivisionView & { categoryIds?: string[] }
  categories: CategoryRecord[]
  submitting?: boolean
  onSubmit: (values: DivisionFormValues) => Promise<void>
  onClose: () => void
}

const defaultValues: DivisionFormValues = {
  name: '',
  categoryIds: []
}

export function DivisionFormModal({
  open,
  mode,
  division,
  categories,
  submitting = false,
  onSubmit,
  onClose
}: DivisionFormModalProps) {
  const [values, setValues] = useState<DivisionFormValues>(defaultValues)
  const [errors, setErrors] = useState<{ name?: string }>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (division) {
      setValues({
        name: division.name,
        categoryIds: division.categoryIds ?? division.categories.map((cat) => cat.category.id)
      })
    } else {
      setValues(defaultValues)
    }
  }, [open, division])

  const title = mode === 'create' ? 'Add Division' : 'Edit Division'
  const submitLabel = mode === 'create' ? 'Add Division' : 'Save Changes'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    if (!values.name.trim()) {
      setErrors({ name: 'Name is required' })
      return
    }

    await onSubmit({
      ...values,
      name: values.name.trim()
    })
  }

  const toggleCategory = (categoryId: string) => {
    setValues((prev) => {
      if (prev.categoryIds.includes(categoryId)) {
        return { ...prev, categoryIds: prev.categoryIds.filter((id) => id !== categoryId) }
      }
      return { ...prev, categoryIds: [...prev.categoryIds, categoryId] }
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <Field label={<Label htmlFor="division-name">Name</Label>} error={errors.name}>
          <Input
            id="division-name"
            value={values.name}
            onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
            autoFocus
          />
        </Field>

        <div className="flex flex-col gap-2">
          <Label>Categories</Label>
          {categories.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={values.categoryIds.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                  />
                  <span>{category.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs ro-text-muted">No categories available.</p>
          )}
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

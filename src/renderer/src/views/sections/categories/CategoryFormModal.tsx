import { useEffect, useState, type FormEvent } from 'react'
import type { Category } from '@core/tournaments/categories'
import type { Scoreable } from '@core/tournaments/scoreables'
import type { StandingRuleSummary } from '@core/tournaments/standingRules'
import { Modal } from '../../../components/Modal'
import { Field } from '../../../components/ui/field'
import { Label } from '../../../components/ui/label'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'

export type CategoryFormValues = {
  name: string
  direction: 'asc' | 'desc'
  rules: string[]
  scoreableIds: string[]
}

const defaultValues: CategoryFormValues = {
  name: '',
  direction: 'asc',
  rules: [],
  scoreableIds: []
}

type CategoryFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  category?: Category & { scoreableIds?: string[] }
  scoreables: Scoreable[]
  standingRules: StandingRuleSummary[]
  submitting?: boolean
  onSubmit: (values: CategoryFormValues) => Promise<void>
  onClose: () => void
}

export function CategoryFormModal({
  open,
  mode,
  category,
  scoreables,
  standingRules,
  submitting = false,
  onSubmit,
  onClose
}: CategoryFormModalProps) {
  const [values, setValues] = useState<CategoryFormValues>(defaultValues)
  const [errors, setErrors] = useState<{ name?: string }>()

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (category) {
      setValues({
        name: category.name,
        direction: category.direction as 'asc' | 'desc',
        rules: category.rules ?? [],
        scoreableIds: category.scoreableIds ?? []
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

    if (!values.name.trim()) {
      setErrors({ name: 'Name is required' })
      return
    }

    await onSubmit({
      ...values,
      name: values.name.trim(),
      rules: values.rules.filter((rule) => rule.trim().length)
    })
  }

  const toggleScoreable = (id: string) => {
    setValues((prev) => {
      const set = new Set(prev.scoreableIds)
      if (set.has(id)) {
        set.delete(id)
      } else {
        set.add(id)
      }
      return { ...prev, scoreableIds: Array.from(set) }
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <Field label={<Label htmlFor="category-name">Name</Label>} error={errors?.name}>
          <Input
            id="category-name"
            value={values.name}
            onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
            autoFocus
          />
        </Field>
        <Field label={<Label htmlFor="category-direction">Scoring Direction</Label>}>
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
        <div className="flex flex-col gap-2">
          <Label>Optional Rules</Label>
          {standingRules.length ? (
            <div className="flex flex-col gap-3">
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
          ) : (
            <p className="text-xs ro-text-muted">No standing rules available.</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label>Scoreables</Label>
          {scoreables.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {scoreables.map((scoreable) => (
                <label key={scoreable.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={values.scoreableIds.includes(scoreable.id)}
                    onChange={() => toggleScoreable(scoreable.id)}
                  />
                  <span>{scoreable.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs ro-text-muted">No scoreables available.</p>
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

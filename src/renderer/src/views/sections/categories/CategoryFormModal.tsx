import { useEffect, useState, type FormEvent } from 'react'
import type { Category } from '@core/tournaments/categories'
import type { Scoreable } from '@core/tournaments/scoreables'
import type { StandingRuleSummary } from '@core/tournaments/standingRules'
import { Modal } from '@renderer/components/Modal'
import { Field } from '@renderer/components/ui/field'
import { Label } from '@renderer/components/ui/label'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'

export type CategoryFormValues = {
  name: string
  direction: 'asc' | 'desc'
  rules: string[]
  scoreableIds: string[]
  showScoreablesCount: boolean
  scoreablesCountName: string
}

const defaultValues: CategoryFormValues = {
  name: '',
  direction: 'asc',
  rules: [],
  scoreableIds: [],
  showScoreablesCount: false,
  scoreablesCountName: ''
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
  const [errors, setErrors] = useState<{ name?: string; scoreablesCountName?: string }>()

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (category) {
      setValues({
        name: category.name,
        direction: category.direction as 'asc' | 'desc',
        rules: category.rules ?? [],
        scoreableIds: category.scoreableIds ?? [],
        showScoreablesCount: Boolean(category.showScoreablesCount),
        scoreablesCountName: category.scoreablesCountName ?? ''
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

    const nextErrors: { name?: string; scoreablesCountName?: string } = {}
    const trimmedName = values.name.trim()
    if (!trimmedName) {
      nextErrors.name = 'Name is required'
    }
    const trimmedCountName = values.scoreablesCountName.trim()
    if (values.showScoreablesCount && !trimmedCountName) {
      nextErrors.scoreablesCountName = 'Column name is required'
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    await onSubmit({
      ...values,
      name: trimmedName,
      rules: values.rules.filter((rule) => rule.trim().length),
      scoreablesCountName: trimmedCountName
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
        <div className="flex flex-col gap-3 rounded-md border border-dashed border-muted-foreground/30 px-3 py-3">
          <label className="flex items-center gap-3 text-sm font-medium ro-text-main">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={values.showScoreablesCount}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  showScoreablesCount: event.target.checked
                }))
              }
            />
            Display scoreable count column
          </label>
          <p className="text-xs ro-text-muted">
            Adds a standings column showing how many scoreables each angler submitted for this
            category.
          </p>
          {values.showScoreablesCount ? (
            <Field
              label={<Label htmlFor="category-scoreables-count-name">Count Column Name</Label>}
              error={errors?.scoreablesCountName}
            >
              <Input
                id="category-scoreables-count-name"
                placeholder="e.g. Total Fish"
                value={values.scoreablesCountName}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    scoreablesCountName: event.target.value
                  }))
                }
              />
            </Field>
          ) : null}
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

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { z } from 'zod'
import type { Category } from '@core/tournaments/categories'
import type { Division } from '@core/tournaments/divisions'
import { Modal } from '../../../components/Modal'
import { Field } from '../../../components/ui/field'
import { Label } from '../../../components/ui/label'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'

export type DivisionCategorySelection = { categoryId: string; depth: number }
export type DivisionFormValues = { name: string; categories: DivisionCategorySelection[] }

type DivisionFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  division?: Division
  categories: Category[]
  submitting?: boolean
  onSubmit: (values: DivisionFormValues) => Promise<void>
  onClose: () => void
}

const formSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  categories: z.array(
    z.object({
      categoryId: z.string(),
      depth: z.number().int().min(1, 'Depth must be at least 1')
    })
  )
})

const DEFAULT_DEPTH = 10

export function DivisionFormModal({
  open,
  mode,
  division,
  categories,
  submitting = false,
  onSubmit,
  onClose
}: DivisionFormModalProps) {
  const [name, setName] = useState('')
  const [categoryState, setCategoryState] = useState<
    Record<string, { selected: boolean; depth: number }>
  >({})
  const [errors, setErrors] = useState<{ name?: string; categories?: Record<string, string> }>({})

  const buildDefaultCategoryState = useMemo(() => {
    const lookup = new Map(division?.categories.map((entry) => [entry.category.id, entry.depth]))
    return categories.reduce<Record<string, { selected: boolean; depth: number }>>(
      (acc, category) => {
        const depth = lookup.get(category.id)
        acc[category.id] = {
          selected: depth !== undefined,
          depth: depth ?? DEFAULT_DEPTH
        }
        return acc
      },
      {}
    )
  }, [categories, division])

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (division) {
      setName(division.name)
    } else {
      setName('')
    }
    setCategoryState(buildDefaultCategoryState)
  }, [open, division, buildDefaultCategoryState])

  const title = mode === 'create' ? 'Add Division' : 'Edit Division'
  const submitLabel = mode === 'create' ? 'Add Division' : 'Save Changes'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const selectedCategories = Object.entries(categoryState)
      .filter(([, state]) => state.selected)
      .map(([categoryId, state]) => ({ categoryId, depth: state.depth }))

    const validation = formSchema.safeParse({
      name,
      categories: selectedCategories
    })

    if (!validation.success) {
      const newErrors: { name?: string; categories?: Record<string, string> } = {}
      const categoryErrors: Record<string, string> = {}
      const indexToCategoryId = selectedCategories.map((entry) => entry.categoryId)

      for (const issue of validation.error.issues) {
        const [pathRoot, pathIndex] = issue.path
        if (pathRoot === 'name') {
          newErrors.name = issue.message
        } else if (pathRoot === 'categories' && typeof pathIndex === 'number') {
          const categoryId = indexToCategoryId[pathIndex]
          if (categoryId) {
            categoryErrors[categoryId] = issue.message
          }
        }
      }

      if (Object.keys(categoryErrors).length) {
        newErrors.categories = categoryErrors
      }

      setErrors(newErrors)
      return
    }

    setErrors({})
    await onSubmit(validation.data)
  }

  const toggleCategory = (categoryId: string) => {
    setCategoryState((prev) => {
      const next = prev[categoryId]
      const selected = next ? !next.selected : true
      const depth = next?.depth ?? DEFAULT_DEPTH
      return {
        ...prev,
        [categoryId]: { selected, depth }
      }
    })
    setErrors((prev) => {
      if (!prev.categories) return prev
      const rest = { ...prev.categories }
      delete rest[categoryId]
      return { ...prev, categories: rest }
    })
  }

  const updateDepth = (categoryId: string, depthValue: number) => {
    setCategoryState((prev) => ({
      ...prev,
      [categoryId]: {
        selected: prev[categoryId]?.selected ?? false,
        depth: Math.max(1, Math.floor(Number.isFinite(depthValue) ? depthValue : DEFAULT_DEPTH))
      }
    }))
    setErrors((prev) => {
      if (!prev.categories) return prev
      const rest = { ...prev.categories }
      delete rest[categoryId]
      return { ...prev, categories: rest }
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={title} contentClassName="w-[900px]">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <Field label={<Label htmlFor="division-name">Name</Label>} error={errors.name}>
          <Input
            id="division-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </Field>

        <div className="flex flex-col gap-2">
          <Label>Categories</Label>
          {categories.length ? (
            <div className="grid gap-3 grid-cols-2">
              {categories.map((category) => {
                const entry = categoryState[category.id] ?? {
                  selected: false,
                  depth: DEFAULT_DEPTH
                }
                return (
                  <div
                    key={category.id}
                    className="flex justify-between rounded border ro-border p-3"
                  >
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={entry.selected}
                        onChange={() => toggleCategory(category.id)}
                      />
                      <span>{category.name}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`depth-${category.id}`} className="text-xs">
                        Top
                      </Label>
                      <Input
                        id={`depth-${category.id}`}
                        type="number"
                        min={1}
                        className="h-8 max-w-20"
                        value={entry.depth}
                        disabled={!entry.selected}
                        onChange={(event) =>
                          updateDepth(category.id, Number.parseInt(event.target.value, 10))
                        }
                      />
                    </div>
                    {errors.categories?.[category.id] ? (
                      <span className="text-xs text-red-500">{errors.categories[category.id]}</span>
                    ) : null}
                  </div>
                )
              })}
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

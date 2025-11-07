import type { CategoryView } from '@core/tournaments/categories'
import { Modal } from '../../../components/Modal'
import { Field } from '../../../components/ui/field'
import { Label } from '../../../components/ui/label'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'
import { Pill } from '../../../components/ui/pill'

type CategoryDetailsModalProps = {
  open: boolean
  category?: CategoryView
  onClose: () => void
}

export function CategoryDetailsModal({ open, category, onClose }: CategoryDetailsModalProps) {
  if (!open || !category) return null

  const hasScoreables = category.scoreables.length > 0
  const hasRules = category.rules.length > 0

  return (
    <Modal open={open} onClose={onClose} title="Category Details">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={<Label>Name</Label>}>
            <Input value={category.name} readOnly />
          </Field>
          <Field label={<Label>Direction</Label>}>
            <Input
              value={
                category.direction === 'asc'
                  ? 'Ascending (lower is better)'
                  : 'Descending (higher is better)'
              }
              readOnly
            />
          </Field>
        </div>

        <Field label={<Label>Order</Label>}>
          <Input value={category.order} readOnly />
        </Field>

        <div className="flex flex-col gap-2">
          <Label>Scoreables</Label>
          {hasScoreables ? (
            <div className="flex flex-wrap gap-2">
              {category.scoreables.map((scoreable) => (
                <Pill key={scoreable.id} size="md">
                  {scoreable.label}
                </Pill>
              ))}
            </div>
          ) : (
            <p className="text-sm ro-text-muted">No scoreables assigned.</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Rules</Label>
          {hasRules ? (
            <div className="flex flex-wrap gap-2">
              {category.rules.map((rule, idx) => (
                <Pill key={`${rule}-${idx}`} size="sm" variant="muted">
                  {rule}
                </Pill>
              ))}
            </div>
          ) : (
            <p className="text-sm ro-text-muted">No specific rules provided.</p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="outline-muted" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}

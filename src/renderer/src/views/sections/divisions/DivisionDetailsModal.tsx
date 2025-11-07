import type { DivisionView } from '@core/tournaments/divisions'
import { Modal } from '../../../components/Modal'
import { Field } from '../../../components/ui/field'
import { Label } from '../../../components/ui/label'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'
import { Pill } from '../../../components/ui/pill'

type DivisionDetailsModalProps = {
  open: boolean
  division?: DivisionView
  onClose: () => void
}

export function DivisionDetailsModal({ open, division, onClose }: DivisionDetailsModalProps) {
  if (!open || !division) return null

  return (
    <Modal open={open} onClose={onClose} title="Division Details">
      <div className="flex flex-col gap-5">
        <Field label={<Label>Name</Label>}>
          <Input value={division.name} readOnly />
        </Field>

        <Field label={<Label>Order</Label>}>
          <Input value={division.order} readOnly />
        </Field>

        <div className="flex flex-col gap-2">
          <Label>Categories</Label>
          {division.categories.length ? (
            <div className="flex flex-wrap gap-2">
              {division.categories.map((entry) => (
                <Pill key={entry.category.id} size="md">
                  {entry.category.name}
                </Pill>
              ))}
            </div>
          ) : (
            <p className="text-sm ro-text-muted">No categories assigned.</p>
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

import type { ScoreableView } from '@core/tournaments/scoreables'
import { Modal } from '../../../components/Modal'
import { Field } from '../../../components/ui/field'
import { Label } from '../../../components/ui/label'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'

type ScoreableDetailsModalProps = {
  open: boolean
  scoreable?: ScoreableView
  onClose: () => void
}

export function ScoreableDetailsModal({ open, scoreable, onClose }: ScoreableDetailsModalProps) {
  if (!open || !scoreable) return null

  return (
    <Modal open={open} onClose={onClose} title="Scoreable Details">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={<Label>Label</Label>}>
            <Input value={scoreable.label} readOnly />
          </Field>
          <Field label={<Label>Unit</Label>}>
            <Input value={scoreable.unit} readOnly />
          </Field>
        </div>
        <Field label={<Label>Order</Label>}>
          <Input value={scoreable.order} readOnly />
        </Field>
        <Field label={<Label>Divisions</Label>}>
          <Input
            value={scoreable.divisions.length ? scoreable.divisions.join(', ') : '—'}
            readOnly
          />
        </Field>
        <div className="flex justify-end">
          <Button type="button" variant="outline-muted" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}

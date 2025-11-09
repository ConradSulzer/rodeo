import type { ScoreableView } from '@core/tournaments/scoreables'
import { Modal } from '../../../components/Modal'
import { Field } from '../../../components/ui/field'
import { Label } from '../../../components/ui/label'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'
import { Pill } from '../../../components/ui/pill'

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
        <div className="flex flex-col gap-2">
          <Label>Divisions</Label>
          {scoreable.divisions.length ? (
            <div className="flex flex-wrap gap-2">
              {scoreable.divisions.map((division) => (
                <Pill key={division} size="sm">
                  {division}
                </Pill>
              ))}
            </div>
          ) : (
            <p className="text-sm ro-text-muted">No divisions assigned.</p>
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

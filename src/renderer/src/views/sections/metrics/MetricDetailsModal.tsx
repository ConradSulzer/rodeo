import type { MetricView } from '@core/tournaments/metrics'
import { Modal } from '../../../components/Modal'
import { Field } from '../../../components/ui/field'
import { Label } from '../../../components/ui/label'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'
import { Pill } from '../../../components/ui/pill'

type MetricDetailsModalProps = {
  open: boolean
  metric?: MetricView
  onClose: () => void
}

export function MetricDetailsModal({ open, metric, onClose }: MetricDetailsModalProps) {
  if (!open || !metric) return null

  return (
    <Modal open={open} onClose={onClose} title="Metric Details">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={<Label>Label</Label>}>
            <Input value={metric.label} readOnly />
          </Field>
          <Field label={<Label>Unit</Label>}>
            <Input value={metric.unit} readOnly />
          </Field>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Divisions</Label>
          {metric.divisions.length ? (
            <div className="flex flex-wrap gap-2">
              {metric.divisions.map((division) => (
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

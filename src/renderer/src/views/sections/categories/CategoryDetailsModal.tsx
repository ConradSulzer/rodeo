import type { CategoryView } from '@core/tournaments/categories'
import { Modal } from '@renderer/components/Modal'
import { Field } from '@renderer/components/ui/field'
import { Label } from '@renderer/components/ui/label'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { Pill } from '@renderer/components/ui/pill'

type CategoryDetailsModalProps = {
  open: boolean
  category?: CategoryView
  onClose: () => void
}

export function CategoryDetailsModal({ open, category, onClose }: CategoryDetailsModalProps) {
  if (!open || !category) return null

  const hasMetrics = category.metrics.length > 0
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
              value={category.direction === 'asc' ? 'Lower Is Better' : 'Higher Is Better'}
              readOnly
            />
          </Field>
          <Field label={<Label>Metric Count Display</Label>}>
            <Input value={category.showMetricsCount ? 'Shown' : 'Hidden'} readOnly />
          </Field>
          {category.showMetricsCount ? (
            <Field label={<Label>Count Column Name</Label>}>
              <Input value={category.metricsCountName || ''} readOnly />
            </Field>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Metrics</Label>
          {hasMetrics ? (
            <div className="flex flex-wrap gap-2">
              {category.metrics.map((metric) => (
                <Pill key={metric.id} size="md">
                  {metric.label}
                </Pill>
              ))}
            </div>
          ) : (
            <p className="text-sm ro-text-muted">No metrics assigned.</p>
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
            <p className="text-sm ro-text-muted">No special rules.</p>
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

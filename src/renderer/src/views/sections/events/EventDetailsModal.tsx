import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/ui/button'
import type { EventRow } from './EventsSection'

type EventDetailsModalProps = {
  event: EventRow | null
  onClose: () => void
}

export function EventDetailsModal({ event, onClose }: EventDetailsModalProps) {
  if (!event) return null

  const rows: Array<[string, string]> = [
    ['Event ID', event.id],
    ['Timestamp', new Date(event.ts).toLocaleString()],
    ['Type', event.type],
    ['Player Name', event.playerName],
    ['Player ID', event.playerId],
    ['Scoreable', event.scoreableLabel ?? '—'],
    ['Scoreable ID', event.scoreableId ?? '—'],
    [
      'Value',
      event.type === 'ScorecardVoided'
        ? '—'
        : event.state === 'empty'
          ? 'Empty'
          : event.value !== undefined
            ? String(event.value)
            : '—'
    ],
    ['Prior Event', event.priorEventId ?? '—'],
    ['Note', event.note ?? '—']
  ]

  return (
    <Modal open title="Event Details" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="rounded-md border ro-border">
          <dl className="divide-y ro-dim-border text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-3 gap-4 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.3em] ro-text-muted">
                  {label}
                </dt>
                <dd className="col-span-2 break-all text-sm ro-text-main">{value}</dd>
              </div>
            ))}
          </dl>
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

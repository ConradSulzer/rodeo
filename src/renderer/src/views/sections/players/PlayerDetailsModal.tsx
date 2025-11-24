import type { Player } from '@core/players/players'
import { Modal } from '../../../components/Modal'
import { Field } from '../../../components/ui/field'
import { Label } from '../../../components/ui/label'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'

type PlayerDetailsModalProps = {
  open: boolean
  player?: Player
  onClose: () => void
}

function formatTimestamp(value?: number) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return '—'
  }
}

export function PlayerDetailsModal({ open, player, onClose }: PlayerDetailsModalProps) {
  if (!open || !player) return null

  return (
    <Modal open={open} onClose={onClose} title="Player Details">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={<Label>Display Name</Label>}>
            <Input value={player.displayName} readOnly />
          </Field>
          <Field label={<Label>Email</Label>}>
            <Input value={player.email} readOnly />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={<Label>First Name</Label>}>
            <Input value={player.firstName} readOnly />
          </Field>
          <Field label={<Label>Last Name</Label>}>
            <Input value={player.lastName} readOnly />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={<Label>Cell Phone</Label>}>
            <Input value={player.cellPhone ?? ''} placeholder="—" readOnly />
          </Field>
          <Field label={<Label>Emergency Contact</Label>}>
            <Input value={player.emergencyContact ?? ''} placeholder="—" readOnly />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={<Label>Created</Label>}>
            <Input value={formatTimestamp(player.createdAt)} readOnly />
          </Field>
          <Field label={<Label>Updated</Label>}>
            <Input value={formatTimestamp(player.updatedAt)} readOnly />
          </Field>
        </div>
        <Field label={<Label>Divisions</Label>}>
          <Input
            value={
              player.divisions.length ? player.divisions.map((division) => division.name).join(', ') : '—'
            }
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

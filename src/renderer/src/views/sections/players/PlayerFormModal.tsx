import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { Player } from '@core/players/players'
import type { Division } from '@core/tournaments/divisions'
import {
  buildPlayerDisplayName,
  playerFormSchema,
  type PlayerFormInput,
  type PlayerFormData
} from '@core/players/playerFormSchema'
import { Modal } from '@renderer/components/Modal'
import { Field } from '@renderer/components/ui/field'
import { Label } from '@renderer/components/ui/label'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'

export type PlayerFormValues = PlayerFormData

type PlayerFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  player?: Player & { divisionIds?: string[] }
  submitting?: boolean
  onSubmit: (values: PlayerFormValues & { divisionIds: string[] }) => Promise<void>
  divisions: Division[]
  onClose: () => void
}

type ValidationErrors = Partial<Record<keyof PlayerFormValues, string>>

const emptyForm: PlayerFormInput = {
  firstName: '',
  lastName: '',
  displayName: '',
  email: '',
  cellPhone: '',
  emergencyContact: ''
}

function toInitialValues(player?: Player): PlayerFormInput {
  if (!player) return emptyForm
  return {
    firstName: player.firstName ?? '',
    lastName: player.lastName ?? '',
    displayName: player.displayName ?? '',
    email: player.email ?? '',
    cellPhone: player.cellPhone ?? '',
    emergencyContact: player.emergencyContact ?? ''
  }
}

export function PlayerFormModal({
  open,
  mode,
  player,
  submitting = false,
  onSubmit,
  divisions,
  onClose
}: PlayerFormModalProps) {
  const [values, setValues] = useState<PlayerFormInput>(emptyForm)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [displayNameLocked, setDisplayNameLocked] = useState<boolean>(false)
  const [selectedDivisions, setSelectedDivisions] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    const nextValues = toInitialValues(player)
    setValues(nextValues)
    setErrors({})
    setDisplayNameLocked(Boolean(player?.displayName))
    setSelectedDivisions(new Set(player?.divisionIds ?? []))
  }, [open, player])

  const title = mode === 'create' ? 'Add Player' : 'Edit Player'
  const submitLabel = mode === 'create' ? 'Add Player' : 'Save Changes'

  const updateField = useCallback(
    (key: keyof PlayerFormInput, value: string) => {
      setValues((prev) => {
        const next = { ...prev, [key]: value }
        if ((key === 'firstName' || key === 'lastName') && !displayNameLocked) {
          next.displayName = buildPlayerDisplayName(
            key === 'firstName' ? value : next.firstName,
            key === 'lastName' ? value : next.lastName
          )
        }
        return next
      })
    },
    [displayNameLocked]
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const parsed = playerFormSchema.safeParse(values)
    if (!parsed.success) {
      const fieldErrors: ValidationErrors = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path[0]
        if (typeof path === 'string') {
          fieldErrors[path as keyof PlayerFormValues] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    const normalized = parsed.data
    setValues(normalized)
    setErrors({})
    await onSubmit({
      ...normalized,
      divisionIds: Array.from(selectedDivisions)
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label={<Label htmlFor="player-first-name">First Name</Label>}
            error={errors.firstName}
          >
            <Input
              id="player-first-name"
              value={values.firstName}
              onChange={(event) => updateField('firstName', event.target.value)}
              autoFocus
            />
          </Field>
          <Field
            label={<Label htmlFor="player-last-name">Last Name</Label>}
            error={errors.lastName}
          >
            <Input
              id="player-last-name"
              value={values.lastName}
              onChange={(event) => updateField('lastName', event.target.value)}
            />
          </Field>
        </div>
        <Field
          label={<Label htmlFor="player-display-name">Display Name</Label>}
          error={errors.displayName}
        >
          <Input
            id="player-display-name"
            value={values.displayName}
            onChange={(event) => {
              setDisplayNameLocked(true)
              updateField('displayName', event.target.value)
            }}
            placeholder="Name shown on leaderboards"
          />
        </Field>
        <Field
          label={<Label htmlFor="player-email">Email</Label>}
          error={errors.email}
          description="Used for notifications and contact purposes."
        >
          <Input
            id="player-email"
            type="email"
            value={values.email}
            onChange={(event) => updateField('email', event.target.value)}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label={<Label htmlFor="player-cellphone">Cell Phone</Label>}
            description="Optional"
            error={errors.cellPhone}
          >
            <Input
              id="player-cellphone"
              value={values.cellPhone}
              onChange={(event) => updateField('cellPhone', event.target.value)}
              placeholder="Optional"
            />
          </Field>
          <Field
            label={<Label htmlFor="player-emergency">Emergency Contact</Label>}
            description="Optional"
            error={errors.emergencyContact}
          >
            <Input
              id="player-emergency"
              value={values.emergencyContact}
              onChange={(event) => updateField('emergencyContact', event.target.value)}
              placeholder="Optional"
            />
          </Field>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Divisions</Label>
          {divisions.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {divisions.map((division) => {
                const checked = selectedDivisions.has(division.id)
                return (
                  <label key={division.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={checked}
                      onChange={(event) => {
                        setSelectedDivisions((prev) => {
                          const next = new Set(prev)
                          if (event.target.checked) {
                            next.add(division.id)
                          } else {
                            next.delete(division.id)
                          }
                          return next
                        })
                      }}
                    />
                    <span>{division.name}</span>
                  </label>
                )
              })}
            </div>
          ) : (
            <p className="text-xs ro-text-muted">No divisions available.</p>
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

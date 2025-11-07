import { useEffect, useMemo, useState } from 'react'
import type { Player } from '@core/players/players'
import type { Scoreable } from '@core/tournaments/scoreables'
import type { ItemResult } from '@core/tournaments/results'
import { Modal } from '../../../components/Modal'
import { Field } from '../../../components/ui/field'
import { Label } from '../../../components/ui/label'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'
import { Pill } from '../../../components/ui/pill'

export type ScoreEntry = {
  scoreableId: string
  scoreableName: string
  value?: number
  priorEventId?: string
  void?: boolean
}

type ScorePlayerModalProps = {
  open: boolean
  player?: Player
  scoreables: Scoreable[]
  existingResults?: Map<string, ItemResult>
  onSubmit: (entries: ScoreEntry[]) => Promise<void>
  submitting: boolean
  onClose: () => void
}

type FormErrors = Record<string, string | undefined>

export function ScorePlayerModal({
  open,
  player,
  scoreables,
  existingResults,
  onSubmit,
  submitting,
  onClose
}: ScorePlayerModalProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<FormErrors>({})
  const [voided, setVoided] = useState<Set<string>>(new Set())

  const hasRequirements = scoreables.length > 0

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (!scoreables.length) {
      setValues({})
      setVoided(new Set())
      return
    }
    const initial: Record<string, string> = {}
    for (const scoreable of scoreables) {
      const existing = existingResults?.get(scoreable.id)
      initial[scoreable.id] = existing ? String(existing.value) : ''
    }
    setValues(initial)
    setVoided(new Set())
  }, [open, scoreables, existingResults])

  const title = player ? `Score ${player.displayName}` : 'Score Player'

  const handleValueChange = (scoreableId: string, next: string) => {
    setVoided((prev) => {
      if (!prev.has(scoreableId)) return prev
      const copy = new Set(prev)
      copy.delete(scoreableId)
      return copy
    })
    setValues((prev) => ({ ...prev, [scoreableId]: next }))
  }

  const toggleVoid = (scoreableId: string, existing?: ItemResult) => {
    if (!existing) return
    setVoided((prev) => {
      const copy = new Set(prev)
      if (copy.has(scoreableId)) {
        copy.delete(scoreableId)
        setValues((current) => ({ ...current, [scoreableId]: String(existing.value) }))
      } else {
        copy.add(scoreableId)
        setValues((current) => ({ ...current, [scoreableId]: '' }))
      }
      return copy
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!player || !hasRequirements) return

    const nextErrors: FormErrors = {}
    const submissions: ScoreEntry[] = []

    for (const scoreable of scoreables) {
      const existing = existingResults?.get(scoreable.id)
      const isVoided = voided.has(scoreable.id)
      const raw = values[scoreable.id]?.trim()

      if (isVoided) {
        if (existing) {
          submissions.push({
            scoreableId: scoreable.id,
            scoreableName: scoreable.label,
            priorEventId: existing.srcEventId,
            void: true
          })
        }
        continue
      }

      if (!raw) {
        nextErrors[scoreable.id] = 'Required'
        continue
      }

      const parsed = Number(raw)
      if (!Number.isFinite(parsed)) {
        nextErrors[scoreable.id] = 'Must be a number'
        continue
      }

      if (existing) {
        if (parsed !== existing.value) {
          submissions.push({
            scoreableId: scoreable.id,
            scoreableName: scoreable.label,
            value: parsed,
            priorEventId: existing.srcEventId
          })
        }
      } else {
        submissions.push({
          scoreableId: scoreable.id,
          scoreableName: scoreable.label,
          value: parsed
        })
      }
    }

    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      return
    }

    if (!submissions.length) {
      onClose()
      return
    }

    await onSubmit(submissions)
  }

  const content = useMemo(() => {
    if (!scoreables.length) {
      return (
        <div className="rounded-md border border-dashed ro-border p-4 text-sm ro-text-muted">
          This player is not assigned to any scoreables to be scored.
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-4">
        {scoreables.map((scoreable) => {
          const existing = existingResults?.get(scoreable.id)
          const isVoided = voided.has(scoreable.id)
          return (
            <Field
              key={scoreable.id}
              label={<Label htmlFor={`score-${scoreable.id}`}>{scoreable.label}</Label>}
              error={errors[scoreable.id]}
              description={
                existing
                  ? isVoided
                    ? 'This score will be voided.'
                    : 'Clear the value or use Void to remove this score.'
                  : undefined
              }
            >
              <div className="flex items-center gap-3">
                <Input
                  id={`score-${scoreable.id}`}
                  type="number"
                  step="any"
                  value={values[scoreable.id] ?? ''}
                  onChange={(event) => handleValueChange(scoreable.id, event.target.value)}
                  disabled={isVoided}
                />
                {existing ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={isVoided ? 'positive' : 'outline'}
                    onClick={() => toggleVoid(scoreable.id, existing)}
                  >
                    {isVoided ? 'Restore' : 'Void'}
                  </Button>
                ) : null}
              </div>
            </Field>
          )
        })}
      </div>
    )
  }, [errors, existingResults, scoreables, values, voided])

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        {player ? (
          <div className="flex flex-wrap items-center gap-3 text-sm ro-text-muted">
            <Pill variant="muted" size="md">
              {player.displayName}
            </Pill>
            <span>{player.email}</span>
          </div>
        ) : null}
        {content}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline-muted"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            variant="positive"
            disabled={submitting || !hasRequirements}
          >
            {submitting ? 'Saving...' : 'Save Scores'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

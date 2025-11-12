import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { Player } from '@core/players/players'
import type { Scoreable } from '@core/tournaments/scoreables'
import type { ItemResult } from '@core/tournaments/results'
import { Modal } from '@renderer/components/Modal'
import { Field } from '@renderer/components/ui/field'
import { Label } from '@renderer/components/ui/label'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { Pill } from '@renderer/components/ui/pill'

export type ScoreEntry = {
  scoreableId: string
  state: 'value' | 'empty'
  value?: number
  priorEventId?: string
}

type ScorePlayerModalProps = {
  open: boolean
  player?: Player
  scoreables: Scoreable[]
  existingResults?: Map<string, ItemResult>
  onSubmit: (entries: ScoreEntry[]) => Promise<void>
  onVoidScorecard?: () => Promise<void>
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
  onVoidScorecard,
  submitting,
  onClose
}: ScorePlayerModalProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<FormErrors>({})
  const [empties, setEmpties] = useState<Set<string>>(new Set())
  const [voiding, setVoiding] = useState(false)

  const hasRequirements = scoreables.length > 0

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (!scoreables.length) {
      setValues({})
      setEmpties(new Set())
      return
    }
    const initialValues: Record<string, string> = {}
    const initialEmpties = new Set<string>()
    for (const scoreable of scoreables) {
      const existing = existingResults?.get(scoreable.id)
      if (existing?.status === 'value' && typeof existing.value === 'number') {
        initialValues[scoreable.id] = String(existing.value)
      } else {
        initialValues[scoreable.id] = ''
      }
      if (existing?.status === 'empty') {
        initialEmpties.add(scoreable.id)
      }
    }
    setValues(initialValues)
    setEmpties(initialEmpties)
  }, [open, scoreables, existingResults])

  const title = player ? `Score ${player.displayName}` : 'Score Player'

  const handleValueChange = (scoreableId: string, next: string) => {
    setEmpties((prev) => {
      if (!prev.has(scoreableId)) return prev
      const copy = new Set(prev)
      copy.delete(scoreableId)
      return copy
    })
    setValues((prev) => ({ ...prev, [scoreableId]: next }))
  }

  const toggleEmpty = (scoreableId: string) => {
    setEmpties((prev) => {
      const copy = new Set(prev)
      if (copy.has(scoreableId)) {
        copy.delete(scoreableId)
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
      const isEmpty = empties.has(scoreable.id)
      const raw = values[scoreable.id]?.trim()

      if (isEmpty) {
        submissions.push({
          scoreableId: scoreable.id,
          state: 'empty',
          priorEventId: existing?.srcEventId
        })
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

      if (!existing || existing.status !== 'value' || existing.value !== parsed) {
        submissions.push({
          scoreableId: scoreable.id,
          state: 'value',
          value: parsed,
          priorEventId: existing?.srcEventId
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
          const isEmpty = empties.has(scoreable.id)
          return (
            <Field
              key={scoreable.id}
              label={<Label htmlFor={`score-${scoreable.id}`}>{scoreable.label}</Label>}
              error={errors[scoreable.id]}
              description={
                existing
                  ? existing.status === 'empty'
                    ? 'Previously marked empty.'
                    : 'Update the value or mark empty.'
                  : undefined
              }
            >
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  id={`score-${scoreable.id}`}
                  type="number"
                  step="any"
                  value={values[scoreable.id] ?? ''}
                  onChange={(event) => handleValueChange(scoreable.id, event.target.value)}
                />
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] ro-text-muted">
                  <input
                    type="checkbox"
                    checked={isEmpty}
                    onChange={() => toggleEmpty(scoreable.id)}
                    className="h-4 w-4"
                  />
                  Empty
                </label>
              </div>
            </Field>
          )
        })}
      </div>
    )
  }, [errors, existingResults, scoreables, values, empties])

  const handleVoidScorecard = async () => {
    if (!onVoidScorecard || !player) return
    const confirmed = window.confirm(
      `Void all scores for ${player.displayName}? This cannot be undone.`
    )
    if (!confirmed) return
    try {
      setVoiding(true)
      await onVoidScorecard()
    } catch (error) {
      console.error('Failed to void scorecard', error)
      toast.error('Unable to void scorecard')
    } finally {
      setVoiding(false)
    }
  }

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          {onVoidScorecard ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleVoidScorecard}
              disabled={submitting || voiding}
            >
              {voiding ? 'Voiding...' : 'Void Scorecard'}
            </Button>
          ) : (
            <span />
          )}
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

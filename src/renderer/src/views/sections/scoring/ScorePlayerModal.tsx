import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { Player } from '@core/players/players'
import type { Scoreable } from '@core/tournaments/scoreables'
import type { ItemResult } from '@core/tournaments/results'
import type { ItemScoreEventInput } from '@core/events/events'
import { Modal } from '@renderer/components/Modal'
import { Field } from '@renderer/components/ui/field'
import { Label } from '@renderer/components/ui/label'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { Pill } from '@renderer/components/ui/pill'

export type SubmissionResult = {
  success: boolean
  errors: string[]
}

type ScorePlayerModalProps = {
  open: boolean
  player?: Player
  scoreables: Scoreable[]
  existingResults?: Map<string, ItemResult>
  onSubmit: (entries: ItemScoreEventInput[]) => Promise<SubmissionResult>
  onVoidScorecard?: () => Promise<void>
  submitting: boolean
  onClose: () => void
}

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
  const [empties, setEmpties] = useState<Set<string>>(new Set())
  const [submissionErrors, setSubmissionErrors] = useState<string[]>([])
  const [voiding, setVoiding] = useState(false)

  const hasRequirements = scoreables.length > 0

  useEffect(() => {
    if (!open) return
    setSubmissionErrors([])

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

    const submissions: ItemScoreEventInput[] = []

    for (const scoreable of scoreables) {
      const existing = existingResults?.get(scoreable.id)
      const isEmpty = empties.has(scoreable.id)
      const raw = values[scoreable.id]?.trim() ?? ''
      const parsed = raw === '' ? undefined : Number(raw)

      const base: Omit<ItemScoreEventInput, 'state' | 'value'> = {
        kind: 'item',
        playerId: player.id,
        scoreableId: scoreable.id,
        priorEventId: existing?.srcEventId,
        field: scoreable.label
      }

      if (isEmpty) {
        submissions.push({
          ...base,
          state: 'empty'
        })
        continue
      }

      if (!existing || existing.status !== 'value' || existing.value !== parsed) {
        submissions.push({
          ...base,
          state: 'value',
          value: parsed
        })
      }
    }

    if (!submissions.length) {
      onClose()
      return
    }

    setSubmissionErrors([])

    try {
      const result = await onSubmit(submissions)

      if (!result.success) {
        setSubmissionErrors(result.errors.length ? result.errors : ['Unable to save scores'])
      }
    } catch (error) {
      console.error('Failed to submit scores', error)

      setSubmissionErrors(['Unable to save scores'])
    }
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
      <div className="grid w-full gap-6 grid-cols-2">
        {scoreables.map((scoreable) => {
          const existing = existingResults?.get(scoreable.id)
          const isEmpty = empties.has(scoreable.id)
          return (
            <Field
              key={scoreable.id}
              label={<Label htmlFor={`score-${scoreable.id}`}>{scoreable.label}</Label>}
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
                  None
                </label>
              </div>
            </Field>
          )
        })}
      </div>
    )
  }, [existingResults, scoreables, values, empties])

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
    <Modal open={open} onClose={onClose}>
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        {player ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-sm ro-text-muted">
              <Pill variant="muted" size="md">
                {player.displayName}
              </Pill>
              <span>{player.email}</span>
            </div>
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
            ) : null}
          </div>
        ) : null}
        {submissionErrors.length ? (
          <div className="rounded-md border border-dashed ro-border ro-bg-dim p-3 text-sm ro-text-error">
            <div className="font-semibold">Unable to save scores</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {submissionErrors.map((message, index) => (
                <li key={`${message}-${index}`}>{message}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {content}
        <div className="flex flex-wrap items-center justify-end gap-3">
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

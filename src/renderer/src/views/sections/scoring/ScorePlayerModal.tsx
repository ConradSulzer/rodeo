import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Player } from '@core/players/players'
import type { Metric } from '@core/tournaments/metrics'
import type { ItemResult } from '@core/tournaments/results'
import type { ItemScoreEventInput } from '@core/events/events'
import { Modal } from '@renderer/components/Modal'
import { Field } from '@renderer/components/ui/field'
import { Label } from '@renderer/components/ui/label'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'

export type SubmissionResult = {
  success: boolean
  errors: string[]
}

type ScorePlayerModalProps = {
  open: boolean
  player?: Player
  metrics: Metric[]
  existingResults?: Map<string, ItemResult>
  onSubmit: (entries: ItemScoreEventInput[]) => Promise<SubmissionResult>
  onVoidScorecard?: () => Promise<void>
  submitting: boolean
  onClose: () => void
}

export function ScorePlayerModal({
  open,
  player,
  metrics,
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

  const hasRequirements = metrics.length > 0
  const canVoidScorecard = !!(onVoidScorecard && existingResults && existingResults.size > 0)

  useEffect(() => {
    if (!open) return
    setSubmissionErrors([])

    if (!metrics.length) {
      setValues({})
      setEmpties(new Set())
      return
    }

    const initialValues: Record<string, string> = {}
    const initialEmpties = new Set<string>()

    for (const metric of metrics) {
      const existing = existingResults?.get(metric.id)
      if (existing?.status === 'value' && typeof existing.value === 'number') {
        initialValues[metric.id] = String(existing.value)
      } else {
        initialValues[metric.id] = ''
      }
      if (existing?.status === 'empty') {
        initialEmpties.add(metric.id)
      }
    }

    setValues(initialValues)
    setEmpties(initialEmpties)
  }, [open, metrics, existingResults])

  const handleValueChange = (metricId: string, next: string) => {
    setEmpties((prev) => {
      if (!prev.has(metricId)) return prev
      const copy = new Set(prev)
      copy.delete(metricId)
      return copy
    })
    setValues((prev) => ({ ...prev, [metricId]: next }))
  }

  const toggleEmpty = (metricId: string) => {
    setEmpties((prev) => {
      const copy = new Set(prev)
      if (copy.has(metricId)) {
        copy.delete(metricId)
      } else {
        copy.add(metricId)
        setValues((current) => ({ ...current, [metricId]: '' }))
      }
      return copy
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!player || !hasRequirements) return

    setSubmissionErrors([])

    const submissions: ItemScoreEventInput[] = []

    for (const metric of metrics) {
      const existing = existingResults?.get(metric.id)
      const isEmpty = empties.has(metric.id)
      const raw = values[metric.id]?.trim() ?? ''
      const parsed = raw === '' ? undefined : Number(raw)

      const base: Omit<ItemScoreEventInput, 'state' | 'value'> = {
        kind: 'item',
        playerId: player.id,
        metricId: metric.id,
        priorEventId: existing?.srcEventId,
        field: metric.label
      }

      if (isEmpty) {
        if (existing?.status !== 'empty') {
          submissions.push({
            ...base,
            state: 'empty'
          })
        }
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

    const allEmpty = metrics.every((metric) => empties.has(metric.id))
    if (allEmpty) {
      setSubmissionErrors([
        'Scorecards cannot be completely empty. Please enter at least one score or void the scorecard.'
      ])
      return
    }

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

  const renderContent = () => {
    if (!metrics.length) {
      return (
        <div className="rounded-md border border-dashed ro-border p-4 text-sm ro-text-muted">
          This player is not assigned to any metrics to be scored.
        </div>
      )
    }

    return (
      <div className="grid gap-x-20 gap-y-8 grid-cols-2">
        {metrics.map((metric) => {
          const existing = existingResults?.get(metric.id)
          const isEmpty = empties.has(metric.id)
          return (
            <Field
              key={metric.id}
              label={<Label htmlFor={`score-${metric.id}`}>{metric.label}</Label>}
              description={
                existing
                  ? existing.status === 'empty'
                    ? 'Previously marked empty.'
                    : 'Update the value or mark empty.'
                  : undefined
              }
            >
              <div className="flex items-center gap-3">
                <Input
                  id={`score-${metric.id}`}
                  type="number"
                  step="any"
                  value={values[metric.id] ?? ''}
                  onChange={(event) => handleValueChange(metric.id, event.target.value)}
                />
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] ro-text-muted">
                  <input
                    type="checkbox"
                    checked={isEmpty}
                    onChange={() => toggleEmpty(metric.id)}
                    className="h-4 w-4"
                  />
                  <label>None</label>
                </div>
              </div>
            </Field>
          )
        })}
      </div>
    )
  }

  const handleVoidScorecard = async () => {
    if (!onVoidScorecard || !player || !existingResults || !existingResults.size) return
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
    <Modal open={open} onClose={onClose} contentClassName="max-w-150">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        {player ? (
          <div className="flex flex-col w-full justify-start gap-1 text-sm ro-text-muted">
            <p className="text-3xl ro-text-main">{player.displayName}</p>
            <span>{player.email}</span>
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
        {renderContent()}
        <div
          className={`flex items-center gap-3 mt-12 ${
            canVoidScorecard ? 'justify-between' : 'justify-end'
          }`}
        >
          {canVoidScorecard ? (
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
          <div className="flex gap-3">
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
        </div>
      </form>
    </Modal>
  )
}

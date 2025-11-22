import { z } from 'zod'
import { ulid, type ULID } from 'ulid'
import { getScoreable } from '@core/tournaments/scoreables'
import { cloneResults, type Results } from '@core/tournaments/results'
import { reduceEvent } from './eventReducer'
import { getEvent } from './events'
import type { EventId, RodeoEvent } from './events'
import type { AppDatabase } from '@core/db/db'

const formatFieldMessage = (field: string | undefined, message: string) =>
  field ? `${field}: ${message}` : message

const itemInputSchema = z
  .object({
    kind: z.literal('item'),
    playerId: z.string().min(1, 'Player required'),
    scoreableId: z.string().min(1, 'Scoreable required'),
    state: z.union([z.literal('value'), z.literal('empty')]),
    value: z.number().nullable().optional(),
    priorEventId: z.string().min(1).optional(),
    note: z.string().optional(),
    field: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.state === 'value' && (data.value === undefined || data.value === null)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Value is required or check the box for "NONE".',
        path: ['value']
      })
    }

    if (data.state === 'value' && data.value !== undefined && data.value !== null) {
      if (data.value !== Number(data.value.toFixed(3))) {
        ctx.addIssue({
          code: 'custom',
          message: 'Value can have at most three decimal places.',
          path: ['value']
        })
      }
    }
  })

const voidInputSchema = z.object({
  kind: z.literal('scorecard-void'),
  playerId: z.string().min(1, 'Player required'),
  note: z.string().optional()
})

const scoreEventSchema = z.union([itemInputSchema, voidInputSchema])

export type ItemScoreEventInput = z.infer<typeof itemInputSchema>
export type ScorecardVoidEventInput = z.infer<typeof voidInputSchema>
export type ScoreEventInput = ItemScoreEventInput | ScorecardVoidEventInput

type ValidationResult =
  | { success: true; events: RodeoEvent[] }
  | { success: false; errors: string[] }

/**
 * Takes in event form inputs, validates them again Zod, verifies their respective
 * scoreables exists where applicable, turns the inputs into RodeoEvents, simulates
 * applying them to a clone of current results and if all is successful, returns an
 * object with those events.
 */
export async function buildEventsFromInputs(
  db: AppDatabase,
  submissions: ScoreEventInput[],
  results: Results
): Promise<ValidationResult> {
  const errors: string[] = []
  const parsedInputs: ScoreEventInput[] = []

  for (const submission of submissions) {
    const submissionField =
      typeof submission === 'object' && submission && 'field' in submission
        ? (submission as { field?: unknown }).field
        : undefined
    const fieldLabel = typeof submissionField === 'string' ? submissionField : undefined

    const parsed = scoreEventSchema.safeParse(submission)

    if (!parsed.success) {
      errors.push(
        ...parsed.error.issues.map((issue) => formatFieldMessage(fieldLabel, issue.message))
      )
      continue
    }

    const data = parsed.data
    const parsedField = data.kind === 'item' ? data.field : undefined

    // Ensure the scoreable this event is for exists.
    if (data.kind === 'item') {
      const scoreable = getScoreable(db, data.scoreableId)

      if (!scoreable) {
        errors.push(formatFieldMessage(parsedField, `Scoreable not found for ${data.scoreableId}`))
        continue
      }
    }

    parsedInputs.push(data as ScoreEventInput)
  }

  if (errors.length) return { success: false, errors }

  const eventFieldMap = new Map<EventId, string | undefined>()

  const events: RodeoEvent[] = parsedInputs.map((input) => {
    if (input.kind === 'scorecard-void') {
      const event: RodeoEvent = {
        type: 'ScorecardVoided',
        id: ulid(),
        ts: Date.now(),
        playerId: input.playerId as ULID,
        note: input.note
      }
      return event
    }

    const event: RodeoEvent = {
      type: 'ItemStateChanged',
      id: ulid(),
      ts: Date.now(),
      playerId: input.playerId as ULID,
      scoreableId: input.scoreableId as ULID,
      state: input.state,
      value: input.state === 'value' ? (input.value as number) : undefined,
      priorEventId: input.priorEventId as EventId | undefined,
      note: input.note
    }

    eventFieldMap.set(event.id, input.field)

    return event
  })

  const simulation = cloneResults(results)
  const resolve = (id: EventId) => getEvent(db, id)

  for (const event of events) {
    const simErrors = reduceEvent(simulation, event, resolve)
    if (simErrors.length) {
      const fieldLabel = eventFieldMap.get(event.id)
      errors.push(...simErrors.map((err) => formatFieldMessage(fieldLabel, err.message)))
      break
    }
  }

  if (errors.length) {
    return { success: false, errors }
  }

  return { success: true, events }
}

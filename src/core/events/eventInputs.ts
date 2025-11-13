import { z } from 'zod'
import { ulid, type ULID } from 'ulid'
import { getScoreable } from '@core/tournaments/scoreables'
import { cloneResults, type Results } from '@core/tournaments/results'
import { reduceEvent } from './eventReducer'
import { getEvent } from './events'
import type { EventId, RodeoEvent } from './events'
import type { AppDatabase } from '@core/db/db'

const itemInputSchema = z
  .object({
    kind: z.literal('item'),
    playerId: z.string().min(1, 'Player required'),
    scoreableId: z.string().min(1, 'Scoreable required'),
    state: z.union([z.literal('value'), z.literal('empty')]),
    value: z.number().nullable().optional(),
    priorEventId: z.string().min(1).optional(),
    note: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.state === 'value' && (data.value === undefined || data.value === null)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Value required when state is value',
        path: ['value']
      })
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
    const parsed = scoreEventSchema.safeParse(submission)

    if (!parsed.success) {
      errors.push(...parsed.error.issues.map((issue) => issue.message))
      continue
    }

    const data = parsed.data

    // Ensure the scoreable this event is for exists.
    if (data.kind === 'item') {
      const scoreable = getScoreable(db, data.scoreableId)

      if (!scoreable) {
        errors.push(`Scoreable not found for ${data.scoreableId}`)
        continue
      }
    }

    parsedInputs.push(data as ScoreEventInput)
  }

  if (errors.length) return { success: false, errors }

  const events: RodeoEvent[] = parsedInputs.map((input) => {
    if (input.kind === 'scorecard-void') {
      return {
        type: 'ScorecardVoided',
        id: ulid(),
        ts: Date.now(),
        playerId: input.playerId as ULID,
        note: input.note
      }
    }

    return {
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
  })

  const simulation = cloneResults(results)
  const resolve = (id: EventId) => getEvent(db, id)

  for (const event of events) {
    const simErrors = reduceEvent(simulation, event, resolve)
    if (simErrors.length) {
      errors.push(...simErrors.map((err) => err.message))
      break
    }
  }

  if (errors.length) {
    return { success: false, errors }
  }

  return { success: true, events }
}

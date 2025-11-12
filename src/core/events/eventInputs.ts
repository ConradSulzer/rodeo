import { z } from 'zod'
import type { Timestamp } from '@core/types/Shared'
import { ulid } from 'ulid'
import { EventId, ItemStateChanged, RodeoEvent, ScorecardVoided } from './events'

export const itemStateSchema = z.enum(['value', 'empty'])
export type ItemState = z.infer<typeof itemStateSchema>

type IdGen = () => EventId
const defaultId: IdGen = () => ulid()

const baseItemFields = {
  kind: z.literal('item'),
  playerId: z.string().min(1),
  scoreableId: z.string().min(1),
  priorEventId: z.string().min(1).optional(),
  note: z.string().optional()
} as const

// key in on the 'state' field and require 'value' if 'state == value'
export const itemScoreEventAttrsSchema = z.discriminatedUnion('state', [
  z.object({
    ...baseItemFields,
    state: z.literal('value'),
    value: z.preprocess(
      // allow number or strings for value
      // convert empty strings to undefined because coerce() turns them into 0
      (raw) => {
        if (typeof raw === 'string' && raw.trim() === '') {
          return undefined
        }
        return raw
      },
      z.coerce.number({ error: 'Must be a number.' })
    )
  }),
  z.object({
    ...baseItemFields,
    state: z.literal('empty'),
    value: z.undefined().optional()
  })
])

export const scorecardVoidEventAttrsSchema = z.object({
  kind: z.literal('scorecard-void'),
  playerId: z.string().min(1),
  note: z.string().optional()
})

// union keyed on 'kind'
export const scoreEventAttrsSchema = z.discriminatedUnion('kind', [
  itemScoreEventAttrsSchema,
  scorecardVoidEventAttrsSchema
])

export type ItemScoreEventAttrs = z.infer<typeof itemScoreEventAttrsSchema>
export type ScorecardVoidEventAttrs = z.infer<typeof scorecardVoidEventAttrsSchema>
export type ScoreEventAttrs = z.infer<typeof scoreEventAttrsSchema>

//Build a RodeoEvent from our validated event attrs above
export function toDomainEvent(
  input: ScoreEventAttrs,
  ts: Timestamp,
  genId: IdGen = defaultId
): RodeoEvent {
  if (input.kind === 'scorecard-void') {
    const e: ScorecardVoided = {
      type: 'ScorecardVoided',
      id: genId(),
      ts,
      playerId: input.playerId,
      note: input.note
    }
    return e
  }

  // kind === 'item'
  const e: ItemStateChanged = {
    type: 'ItemStateChanged',
    id: genId(),
    ts,
    playerId: input.playerId,
    scoreableId: input.scoreableId,
    state: input.state,
    value: input.state === 'value' ? input.value : undefined,
    priorEventId: input.priorEventId,
    note: input.note
  }
  return e
}

export function toDomainEvents(
  inputs: ScoreEventAttrs[],
  ts: Timestamp,
  genId: IdGen = defaultId
): RodeoEvent[] {
  return inputs.map((i) => toDomainEvent(i, ts, genId))
}

import { describe, expect, it } from 'vitest'
import { ulid } from 'ulid'
import { applyBatch, applyEvent } from './eventReducer'
import { type ItemStateChanged, type RodeoEvent, type ScorecardVoided } from './events'
import type { Results } from '@core/tournaments/results'

const baseTs = Date.now()

const makeItemEvent = (overrides: Partial<ItemStateChanged> = {}): ItemStateChanged => ({
  type: 'ItemStateChanged',
  id: ulid(),
  ts: baseTs,
  playerId: ulid(),
  scoreableId: ulid(),
  state: 'value',
  value: 10,
  note: 'initial',
  ...overrides
})

describe('eventReducer', () => {
  it('creates a new item when scoring event applied', () => {
    const results: Results = new Map()
    const lookup = new Map<string, RodeoEvent>()

    const scored = makeItemEvent()

    const errors = applyEvent(results, scored, (id) => lookup.get(id))

    expect(errors).toHaveLength(0)
    const items = results.get(scored.playerId)
    expect(items).toBeDefined()
    expect(items?.get(scored.scoreableId)).toMatchObject({
      status: 'value',
      value: scored.value,
      srcEventId: scored.id,
      createdAt: scored.ts,
      updatedAt: scored.ts
    })
  })

  it('prevents duplicate scoring and emits error', () => {
    const results: Results = new Map()
    const lookup = new Map<string, RodeoEvent>()
    const scored = makeItemEvent()

    applyEvent(results, scored, (id) => lookup.get(id))

    const duplicate = { ...scored, id: ulid(), value: 15, ts: scored.ts + 1 }
    const errors = applyEvent(results, duplicate, (id) => lookup.get(id))

    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('already exists')
    const item = results.get(scored.playerId)?.get(scored.scoreableId)
    expect(item?.value).toBe(scored.value)
    expect(item?.srcEventId).toBe(scored.id)
  })

  it('updates an item on correction and supports subsequent void', () => {
    const results: Results = new Map()
    const lookup = new Map<string, RodeoEvent>()
    const scored = makeItemEvent()

    lookup.set(scored.id, scored)
    applyEvent(results, scored, (id) => lookup.get(id))

    const corrected: ItemStateChanged = {
      type: 'ItemStateChanged',
      id: ulid(),
      ts: scored.ts + 10,
      playerId: scored.playerId,
      scoreableId: scored.scoreableId,
      state: 'value',
      priorEventId: scored.id,
      value: 8,
      note: 'adjusted'
    }

    lookup.set(corrected.id, corrected)
    const correctionErrors = applyEvent(results, corrected, (id) => lookup.get(id))
    expect(correctionErrors).toHaveLength(0)

    const itemAfterCorrection = results.get(scored.playerId)?.get(scored.scoreableId)
    expect(itemAfterCorrection).toMatchObject({
      value: corrected.value,
      srcEventId: corrected.id,
      updatedAt: corrected.ts
    })

    const voided: ItemStateChanged = {
      type: 'ItemStateChanged',
      id: ulid(),
      ts: corrected.ts + 10,
      playerId: scored.playerId,
      scoreableId: scored.scoreableId,
      state: 'empty',
      priorEventId: corrected.id,
      note: 'bad data'
    }

    const voidErrors = applyEvent(results, voided, (id) => lookup.get(id))
    expect(voidErrors).toHaveLength(0)
    expect(results.get(scored.playerId)?.get(scored.scoreableId)?.status).toBe('empty')
  })

  it('rejects stale corrections and missing prior references', () => {
    const results: Results = new Map()
    const lookup = new Map<string, RodeoEvent>()
    const scored = makeItemEvent()
    lookup.set(scored.id, scored)
    applyEvent(results, scored, (id) => lookup.get(id))

    const staleCorrection: ItemStateChanged = {
      type: 'ItemStateChanged',
      id: ulid(),
      ts: scored.ts - 1,
      playerId: scored.playerId,
      scoreableId: scored.scoreableId,
      state: 'value',
      priorEventId: scored.id,
      value: 5
    }

    const staleErrors = applyEvent(results, staleCorrection, (id) => lookup.get(id))
    expect(staleErrors).toHaveLength(1)
    expect(staleErrors[0].message).toContain('older than the current result')

    const missingPrior: ItemStateChanged = {
      ...staleCorrection,
      ts: scored.ts + 5,
      priorEventId: ulid()
    }
    const missingErrors = applyEvent(results, missingPrior, () => undefined)
    expect(missingErrors).toHaveLength(1)
    expect(missingErrors[0].message).toContain('No prior event exists')
  })

  it('applyBatch sorts events before applying', () => {
    const results: Results = new Map()
    const lookup = new Map<string, RodeoEvent>()

    const scored = makeItemEvent({ ts: baseTs + 50 })
    const corrected: ItemStateChanged = {
      type: 'ItemStateChanged',
      id: ulid(),
      ts: baseTs + 60,
      playerId: scored.playerId,
      scoreableId: scored.scoreableId,
      state: 'value',
      priorEventId: scored.id,
      value: 9
    }
    const voided: ItemStateChanged = {
      type: 'ItemStateChanged',
      id: ulid(),
      ts: baseTs + 70,
      playerId: scored.playerId,
      scoreableId: scored.scoreableId,
      state: 'empty',
      priorEventId: corrected.id
    }

    lookup.set(scored.id, scored)
    lookup.set(corrected.id, corrected)
    lookup.set(voided.id, voided)

    const { errors } = applyBatch(results, [voided, scored, corrected], (id) => lookup.get(id))
    expect(errors.filter(Boolean)).toHaveLength(0)
    expect(results.get(scored.playerId)?.get(scored.scoreableId)?.status).toBe('empty')
  })

  it('voids entire scorecard', () => {
    const results: Results = new Map()
    const lookup = new Map<string, RodeoEvent>()

    const first = makeItemEvent()
    lookup.set(first.id, first)
    applyEvent(results, first, (id) => lookup.get(id))

    const second = makeItemEvent({
      playerId: first.playerId,
      scoreableId: ulid()
    })
    lookup.set(second.id, second)
    applyEvent(results, second, (id) => lookup.get(id))

    const voidEvent: ScorecardVoided = {
      type: 'ScorecardVoided',
      id: ulid(),
      ts: first.ts + 100,
      playerId: first.playerId
    }

    const errors = applyEvent(results, voidEvent, (id) => lookup.get(id))
    expect(errors).toHaveLength(0)
    expect(results.get(first.playerId)?.size).toBe(0)
  })
})

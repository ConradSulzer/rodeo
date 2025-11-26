import { describe, expect, it } from 'vitest'
import { ulid } from 'ulid'
import { reduceBatch, reduceEvent } from './eventReducer'
import { type ItemStateChanged, type RodeoEvent, type ScorecardVoided } from './events'
import type { Results } from '@core/tournaments/results'

const baseTs = Date.now()

const makeItemEvent = (overrides: Partial<ItemStateChanged> = {}): ItemStateChanged => ({
  type: 'ItemStateChanged',
  id: ulid(),
  ts: baseTs,
  playerId: ulid(),
  metricId: ulid(),
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

    const errors = reduceEvent(results, scored, (id) => lookup.get(id))

    expect(errors).toHaveLength(0)
    const playerResult = results.get(scored.playerId)
    const items = playerResult?.items
    expect(items).toBeDefined()
    expect(items?.get(scored.metricId)).toMatchObject({
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

    reduceEvent(results, scored, (id) => lookup.get(id))

    const duplicate = { ...scored, id: ulid(), value: 15, ts: scored.ts + 1 }
    const errors = reduceEvent(results, duplicate, (id) => lookup.get(id))

    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('already exists')
    const item = results.get(scored.playerId)?.items.get(scored.metricId)
    expect(item?.value).toBe(scored.value)
    expect(item?.srcEventId).toBe(scored.id)
  })

  it('updates an item on correction and supports subsequent void', () => {
    const results: Results = new Map()
    const lookup = new Map<string, RodeoEvent>()
    const scored = makeItemEvent()

    lookup.set(scored.id, scored)
    reduceEvent(results, scored, (id) => lookup.get(id))

    const corrected: ItemStateChanged = {
      type: 'ItemStateChanged',
      id: ulid(),
      ts: scored.ts + 10,
      playerId: scored.playerId,
      metricId: scored.metricId,
      state: 'value',
      priorEventId: scored.id,
      value: 8,
      note: 'adjusted'
    }

    lookup.set(corrected.id, corrected)
    const correctionErrors = reduceEvent(results, corrected, (id) => lookup.get(id))
    expect(correctionErrors).toHaveLength(0)

    const itemAfterCorrection = results.get(scored.playerId)?.items.get(scored.metricId)
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
      metricId: scored.metricId,
      state: 'empty',
      priorEventId: corrected.id,
      note: 'bad data'
    }

    const voidErrors = reduceEvent(results, voided, (id) => lookup.get(id))
    expect(voidErrors).toHaveLength(0)
    expect(results.get(scored.playerId)?.items.get(scored.metricId)?.status).toBe('empty')
  })

  it('rejects stale corrections and missing prior references', () => {
    const results: Results = new Map()
    const lookup = new Map<string, RodeoEvent>()
    const scored = makeItemEvent()
    lookup.set(scored.id, scored)
    reduceEvent(results, scored, (id) => lookup.get(id))

    const staleCorrection: ItemStateChanged = {
      type: 'ItemStateChanged',
      id: ulid(),
      ts: scored.ts - 1,
      playerId: scored.playerId,
      metricId: scored.metricId,
      state: 'value',
      priorEventId: scored.id,
      value: 5
    }

    const staleErrors = reduceEvent(results, staleCorrection, (id) => lookup.get(id))
    expect(staleErrors).toHaveLength(1)
    expect(staleErrors[0].message).toContain('older than the current result')

    const missingPrior: ItemStateChanged = {
      ...staleCorrection,
      ts: scored.ts + 5,
      priorEventId: ulid()
    }
    const missingErrors = reduceEvent(results, missingPrior, () => undefined)
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
      metricId: scored.metricId,
      state: 'value',
      priorEventId: scored.id,
      value: 9
    }
    const voided: ItemStateChanged = {
      type: 'ItemStateChanged',
      id: ulid(),
      ts: baseTs + 70,
      playerId: scored.playerId,
      metricId: scored.metricId,
      state: 'empty',
      priorEventId: corrected.id
    }

    lookup.set(scored.id, scored)
    lookup.set(corrected.id, corrected)
    lookup.set(voided.id, voided)

    const { errors } = reduceBatch(results, [voided, scored, corrected], (id) => lookup.get(id))
    expect(errors.filter(Boolean)).toHaveLength(0)
    expect(results.get(scored.playerId)?.items.get(scored.metricId)?.status).toBe('empty')
  })

  it('voids entire scorecard', () => {
    const results: Results = new Map()
    const lookup = new Map<string, RodeoEvent>()

    const first = makeItemEvent()
    lookup.set(first.id, first)
    reduceEvent(results, first, (id) => lookup.get(id))

    const second = makeItemEvent({
      playerId: first.playerId,
      metricId: ulid()
    })
    lookup.set(second.id, second)
    reduceEvent(results, second, (id) => lookup.get(id))

    const voidEvent: ScorecardVoided = {
      type: 'ScorecardVoided',
      id: ulid(),
      ts: first.ts + 100,
      playerId: first.playerId
    }

    const errors = reduceEvent(results, voidEvent, (id) => lookup.get(id))
    expect(errors).toHaveLength(0)
    expect(results.get(first.playerId)).toBeUndefined()
  })
})

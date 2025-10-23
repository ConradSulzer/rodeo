import { describe, test, expect } from 'vitest'
import type { Results } from '../types/Tournament'
import type { RodeoEvent, EventId } from '../types/events'
import { ulid } from 'ulid'
import { applyBatch } from './eventReducer'

const now = (n = 0) => (Date.now() + n) as unknown as number
const rid = () => ulid?.() ?? (Math.random() + '').slice(2)

function score({
  playerId,
  itemId,
  ts = now(),
  value = 10,
  name = 'Redfish'
}: {
  playerId: string
  itemId: string
  ts?: number
  value?: number
  name?: string
}): RodeoEvent {
  return { id: rid() as EventId, type: 'ItemMeasured', playerId, itemId, value, ts, itemName: name }
}

function correct(
  prior: RodeoEvent,
  { value, ts = now() }: { value: number; ts?: number }
): RodeoEvent {
  return {
    id: rid() as EventId,
    type: 'ItemCorrected',
    playerId: prior.playerId,
    itemId: prior.itemId,
    priorEventId: prior.id,
    value,
    ts,
    itemName: (prior as any).itemName
  }
}

function voided(prior: RodeoEvent, { ts = now() } = {}): RodeoEvent {
  return {
    id: rid() as EventId,
    type: 'ItemVoided',
    playerId: prior.playerId,
    itemId: prior.itemId,
    priorEventId: prior.id,
    ts,
    itemName: (prior as any).itemName
  }
}

const makeResolver = (all: Map<string, RodeoEvent>) => (id: EventId) =>
  all.get(id as unknown as string)

describe('applyBatch', () => {
  test('measure → correct → void happy path', () => {
    const results: Results = new Map()
    const all = new Map<string, RodeoEvent>()

    const m = score({ playerId: 'P1', itemId: 'I1', value: 5 })
    all.set(m.id as unknown as string, m)

    let { errors } = applyBatch(results, [m], (id) => makeResolver(all)(id))
    expect(errors).toHaveLength(0)
    expect(results.get('P1')?.get('I1')?.value).toBe(5)

    const c = correct(m, { value: 7 })
    all.set(c.id as unknown as string, c)
    ;({ errors } = applyBatch(results, [c], (id) => makeResolver(all)(id)))
    expect(errors).toHaveLength(0)
    expect(results.get('P1')?.get('I1')?.value).toBe(7)
    expect(results.get('P1')?.get('I1')?.srcEventId).toBe(c.id)

    const v = voided(c)
    all.set(v.id as unknown as string, v)
    ;({ errors } = applyBatch(results, [v], (id) => makeResolver(all)(id)))
    expect(errors).toHaveLength(0)
    expect(results.get('P1')?.get('I1')).toBeUndefined()
  })

  test('double measure produces error', () => {
    const results: Results = new Map()
    const all = new Map<string, RodeoEvent>()
    const m1 = score({ playerId: 'P1', itemId: 'I1', value: 10 })
    const m2 = score({ playerId: 'P1', itemId: 'I1', value: 11 })
    all.set(m1.id as any, m1)
    all.set(m2.id as any, m2)

    let r = applyBatch(results, [m1], (id) => makeResolver(all)(id))
    expect(r.errors).toHaveLength(0)

    r = applyBatch(results, [m2], (id) => makeResolver(all)(id))
    expect(r.errors).toHaveLength(1)
    expect(results.get('P1')?.get('I1')?.value).toBe(10) // unchanged
  })

  test('correction must target current srcEventId', () => {
    const results: Results = new Map()
    const all = new Map<string, RodeoEvent>()
    const m = score({ playerId: 'P1', itemId: 'I1', value: 10 })
    all.set(m.id as any, m)
    applyBatch(results, [m], (id) => makeResolver(all)(id))

    const c1 = correct(m, { value: 12 })
    all.set(c1.id as any, c1)
    applyBatch(results, [c1], (id) => makeResolver(all)(id))

    // concurrent correction attempting to correct the *original* (now stale)
    const c2 = correct(m, { value: 13 })
    all.set(c2.id as any, c2)
    const r = applyBatch(results, [c2], (id) => makeResolver(all)(id))
    expect(r.errors).toHaveLength(1)
    expect(results.get('P1')?.get('I1')?.value).toBe(12)
  })

  test('stale timestamp rejected', () => {
    const results: Results = new Map()
    const all = new Map<string, RodeoEvent>()
    const m = score({ playerId: 'P1', itemId: 'I1', value: 10, ts: now(1000) })
    all.set(m.id as any, m)
    applyBatch(results, [m], (id) => makeResolver(all)(id))

    const stale = correct(m, { value: 11, ts: now(-1000) })
    all.set(stale.id as any, stale)
    const r = applyBatch(results, [stale], (id) => makeResolver(all)(id))
    expect(r.errors).toHaveLength(1)
    expect(results.get('P1')?.get('I1')?.value).toBe(10)
  })

  test('idempotence: re-applying same event is a no-op', () => {
    const results: Results = new Map()
    const all = new Map<string, RodeoEvent>()
    const m = score({ playerId: 'P1', itemId: 'I1', value: 9 })
    all.set(m.id as any, m)

    let r = applyBatch(results, [m], (id) => makeResolver(all)(id))
    expect(r.errors).toHaveLength(0)
    r = applyBatch(results, [m], (id) => makeResolver(all)(id))
    expect(r.errors).toHaveLength(0)
    expect(results.get('P1')?.get('I1')?.value).toBe(9)
  })

  test('void with no current value yields an error', () => {
    const results: Results = new Map()
    const all = new Map<string, RodeoEvent>()
    const resolve = makeResolver(all)

    const m = score({ playerId: 'P1', itemId: 'I1', value: 10 })
    all.set(m.id as any, m)

    const v = voided(m)
    all.set(v.id as any, v)
    const r = applyBatch(results, [v], resolve)
    expect(r.errors).toHaveLength(1)
    expect(r.errors[0].message).toMatch(/no current .* exists to void/i)
  })
})

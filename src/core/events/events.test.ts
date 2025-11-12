import { describe, expect, it } from 'vitest'
import { ulid, type ULID } from 'ulid'
import { withInMemoryDb } from '@core/db/db'
import {
  appendEvent,
  appendEvents,
  getEvent,
  listAllEvents,
  listEventsForPlayer,
  listEventsForPlayerItem,
  sortEventsByTime,
  type ItemStateChanged,
  type ScorecardVoided
} from './events'
import { createPlayer, type NewPlayer } from '@core/players/players'
import { createScoreable, type NewScoreable } from '@core/tournaments/scoreables'

const baseTs = Date.now()

const makePlayerData = (suffix: string): NewPlayer => ({
  firstName: `First${suffix}`,
  lastName: `Last${suffix}`,
  displayName: `Player ${suffix}`,
  email: `player${suffix}@example.com`
})

const makeScoreableData = (suffix: string): NewScoreable => ({
  label: `Scoreable ${suffix}`,
  unit: `unit-${suffix}`
})

const makeItemEvent = (
  base: {
    playerId: ULID
    scoreableId: ULID
  },
  overrides: Partial<Omit<ItemStateChanged, 'type'>> = {}
): ItemStateChanged => ({
  type: 'ItemStateChanged',
  id: ulid(),
  ts: baseTs,
  playerId: base.playerId,
  scoreableId: base.scoreableId,
  state: 'value',
  value: 42,
  note: 'initial',
  ...overrides
})

describe('events data access', () => {
  it('persists and retrieves a scored event', () => {
    withInMemoryDb((db) => {
      const playerId = createPlayer(db, makePlayerData('A'))
      const scoreableId = createScoreable(db, makeScoreableData('A'))
      const event = makeItemEvent({ playerId, scoreableId })

      appendEvent(db, event)

      expect(getEvent(db, event.id)).toEqual(event)
    })
  })

  it('persists multiple event types and lists them chronologically', () => {
    withInMemoryDb((db) => {
      const playerId = createPlayer(db, makePlayerData('A'))
      const scoreableId = createScoreable(db, makeScoreableData('A'))
      const scored = makeItemEvent({ playerId, scoreableId }, { ts: baseTs + 10 })
      const corrected: ItemStateChanged = {
        type: 'ItemStateChanged',
        id: ulid(),
        ts: baseTs + 20,
        playerId,
        scoreableId,
        state: 'value',
        priorEventId: scored.id,
        value: 30
      }
      const voided: ItemStateChanged = {
        type: 'ItemStateChanged',
        id: ulid(),
        ts: baseTs + 30,
        playerId,
        scoreableId,
        state: 'empty',
        priorEventId: corrected.id,
        note: 'duplicate entry'
      }

      appendEvents(db, [scored, corrected, voided])

      expect(listAllEvents(db)).toEqual([scored, corrected, voided])
    })
  })

  it('filters events by player and player/item combo', () => {
    withInMemoryDb((db) => {
      const playerA = createPlayer(db, makePlayerData('A'))
      const playerB = createPlayer(db, makePlayerData('B'))
      const scoreableA = createScoreable(db, makeScoreableData('A'))
      const scoreableB = createScoreable(db, makeScoreableData('B'))

      const scoredA = makeItemEvent(
        { playerId: playerA, scoreableId: scoreableA },
        { ts: baseTs + 1 }
      )
      const correctedA: ItemStateChanged = {
        type: 'ItemStateChanged',
        id: ulid(),
        ts: baseTs + 2,
        playerId: playerA,
        scoreableId: scoreableA,
        state: 'value',
        priorEventId: scoredA.id,
        value: 25
      }
      const scoredOtherItem = makeItemEvent(
        { playerId: playerA, scoreableId: scoreableB },
        { ts: baseTs + 3, value: 90 }
      )
      const scoredOtherPlayer = makeItemEvent(
        { playerId: playerB, scoreableId: scoreableA },
        { ts: baseTs + 4, note: undefined }
      )

      appendEvents(db, [scoredA, correctedA, scoredOtherItem, scoredOtherPlayer])

      expect(listEventsForPlayerItem(db, playerA, scoreableA)).toEqual([scoredA, correctedA])
      expect(listEventsForPlayer(db, playerA)).toEqual([scoredA, correctedA, scoredOtherItem])
    })
  })

  it('sorts events by timestamp then id', () => {
    const playerId = ulid()
    const scoreableId = ulid()
    const e1 = makeItemEvent(
      { playerId, scoreableId },
      { id: '00000000000000000000000001' as ULID, ts: 100 }
    )
    const e2 = makeItemEvent(
      { playerId, scoreableId },
      { id: '00000000000000000000000002' as ULID, ts: 90 }
    )
    const e3 = makeItemEvent(
      { playerId, scoreableId },
      { id: '00000000000000000000000003' as ULID, ts: 100 }
    )

    const sorted = sortEventsByTime([e1, e2, e3])
    expect(sorted.map((e) => e.id)).toEqual([
      '00000000000000000000000002',
      '00000000000000000000000001',
      '00000000000000000000000003'
    ])
  })
  it('records scorecard void events', () => {
    withInMemoryDb((db) => {
      const playerId = createPlayer(db, makePlayerData('A'))
      const scoreableId = createScoreable(db, makeScoreableData('A'))
      const scored = makeItemEvent({ playerId, scoreableId })
      appendEvent(db, scored)

      const voidEvent: ScorecardVoided = {
        type: 'ScorecardVoided',
        id: ulid(),
        ts: baseTs + 100,
        playerId,
        note: 'Wrong angler'
      }

      appendEvent(db, voidEvent)

      const events = listAllEvents(db)
      expect(events).toHaveLength(2)
      expect(events[1]).toEqual(voidEvent)
    })
  })
})

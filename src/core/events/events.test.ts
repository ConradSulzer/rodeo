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
  type ItemCorrected,
  type ItemScored,
  type ItemVoided
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

const makeScored = (
  base: {
    playerId: ULID
    scoreableId: ULID
    scoreableName?: string
  },
  overrides: Partial<Omit<ItemScored, 'type'>> = {}
): ItemScored => ({
  type: 'ItemScored',
  id: ulid(),
  ts: baseTs,
  playerId: base.playerId,
  scoreableId: base.scoreableId,
  scoreableName: base.scoreableName ?? 'Scoreable',
  value: 42,
  note: 'initial',
  ...overrides
})

describe('events data access', () => {
  it('persists and retrieves a scored event', () => {
    withInMemoryDb((db) => {
      const playerId = createPlayer(db, makePlayerData('A'))
      const scoreableId = createScoreable(db, makeScoreableData('A'))
      const event = makeScored({ playerId, scoreableId, scoreableName: 'Speed' })

      appendEvent(db, event)

      expect(getEvent(db, event.id)).toEqual(event)
    })
  })

  it('persists multiple event types and lists them chronologically', () => {
    withInMemoryDb((db) => {
      const playerId = createPlayer(db, makePlayerData('A'))
      const scoreableId = createScoreable(db, makeScoreableData('A'))
      const scored = makeScored(
        { playerId, scoreableId, scoreableName: 'Time' },
        { ts: baseTs + 10 }
      )
      const corrected: ItemCorrected = {
        type: 'ItemCorrected',
        id: ulid(),
        ts: baseTs + 20,
        playerId,
        scoreableId,
        scoreableName: 'Time',
        priorEventId: scored.id,
        value: 30
      }
      const voided: ItemVoided = {
        type: 'ItemVoided',
        id: ulid(),
        ts: baseTs + 30,
        playerId,
        scoreableId,
        scoreableName: 'Time',
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

      const scoredA = makeScored(
        { playerId: playerA, scoreableId: scoreableA, scoreableName: 'Time' },
        { ts: baseTs + 1 }
      )
      const correctedA: ItemCorrected = {
        type: 'ItemCorrected',
        id: ulid(),
        ts: baseTs + 2,
        playerId: playerA,
        scoreableId: scoreableA,
        scoreableName: 'Time',
        priorEventId: scoredA.id,
        value: 25
      }
      const scoredOtherItem = makeScored(
        { playerId: playerA, scoreableId: scoreableB, scoreableName: 'Points' },
        { ts: baseTs + 3, value: 90 }
      )
      const scoredOtherPlayer = makeScored(
        { playerId: playerB, scoreableId: scoreableA, scoreableName: 'Time' },
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
    const e1 = makeScored(
      { playerId, scoreableId },
      { id: '00000000000000000000000001' as ULID, ts: 100 }
    )
    const e2 = makeScored(
      { playerId, scoreableId },
      { id: '00000000000000000000000002' as ULID, ts: 90 }
    )
    const e3 = makeScored(
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
})

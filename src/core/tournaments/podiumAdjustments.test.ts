import { describe, expect, it } from 'vitest'
import type { DivisionStanding } from './standings'
import {
  applyPodiumEventToAdjustments,
  createEmptyPodiumAdjustments,
  derivePodiumStandings,
  deserializePodiumAdjustments,
  serializePodiumAdjustments
} from './podiumAdjustments'
import type { PodiumEvent } from './podiumEvents'

const sampleStandings: DivisionStanding[] = [
  {
    divisionId: 'division-1',
    categories: [
      {
        categoryId: 'cat-1',
        depth: 2,
        direction: 'desc',
        entries: [
          {
            playerId: 'player-1',
            player: { id: 'player-1', displayName: 'Player 1', email: '' },
            itemCount: 2,
            total: 10,
            score: 10,
            rank: 1,
            ts: 1
          },
          {
            playerId: 'player-2',
            player: { id: 'player-2', displayName: 'Player 2', email: '' },
            itemCount: 2,
            total: 9,
            score: 9,
            rank: 2,
            ts: 2
          },
          {
            playerId: 'player-3',
            player: { id: 'player-3', displayName: 'Player 3', email: '' },
            itemCount: 2,
            total: 8,
            score: 8,
            rank: 3,
            ts: 3
          }
        ]
      }
    ]
  }
]

describe('podium adjustments', () => {
  it('serializes and deserializes adjustments', () => {
    const adjustments = createEmptyPodiumAdjustments()
    const removeEvent: PodiumEvent = {
      id: 'evt-1' as const,
      ts: Date.now(),
      type: 'podium:remove-player',
      divisionId: 'division-1',
      categoryId: 'cat-1',
      playerId: 'player-2'
    }

    applyPodiumEventToAdjustments(adjustments, removeEvent)

    const serialized = serializePodiumAdjustments(adjustments)
    expect(serialized).toEqual({
      removed: {
        'division-1': {
          'cat-1': ['player-2']
        }
      }
    })

    const deserialized = deserializePodiumAdjustments(serialized)
    expect(Array.from(deserialized.removed.get('division-1')?.get('cat-1') ?? [])).toEqual([
      'player-2'
    ])
  })

  it('derives podium standings by removing players, re-ranking, and truncating depth', () => {
    const adjustments = createEmptyPodiumAdjustments()
    const removeEvent: PodiumEvent = {
      id: 'evt-1' as const,
      ts: Date.now(),
      type: 'podium:remove-player',
      divisionId: 'division-1',
      categoryId: 'cat-1',
      playerId: 'player-1'
    }
    applyPodiumEventToAdjustments(adjustments, removeEvent)

    const derived = derivePodiumStandings(sampleStandings, adjustments, 10)
    const category = derived[0]?.categories[0]
    expect(category?.entries).toHaveLength(2)
    expect(category?.entries[0]?.playerId).toBe('player-2')
    expect(category?.entries[0]?.rank).toBe(1)
    expect(category?.entries[1]?.playerId).toBe('player-3')
    expect(category?.entries[1]?.rank).toBe(2)
  })
})

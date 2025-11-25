import { describe, expect, it, vi, afterEach } from 'vitest'
import type { AppDatabase } from '@core/db/db'
import type { ItemResult, Results } from '@core/tournaments/results'
import type { Division } from '@core/tournaments/divisions'
import type { DivisionStanding } from '@core/tournaments/standings'
import type { ItemStateChanged } from '@core/events/events'
import * as eventsModule from '@core/events/events'
import * as reducerModule from '@core/events/eventReducer'
import * as resultsModule from '@core/tournaments/results'
import * as divisionsModule from '@core/tournaments/divisions'
import * as standingsModule from '@core/tournaments/standings'
import {
  withStandingsRefresh,
  hydrate,
  clear,
  subscribe,
  getState,
  getSerializableState,
  refreshStandings,
  applyEvent
} from './tournamentStore'

const db = {} as AppDatabase

const sampleItem: ItemResult = {
  status: 'value',
  value: 10,
  srcEventId: 'event-1',
  createdAt: 1,
  updatedAt: 1
}

const sampleResults = (): Results => new Map([['player-1', new Map([['metric-1', sampleItem]])]])

const sampleDivisionViews = (): Division[] => [
  {
    id: 'division-1',
    name: 'Division 1',
    order: 0,
    createdAt: 1,
    updatedAt: 1,
    categories: [],
    eligiblePlayerIds: []
  }
]

const sampleStandings = (): DivisionStanding[] => [
  {
    divisionId: 'division-1',
    categories: []
  }
]

const activeSubscriptions: Array<() => void> = []

afterEach(() => {
  activeSubscriptions.splice(0).forEach((unsubscribe) => unsubscribe())
  clear()
  vi.restoreAllMocks()
})

describe('withStandingsRefresh helper', () => {
  it('refreshes standings when mutator returns a truthy value', () => {
    const mutator = vi.fn(() => 'new-id')
    const refreshSpy = vi.fn()

    const result = withStandingsRefresh(db, mutator, undefined, refreshSpy)

    expect(result).toBe('new-id')
    expect(mutator).toHaveBeenCalledTimes(1)
    expect(refreshSpy).toHaveBeenCalledWith(db)
  })

  it('skips refresh when mutator returns a falsy value', () => {
    const mutator = vi.fn(() => false)
    const refreshSpy = vi.fn()

    const result = withStandingsRefresh(db, mutator, undefined, refreshSpy)

    expect(result).toBe(false)
    expect(mutator).toHaveBeenCalledTimes(1)
    expect(refreshSpy).not.toHaveBeenCalled()
  })

  it('uses custom predicate when provided', () => {
    const mutator = vi.fn(() => ({ changed: false, value: 1 }))
    const refreshSpy = vi.fn()

    const result = withStandingsRefresh(db, mutator, (res) => res.changed, refreshSpy)

    expect(result).toEqual({ changed: false, value: 1 })
    expect(mutator).toHaveBeenCalledTimes(1)
    expect(refreshSpy).not.toHaveBeenCalled()

    const secondMutator = vi.fn(() => ({ changed: true, value: 2 }))
    const refreshSpyTwo = vi.fn()

    const secondResult = withStandingsRefresh(
      db,
      secondMutator,
      (res) => res.changed,
      refreshSpyTwo
    )

    expect(secondResult).toEqual({ changed: true, value: 2 })
    expect(secondMutator).toHaveBeenCalledTimes(1)
    expect(refreshSpyTwo).toHaveBeenCalledWith(db)
  })
})

describe('hydrate', () => {
  it('stores results, computes standings and notifies listeners', () => {
    const results = sampleResults()
    const divisions = sampleDivisionViews()
    const standings = sampleStandings()
    const buildSpy = vi.spyOn(resultsModule, 'buildResults').mockReturnValue({
      results,
      errors: []
    })
    const listSpy = vi.spyOn(divisionsModule, 'listDivisions').mockReturnValue(divisions)
    const standingsSpy = vi
      .spyOn(standingsModule, 'computeAllDivisionStandings')
      .mockReturnValue(standings)

    const listener = vi.fn()
    activeSubscriptions.push(subscribe(listener))
    listener.mockClear()

    const snapshot = hydrate(db)

    expect(buildSpy).toHaveBeenCalledWith(db)
    expect(listSpy).toHaveBeenCalledWith(db)
    expect(standingsSpy).toHaveBeenCalledWith(results, divisions)
    expect(snapshot).toEqual({
      standings,
      results: [
        {
          playerId: 'player-1',
          items: [
            {
              metricId: 'metric-1',
              result: sampleItem
            }
          ]
        }
      ]
    })
    expect(getState().standings).toEqual(standings)
    expect(getSerializableState()).toEqual(snapshot)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenLastCalledWith(snapshot)
  })
})

describe('clear', () => {
  it('resets state and notifies listeners with empty payload', () => {
    vi.spyOn(resultsModule, 'buildResults').mockReturnValue({
      results: sampleResults(),
      errors: []
    })
    vi.spyOn(divisionsModule, 'listDivisions').mockReturnValue(sampleDivisionViews())
    vi.spyOn(standingsModule, 'computeAllDivisionStandings').mockReturnValue(sampleStandings())

    const listener = vi.fn()
    activeSubscriptions.push(subscribe(listener))
    listener.mockClear()

    hydrate(db)
    listener.mockClear()

    clear()

    expect(Array.from(getState().results.entries())).toEqual([])
    expect(getState().standings).toEqual([])
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenLastCalledWith({ standings: [], results: [] })
  })
})

describe('refreshStandings', () => {
  it('recomputes standings and notifies subscribers', () => {
    const results = sampleResults()
    const initialViews = sampleDivisionViews()
    const initialStandings = sampleStandings()

    const buildSpy = vi.spyOn(resultsModule, 'buildResults').mockReturnValue({
      results,
      errors: []
    })
    const listSpy = vi.spyOn(divisionsModule, 'listDivisions').mockReturnValue(initialViews)
    const standingsSpy = vi
      .spyOn(standingsModule, 'computeAllDivisionStandings')
      .mockReturnValue(initialStandings)

    const listener = vi.fn()
    activeSubscriptions.push(subscribe(listener))
    listener.mockClear()

    hydrate(db)

    const updatedViews: Division[] = [
      {
        id: 'division-2',
        name: 'Division 2',
        order: 1,
        createdAt: 2,
        updatedAt: 2,
        categories: [],
        eligiblePlayerIds: ['player-1']
      }
    ]
    const updatedStandings: DivisionStanding[] = [
      {
        divisionId: 'division-2',
        categories: []
      }
    ]

    listSpy.mockReturnValueOnce(updatedViews)
    standingsSpy.mockReturnValueOnce(updatedStandings)
    listener.mockClear()

    refreshStandings(db)

    expect(buildSpy).toHaveBeenCalledTimes(1) // only during hydrate
    expect(listSpy).toHaveBeenCalledTimes(2)
    expect(listSpy).toHaveBeenLastCalledWith(db)
    expect(standingsSpy).toHaveBeenCalledTimes(2)
    expect(standingsSpy).toHaveBeenLastCalledWith(results, updatedViews)

    const snapshot = getSerializableState()
    expect(snapshot.standings).toEqual(updatedStandings)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenLastCalledWith(snapshot)
  })
})

describe('applyEvent', () => {
  const baseEvent: ItemStateChanged = {
    type: 'ItemStateChanged',
    id: 'event-1',
    ts: Date.now(),
    playerId: 'player-1',
    metricId: 'metric-1',
    state: 'value',
    value: 12
  }

  const setup = () => {
    const results = sampleResults()
    const divisions = sampleDivisionViews()
    const standings = sampleStandings()

    const buildSpy = vi.spyOn(resultsModule, 'buildResults').mockReturnValue({
      results,
      errors: []
    })
    const listSpy = vi.spyOn(divisionsModule, 'listDivisions').mockReturnValue(divisions)
    const standingsSpy = vi
      .spyOn(standingsModule, 'computeAllDivisionStandings')
      .mockReturnValue(standings)

    hydrate(db)

    return { results, divisions, standings, buildSpy, listSpy, standingsSpy }
  }

  it('records event, refreshes standings, and returns empty errors array on success', () => {
    const { results, listSpy, standingsSpy } = setup()
    listSpy.mockClear()
    standingsSpy.mockClear()
    const appendSpy = vi.spyOn(eventsModule, 'appendEvent').mockImplementation(() => {})
    const reduceSpy = vi.spyOn(reducerModule, 'reduceEvent').mockReturnValue([])

    const errors = applyEvent(db, baseEvent)

    expect(appendSpy).toHaveBeenCalledWith(db, baseEvent)
    expect(reduceSpy).toHaveBeenCalledTimes(1)
    const [passedResults, passedEvent] = reduceSpy.mock.calls[0]
    expect(passedResults).toBe(results)
    expect(passedEvent).toBe(baseEvent)
    expect(listSpy).toHaveBeenCalledTimes(1)
    expect(listSpy).toHaveBeenLastCalledWith(db)
    expect(standingsSpy).toHaveBeenCalledTimes(1)
    expect(errors).toEqual([])
  })

  it('returns reducer errors and skips refresh', () => {
    const { listSpy, standingsSpy } = setup()
    listSpy.mockClear()
    standingsSpy.mockClear()
    const expectedError: ReturnType<typeof reducerModule.reduceEvent>[number] = {
      status: 'error',
      message: 'bad event',
      event: baseEvent
    }
    vi.spyOn(eventsModule, 'appendEvent').mockImplementation(() => {})
    vi.spyOn(reducerModule, 'reduceEvent').mockReturnValue([expectedError])

    const errors = applyEvent(db, baseEvent)

    expect(listSpy).not.toHaveBeenCalled()
    expect(standingsSpy).not.toHaveBeenCalled()
    expect(errors).toEqual([expectedError])
  })
})

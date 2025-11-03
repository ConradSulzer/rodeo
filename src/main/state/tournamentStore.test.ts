import { describe, expect, it, vi } from 'vitest'
import type { AppDatabase } from '@core/db/db'
import { withStandingsRefresh } from './tournamentStore'

const db = {} as AppDatabase

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

  it('uses custom shouldRefresh when provided', () => {
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

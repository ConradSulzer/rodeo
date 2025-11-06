import { useCallback, useMemo, useState } from 'react'
import { universalSearchSort } from '@core/sort/universalSearchSort'

export type SortDirection = 'asc' | 'desc'
export type SortState<T extends Record<string, unknown>> = {
  key: keyof T & string
  direction: SortDirection
}

type UseUniversalSearchSortOptions<T extends Record<string, unknown>> = {
  items: readonly T[]
  searchKeys?: Array<keyof T & string>
  initialSort: SortState<T>
  initialQuery?: string
  limit?: number
  threshold?: number
}

type UseUniversalSearchSortReturn<T extends Record<string, unknown>> = {
  results: T[]
  query: string
  setQuery: (value: string) => void
  clearQuery: () => void
  sort: SortState<T>
  setSort: (next: SortState<T> | ((prev: SortState<T>) => SortState<T>)) => void
  toggleSort: (key: keyof T & string) => void
}

export function useUniversalSearchSort<T extends Record<string, unknown>>({
  items,
  searchKeys = [],
  initialSort,
  initialQuery = '',
  limit,
  threshold
}: UseUniversalSearchSortOptions<T>): UseUniversalSearchSortReturn<T> {
  const [query, setQuery] = useState(initialQuery)
  const [sort, setSortState] = useState<SortState<T>>(initialSort)

  const trimmedQuery = query.trim()

  const results = useMemo(
    () =>
      universalSearchSort<T>({
        items,
        sortKey: sort.key,
        direction: sort.direction,
        query: trimmedQuery,
        searchKeys,
        limit,
        threshold
      }),
    [items, sort, trimmedQuery, searchKeys, limit, threshold]
  )

  const toggleSort = useCallback((key: keyof T & string) => {
    setSortState((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        }
      }

      return {
        key,
        direction: 'asc'
      }
    })
  }, [])

  const clearQuery = useCallback(() => setQuery(''), [])

  return {
    results,
    query,
    setQuery,
    clearQuery,
    sort,
    setSort: (next) =>
      setSortState((prev) =>
        typeof next === 'function' ? (next as (p: SortState<T>) => SortState<T>)(prev) : next
      ),
    toggleSort
  }
}

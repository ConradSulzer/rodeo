import fuzzysort from 'fuzzysort'

type SortablePrimitive = string | number | Date | null | undefined

export type UniversalSortOptions<T> = {
  items: readonly T[]
  sortKey?: keyof T
  direction?: 'asc' | 'desc'
  query?: string
  searchKeys?: (keyof T & string)[]
  limit?: number
  threshold?: number
}

export const defaultSearchSort = {
  items: [],
  sortKey: '',
  direction: 'asc',
  query: '',
  searchKeys: []
}

function compare(a: SortablePrimitive, b: SortablePrimitive): number {
  const aEmpty = a === null || a === undefined || a === ''
  const bEmpty = b === null || b === undefined || b === ''
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1

  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()

  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true })
}

export function universalSearchSort<T>(opts: UniversalSortOptions<T>): T[] {
  const { items, sortKey, direction = 'asc', query, searchKeys, limit, threshold = -10000 } = opts

  let results = items.slice()
  const dir = direction === 'asc' ? 1 : -1

  if (query && searchKeys?.length) {
    const fuzzy = fuzzysort.go(query, results, {
      keys: searchKeys as string[],
      limit,
      threshold
    })

    results = fuzzy.map((r) => r.obj)
  }

  if (sortKey) {
    results.sort((a, b) => {
      const av = a[sortKey] as SortablePrimitive
      const bv = b[sortKey] as SortablePrimitive
      return compare(av, bv) * dir
    })
  }

  return results
}

import { describe, it, expect } from 'vitest'
import { universalSearchSort } from './universalSearchSort'

// Use local types for test to keep test contained and focused only on sort/search
type Player = {
  id: string
  displayName: string
  email: string
  cellPhone?: string | null
  createdAt: number
}

type Category = {
  id: string
  name: string
  description?: string | null
  order: number
  createdAt: number
}

const players: Player[] = [
  {
    id: '1',
    displayName: 'Alice Johnson',
    email: 'alice@example.com',
    cellPhone: '(504) 555-1111',
    createdAt: 1710000000000
  },
  {
    id: '2',
    displayName: 'Bob Smith',
    email: 'bob@example.com',
    cellPhone: null,
    createdAt: 1720000000000
  },
  {
    id: '3',
    displayName: 'Charlie Jones',
    email: 'charlie@demo.com',
    cellPhone: '555-1234',
    createdAt: 1730000000000
  },
  {
    id: '4',
    displayName: 'Alicia Keys',
    email: 'alicia@demo.com',
    cellPhone: undefined,
    createdAt: 1700000000000
  }
]

const categories: Category[] = [
  { id: 'c1', name: 'Redfish', description: 'Slot 16–27"', order: 2, createdAt: 1700000000000 },
  { id: 'c2', name: 'Trout', description: 'Speckled', order: 1, createdAt: 1710000000000 },
  { id: 'c3', name: 'Flounder', description: null, order: 3, createdAt: 1720000000000 }
]

describe('universalSearchSort — plain sort (no query)', () => {
  it('sorts strings ascending by key and pushes empties last', () => {
    const out = universalSearchSort<Player>({
      items: players,
      sortKey: 'displayName',
      direction: 'asc'
    })
    expect(out.map((p) => p.displayName)).toEqual([
      'Alice Johnson',
      'Alicia Keys',
      'Bob Smith',
      'Charlie Jones'
    ])
  })

  it('sorts numbers descending by key', () => {
    const out = universalSearchSort<Player>({
      items: players,
      sortKey: 'createdAt',
      direction: 'desc'
    })
    expect(out.map((p) => p.id)).toEqual(['3', '2', '1', '4']) // newest → oldest
  })

  it('returns a shallow copy when no sortKey and no query', () => {
    const out = universalSearchSort<Player>({ items: players })
    expect(out).toEqual(players)
    expect(out).not.toBe(players)
  })
})

describe('universalSearchSort — fuzzy search (integration)', () => {
  it('filters by fuzzy query across declared string keys', () => {
    const out = universalSearchSort<Player>({
      items: players,
      query: 'ali', // should fuzzily match Alice + Alicia
      searchKeys: ['displayName', 'email']
    })
    // We only assert presence because no sort = no specific order
    const names = out.map((p) => p.displayName)
    expect(names).toContain('Alice Johnson')
    expect(names).toContain('Alicia Keys')
    // And non-matching like "Bob Smith" should typically be absent
    expect(names).not.toContain('Bob Smith')
  })

  it('with fuzzy + sortKey, final list is sorted by sortKey', () => {
    const out = universalSearchSort<Player>({
      items: players,
      query: 'a', // matches many
      searchKeys: ['displayName', 'email'],
      sortKey: 'displayName',
      direction: 'asc'
    })
    // Ensure it’s alphabetically ordered by displayName after fuzzy filtering
    const names = out.map((p) => p.displayName)
    const sorted = [...names].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    )
    expect(names).toEqual(sorted)
  })

  it('respects the limit', () => {
    const out = universalSearchSort<Player>({
      items: players,
      query: 'a',
      searchKeys: ['displayName'],
      limit: 1
    })
    expect(out.length).toBe(1)
  })

  it('skips fuzzy when searchKeys is empty (returns unsorted copy unless sortKey provided)', () => {
    const out = universalSearchSort<Player>({
      items: players,
      query: 'ali',
      searchKeys: []
    })
    expect(out).toEqual(players)
    expect(out).not.toBe(players)
  })

  it('returns empty when nothing matches', () => {
    const out = universalSearchSort<Player>({
      items: players,
      query: 'zzzzzzzz', // unlikely
      searchKeys: ['displayName', 'email']
    })
    expect(out).toEqual([])
  })
})

describe('universalSearchSort — categories (keys-only path)', () => {
  it('fuzzy by name/description, then sort by name asc', () => {
    const out = universalSearchSort<Category>({
      items: categories,
      query: 'r', // matches Redfish & Trout & Flounder
      searchKeys: ['name', 'description'],
      sortKey: 'name',
      direction: 'asc'
    })

    // presence check
    const ids = out.map((c) => c.id).sort()
    expect(ids).toEqual(['c1', 'c2', 'c3'])

    // ensure final sortKey order is asc by name
    const names = out.map((c) => c.name)
    const sortedNames = [...names].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    )
    expect(names).toEqual(sortedNames)
  })

  it('plain sort by order asc with no query', () => {
    const out = universalSearchSort<Category>({
      items: categories,
      sortKey: 'order',
      direction: 'asc'
    })
    expect(out.map((c) => c.order)).toEqual([1, 2, 3])
  })
})

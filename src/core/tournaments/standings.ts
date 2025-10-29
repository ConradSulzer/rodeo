import type { ULID } from 'ulid'
import type { DivisionView } from './divisions'
import type { Results, ItemResult } from './results'

export type CategoryStandingEntry = {
  playerId: ULID
  rank: number
  value: number
  breakdown: Record<string, ItemResult>
}

type RankDirection = DivisionView['categories'][number]['category']['direction']

export type CategoryStanding = {
  categoryId: string
  categoryName: string
  depth: number
  direction: RankDirection
  entries: CategoryStandingEntry[]
}

export type DivisionStanding = {
  divisionId: string
  divisionName: string
  categories: CategoryStanding[]
}

export function computeDivisionStanding(
  results: Results,
  division: DivisionView
): DivisionStanding {
  const eligible = division.eligiblePlayerIds.length
    ? new Set<ULID>(division.eligiblePlayerIds)
    : null
  const categories = division.categories.map((categoryView) =>
    computeCategoryStanding(results, categoryView, eligible)
  )

  return {
    divisionId: division.id,
    divisionName: division.name,
    categories
  }
}

export function computeAllDivisionStandings(
  results: Results,
  divisions: DivisionView[]
): DivisionStanding[] {
  return divisions.map((division) => computeDivisionStanding(results, division))
}

function computeCategoryStanding(
  results: Results,
  categoryView: DivisionView['categories'][number],
  eligible: Set<ULID> | null
): CategoryStanding {
  const entries: CategoryStandingEntry[] = []

  for (const [playerId, playerItems] of results) {
    if (eligible && !eligible.has(playerId)) continue
    const breakdown: Record<string, ItemResult> = {}
    let total = 0
    let hasAllScoreables = true

    for (const scoreable of categoryView.scoreables) {
      const item = playerItems.get(scoreable.id)
      if (!item) {
        hasAllScoreables = false
        break
      }
      breakdown[scoreable.id] = item
      total += item.value
    }

    if (!hasAllScoreables) continue

    entries.push({
      playerId,
      rank: 0, // placeholder until actual rank
      value: total,
      breakdown
    })
  }

  if (!entries.length) {
    return {
      categoryId: categoryView.category.id,
      categoryName: categoryView.category.name,
      depth: categoryView.depth,
      direction: categoryView.category.direction,
      entries: []
    }
  }

  entries.sort((a, b) => {
    if (a.value === b.value) return a.playerId.localeCompare(b.playerId)
    return categoryView.category.direction === 'asc' ? a.value - b.value : b.value - a.value
  })

  let currentRank = 0
  let lastValue: number | null = null

  entries.forEach((entry, index) => {
    if (lastValue === null || entry.value !== lastValue) {
      currentRank = index + 1
      lastValue = entry.value
    }
    entry.rank = currentRank
  })

  const limitedEntries = entries.filter((entry) => entry.rank <= categoryView.depth)

  return {
    categoryId: categoryView.category.id,
    categoryName: categoryView.category.name,
    depth: categoryView.depth,
    direction: categoryView.category.direction,
    entries: limitedEntries
  }
}

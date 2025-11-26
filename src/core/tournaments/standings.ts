import type { ULID } from 'ulid'
import type { Division, DivisionCategory } from './divisions'
import type { ItemResult, Results } from './results'
import type { Timestamp } from '@core/types/Shared'
import { applyRulesToStanding } from './standingRules'

export type PlayerStanding = {
  playerId: ULID
  itemCount: number
  total: number
  score: number
  rank: number
  ts: Timestamp
}

type RankDirection = DivisionCategory['category']['direction']

export type CategoryStanding = {
  categoryId: string
  depth: number
  direction: RankDirection
  entries: PlayerStanding[]
}

export type DivisionStanding = {
  divisionId: string
  categories: CategoryStanding[]
}

export function computeDivisionStanding(results: Results, division: Division): DivisionStanding {
  const eligible = division.eligiblePlayerIds.length
    ? new Set<ULID>(division.eligiblePlayerIds)
    : null
  const categories = division.categories.map((category) =>
    computeCategoryStanding(results, category, eligible)
  )

  return {
    divisionId: division.id,
    categories
  }
}

export function computeAllDivisionStandings(
  results: Results,
  divisions: Division[]
): DivisionStanding[] {
  return divisions.map((division) => computeDivisionStanding(results, division))
}

function getCategoryTotal(
  items: ItemResult[],
  mode: DivisionCategory['category']['mode'],
  direction: RankDirection
): number | null {
  if (!items.length) return null

  if (mode === 'pick_one') {
    const sorted = [...items].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    const chosen = direction === 'desc' ? sorted[0] : sorted[sorted.length - 1]
    return chosen.value ?? null
  }

  if (mode === 'aggregate') {
    return items.reduce((sum, item) => sum + (item.value ?? 0), 0)
  }

  return null
}

function computeCategoryStanding(
  results: Results,
  categoryView: DivisionCategory,
  eligible: Set<ULID> | null
): CategoryStanding {
  const entries: PlayerStanding[] = []

  for (const [playerId, playerResult] of results) {
    const playerItems = playerResult.items
    if (eligible && !eligible.has(playerId)) continue
    if (!playerResult.scoredAt) continue
    const mode = categoryView.category.mode ?? 'aggregate'
    const items: ItemResult[] = []

    for (const metric of categoryView.metrics) {
      const item = playerItems.get(metric.id)
      if (!item || item.status !== 'value' || item.value === undefined) continue
      items.push(item)
    }

    const rawTotal = getCategoryTotal(items, mode, categoryView.category.direction)
    if (rawTotal === null) continue

    const itemCount = items.length
    const roundedTotal = Number.parseFloat(rawTotal.toFixed(3))

    const playerStanding: PlayerStanding = {
      playerId,
      itemCount,
      total: roundedTotal,
      score: roundedTotal,
      rank: 0,
      ts: playerResult.scoredAt as Timestamp
    }

    const rules = categoryView.category.rules ?? []
    const adjustedStanding = applyRulesToStanding(playerStanding, rules, { categoryView })

    if (!adjustedStanding) continue

    entries.push(adjustedStanding)
  }

  // Fallback for no valid entries created in the above loop over results for this category
  if (!entries.length) {
    return {
      categoryId: categoryView.category.id,
      depth: categoryView.depth,
      direction: categoryView.category.direction,
      entries: []
    }
  }

  const direction = categoryView.category.direction

  // Sort all entries by score, then tie-break using the earliest timestamp
  entries.sort((a, b) => {
    const scoreDiff = direction === 'asc' ? a.score - b.score : b.score - a.score
    if (scoreDiff !== 0) return scoreDiff

    return a.ts - b.ts
  })

  // Because we sort by score then timestamp, ranks can follow the array index directly.
  entries.forEach((entry, index) => {
    entry.rank = index + 1
  })

  return {
    categoryId: categoryView.category.id,
    depth: categoryView.depth,
    direction: categoryView.category.direction,
    entries: entries
  }
}

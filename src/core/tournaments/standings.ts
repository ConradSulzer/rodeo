import type { ULID } from 'ulid'
import type { DivisionView, DivisionCategoryView } from './divisions'
import type { Results } from './results'
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

type RankDirection = DivisionCategoryView['category']['direction']

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
  categoryView: DivisionCategoryView,
  eligible: Set<ULID> | null
): CategoryStanding {
  const entries: PlayerStanding[] = []

  for (const [playerId, playerItems] of results) {
    if (eligible && !eligible.has(playerId)) continue
    let total = 0
    let itemCount = 0
    let earliestTs: number | null = null

    for (const scoreable of categoryView.scoreables) {
      const item = playerItems.get(scoreable.id)
      if (!item || item.status !== 'value' || item.value === undefined) continue
      total += item.value
      itemCount += 1
      earliestTs = earliestTs === null ? item.createdAt : Math.min(earliestTs, item.createdAt)
    }

    if (itemCount === 0) continue

    // ensures we have a timestamp here if not then send to bottom.
    // TODO: make sure we always have a timestamp and never have to resort to this fallback.
    const tieBreakTs = (earliestTs ?? Number.POSITIVE_INFINITY) as Timestamp

    const roundedTotal = Number.parseFloat(total.toFixed(3))

    const playerStanding: PlayerStanding = {
      playerId,
      itemCount,
      total: roundedTotal,
      score: roundedTotal,
      rank: 0,
      ts: tieBreakTs
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

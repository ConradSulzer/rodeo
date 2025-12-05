import type { ULID } from 'ulid'
import type { Division, DivisionCategory } from './divisions'
import type { ItemResult, Results } from './results'
import type { Timestamp } from '@core/types/Shared'
import type { PlayerViewable } from '@core/players/players'
import { applyRulesToStanding } from './standingRules'

export type PlayerStanding = {
  playerId: ULID
  player: PlayerViewable
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

export function computeDivisionStanding(
  results: Results,
  division: Division,
  players: Map<string, PlayerViewable>
): DivisionStanding {
  const eligible = new Set<ULID>(division.eligiblePlayerIds)
  const categories = division.categories.map((category) =>
    computeCategoryStanding(results, category, eligible, players)
  )

  return {
    divisionId: division.id,
    categories
  }
}

export function computeAllDivisionStandings(
  results: Results,
  divisions: Division[],
  players: Map<string, PlayerViewable>
): DivisionStanding[] {
  return divisions.map((division) => computeDivisionStanding(results, division, players))
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
  divisionCategory: DivisionCategory,
  eligible: Set<ULID> | null,
  players: Map<string, PlayerViewable>
): CategoryStanding {
  const entries: PlayerStanding[] = []

  for (const [playerId, playerResult] of results) {
    const playerItems = playerResult.items
    if (eligible && !eligible.has(playerId)) continue
    if (!playerResult.scoredAt) continue
    const player = players.get(playerId)
    if (!player) continue
    const mode = divisionCategory.category.mode ?? 'aggregate'
    const items: ItemResult[] = []

    for (const metric of divisionCategory.metrics) {
      const item = playerItems.get(metric.id)
      if (!item || item.status !== 'value' || item.value === undefined) continue
      items.push(item)
    }

    const rawTotal = getCategoryTotal(items, mode, divisionCategory.category.direction)
    if (rawTotal === null) continue

    const itemCount = items.length
    const roundedTotal = Number.parseFloat(rawTotal.toFixed(3))

    const playerStanding: PlayerStanding = {
      playerId,
      player,
      itemCount,
      total: roundedTotal,
      score: roundedTotal,
      rank: 0,
      ts: playerResult.scoredAt as Timestamp
    }

    const rules = divisionCategory.category.rules ?? []
    const adjustedStanding = applyRulesToStanding(playerStanding, rules, {
      categoryView: divisionCategory
    })

    if (!adjustedStanding) continue

    entries.push(adjustedStanding)
  }

  // Fallback for no valid entries created in the above loop over results for this category
  if (!entries.length) {
    return {
      categoryId: divisionCategory.category.id,
      depth: divisionCategory.depth,
      direction: divisionCategory.category.direction,
      entries: []
    }
  }

  const direction = divisionCategory.category.direction

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
    categoryId: divisionCategory.category.id,
    depth: divisionCategory.depth,
    direction: divisionCategory.category.direction,
    entries: entries
  }
}

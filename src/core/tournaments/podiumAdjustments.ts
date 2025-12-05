import type { CategoryStanding, DivisionStanding, PlayerStanding } from './standings'
import type { PodiumEvent } from './podiumEvents'

export type PodiumAdjustments = {
  removed: Map<string, Map<string, Set<string>>>
}

export type SerializedPodiumAdjustments = {
  removed: Record<string, Record<string, string[]>>
}

export const EMPTY_SERIALIZED_PODIUM_ADJUSTMENTS: SerializedPodiumAdjustments = {
  removed: {}
}

export function createEmptyPodiumAdjustments(): PodiumAdjustments {
  return {
    removed: new Map()
  }
}

export function serializePodiumAdjustments(
  adjustments: PodiumAdjustments
): SerializedPodiumAdjustments {
  const removed: SerializedPodiumAdjustments['removed'] = {}

  adjustments.removed.forEach((categories, divisionId) => {
    const serializedCategories: Record<string, string[]> = {}
    categories.forEach((players, categoryId) => {
      serializedCategories[categoryId] = Array.from(players.values())
    })
    removed[divisionId] = serializedCategories
  })

  return { removed }
}

export function deserializePodiumAdjustments(
  serialized?: SerializedPodiumAdjustments | null
): PodiumAdjustments {
  const removed = new Map<string, Map<string, Set<string>>>()
  if (!serialized) {
    return { removed }
  }

  for (const [divisionId, categories] of Object.entries(serialized.removed ?? {})) {
    const categoryMap = new Map<string, Set<string>>()
    for (const [categoryId, playerIds] of Object.entries(categories ?? {})) {
      categoryMap.set(categoryId, new Set(playerIds))
    }
    removed.set(divisionId, categoryMap)
  }

  return { removed }
}

function ensureRemovedBucket(
  adjustments: PodiumAdjustments,
  divisionId: string,
  categoryId: string
): Set<string> {
  let categories = adjustments.removed.get(divisionId)
  if (!categories) {
    categories = new Map()
    adjustments.removed.set(divisionId, categories)
  }

  let players = categories.get(categoryId)
  if (!players) {
    players = new Set()
    categories.set(categoryId, players)
  }

  return players
}

export function applyPodiumEventToAdjustments(
  adjustments: PodiumAdjustments,
  event: PodiumEvent
): PodiumAdjustments {
  if (event.type === 'podium:remove-player') {
    const bucket = ensureRemovedBucket(adjustments, event.divisionId, event.categoryId)
    bucket.add(event.playerId)
    return adjustments
  }

  if (event.type === 'podium:restore-player') {
    const category = adjustments.removed.get(event.divisionId)
    const bucket = category?.get(event.categoryId)
    bucket?.delete(event.playerId)
    return adjustments
  }

  return adjustments
}

export function derivePodiumStandings(
  standings: DivisionStanding[],
  adjustments: PodiumAdjustments,
  defaultDepth = 10
): DivisionStanding[] {
  return standings.map((divisionStanding) => {
    const categoryMap = adjustments.removed.get(divisionStanding.divisionId)
    const categories = divisionStanding.categories.map((categoryStanding) => {
      const removedPlayers = categoryMap?.get(categoryStanding.categoryId)
      const filteredEntries = removedPlayers?.size
        ? categoryStanding.entries.filter((entry) => !removedPlayers.has(entry.playerId))
        : categoryStanding.entries

      const reRankedEntries = filteredEntries.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }))

      const depth = categoryStanding.depth ?? defaultDepth
      const entries = depth > 0 ? reRankedEntries.slice(0, depth) : []

      return {
        ...categoryStanding,
        entries
      }
    })

    return {
      ...divisionStanding,
      categories
    }
  })
}

export function getRemovedEntriesForCategory(
  category: CategoryStanding,
  removed: Set<string> | undefined
): PlayerStanding[] {
  if (!removed?.size) return []
  return category.entries.filter((entry) => removed.has(entry.playerId))
}

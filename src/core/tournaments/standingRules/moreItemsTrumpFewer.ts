import type { StandingRuleContext } from '../standingRules'
import type { PlayerStanding } from '../standings'

const WEIGHT_PER_ITEM = 1000

export function moreItemsTrumpFewerApply(
  standing: PlayerStanding,
  { categoryView }: StandingRuleContext
): PlayerStanding {
  const adjustment = standing.itemCount * WEIGHT_PER_ITEM
  const direction = categoryView.category.direction
  const normalizedAdjustment = direction === 'asc' ? -adjustment : adjustment

  return {
    ...standing,
    score: standing.score + normalizedAdjustment
  }
}

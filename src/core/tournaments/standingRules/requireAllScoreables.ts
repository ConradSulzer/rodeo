import type { StandingRuleContext } from '../standingRules'
import type { PlayerStanding } from '../standings'

export function requireAllScoreablesApply(
  standing: PlayerStanding,
  { categoryView }: StandingRuleContext
): PlayerStanding | null {
  const requiredCount = categoryView.scoreables.length

  if (requiredCount === 0) return standing

  return standing.itemCount === requiredCount ? standing : null
}

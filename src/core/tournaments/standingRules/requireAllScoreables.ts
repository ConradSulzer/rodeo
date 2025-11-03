import type { StandingRuleContext } from '../standingRules'
import type { PlayerStanding } from '../standings'

/**
 * TODO: if we want to start doing some logging we can include the playerItems in the StandingRuleContext
 * so we could point out which scoreables are/were missing.
 */
export function requireAllScoreablesApply(
  standing: PlayerStanding,
  { categoryView }: StandingRuleContext
): PlayerStanding | null {
  const requiredCount = categoryView.scoreables.length

  if (requiredCount === 0) return standing

  return standing.itemCount === requiredCount ? standing : null
}

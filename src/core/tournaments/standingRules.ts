import type { PlayerStanding } from './standings'
import type { DivisionCategory } from './divisions'
import { moreItemsTrumpFewerApply } from './standingRules/moreItemsTrumpFewer'
import { requireAllMetricsApply } from './standingRules/requireAllMetrics'

export type StandingRuleContext = {
  categoryView: DivisionCategory
}

export type StandingRule = {
  label: string
  description: string
  apply: (standing: PlayerStanding, context: StandingRuleContext) => PlayerStanding | null
}

const STANDING_RULES: Record<string, StandingRule> = {
  more_items_trump_fewer: {
    label: 'More Items Trump Fewer',
    description:
      'Favors players who completed more metrics by applying a large per-item boost before ranking.',
    apply: moreItemsTrumpFewerApply
  },
  require_all_metrics: {
    label: 'Require All Metrics',
    description: 'Invalidates standings that do not include an entry for every metric.',
    apply: requireAllMetricsApply
  }
}

export type StandingRuleSummary = {
  name: string
  label: string
  description: string
}

export function listStandingRules(): StandingRuleSummary[] {
  return Object.entries(STANDING_RULES).map(([name, rule]) => ({
    name,
    label: rule.label,
    description: rule.description
  }))
}

export function applyRulesToStanding(
  standing: PlayerStanding,
  ruleNames: string[] | undefined,
  context: StandingRuleContext
): PlayerStanding | null {
  if (!ruleNames?.length) return standing

  let currentStanding: PlayerStanding = { ...standing }

  for (const ruleName of ruleNames) {
    const rule = getStandingRule(ruleName)
    if (!rule) continue

    // Rules operate on a shallow copy so accidental mutation of shared state doesn't leak.
    // If a rule invalidates a PlayerStanding we stop and return null.
    const result = rule.apply({ ...currentStanding }, context)
    if (!result) {
      return null
    }

    currentStanding = { ...result }
  }

  return currentStanding
}

export function getStandingRule(name: string): StandingRule | undefined {
  return STANDING_RULES[name]
}

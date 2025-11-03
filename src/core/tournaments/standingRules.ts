import type { PlayerStanding } from './standings'
import type { DivisionCategoryView } from './divisions'

export type StandingRuleContext = {
  categoryView: DivisionCategoryView
}

export type StandingRule = {
  description: string
  apply: (standing: PlayerStanding, context: StandingRuleContext) => PlayerStanding | null
}

const STANDING_RULES: Record<string, StandingRule> = {}

export type StandingRuleSummary = {
  name: string
  description: string
}

export function listStandingRules(): StandingRuleSummary[] {
  return Object.entries(STANDING_RULES).map(([name, rule]) => ({
    name,
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

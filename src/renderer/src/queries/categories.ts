import { useQuery } from '@tanstack/react-query'
import type { StandingRuleSummary } from '@core/tournaments/standingRules'
import { queryKeys } from './queryKeys'

const fetchStandingRules = async (): Promise<StandingRuleSummary[]> => {
  return window.api.categories.listRules()
}

export function useStandingRulesQuery() {
  return useQuery({
    queryKey: queryKeys.categories.rules(),
    queryFn: fetchStandingRules
  })
}

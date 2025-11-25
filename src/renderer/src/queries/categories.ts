import { useQuery } from '@tanstack/react-query'
import type { Category } from '@core/tournaments/categories'
import type { StandingRuleSummary } from '@core/tournaments/standingRules'
import { queryKeys } from './queryKeys'

const fetchCategories = async (): Promise<Category[]> => {
  return window.api.categories.list()
}

const fetchStandingRules = async (): Promise<StandingRuleSummary[]> => {
  return window.api.categories.listRules()
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.categories.all(),
    queryFn: fetchCategories
  })
}

export function useStandingRulesQuery() {
  return useQuery({
    queryKey: queryKeys.categories.rules(),
    queryFn: fetchStandingRules
  })
}

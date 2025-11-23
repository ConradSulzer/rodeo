import { useQuery } from '@tanstack/react-query'
import type { CategoryRecord, CategoryView } from '@core/tournaments/categories'
import type { StandingRuleSummary } from '@core/tournaments/standingRules'
import { queryKeys } from './queryKeys'

const fetchCategoryViews = async (): Promise<CategoryView[]> => {
  return window.api.categories.listViews()
}

const fetchStandingRules = async (): Promise<StandingRuleSummary[]> => {
  return window.api.categories.listRules()
}

const fetchCategories = async (): Promise<CategoryRecord[]> => {
  return window.api.categories.list()
}

export function useCategoryViewsQuery() {
  return useQuery({
    queryKey: queryKeys.categories.views(),
    queryFn: fetchCategoryViews
  })
}

export function useCategoryListQuery() {
  return useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: fetchCategories
  })
}

export function useStandingRulesQuery() {
  return useQuery({
    queryKey: queryKeys.categories.rules(),
    queryFn: fetchStandingRules
  })
}

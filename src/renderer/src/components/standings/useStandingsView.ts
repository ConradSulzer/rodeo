import { useEffect, useMemo, useCallback } from 'react'
import type { Division, DivisionCategory } from '@core/tournaments/divisions'
import type { CategoryStanding, DivisionStanding } from '@core/tournaments/standings'
import { useSectionViewStore, type StandingsViewKey } from '@renderer/state/sectionViewStore'
import { useShallow } from 'zustand/react/shallow'

const sortCategories = (categories: DivisionCategory[]): DivisionCategory[] => {
  return [...categories].sort((a, b) => {
    const orderDiff = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
    if (orderDiff !== 0) return orderDiff
    return a.category.name.localeCompare(b.category.name)
  })
}

export function useStandingsView(
  viewKey: StandingsViewKey,
  divisions: Division[],
  standings: DivisionStanding[],
  loading: boolean
) {
  const {
    selectedDivisionId: activeDivisionId,
    categorySelections,
    setSelectedDivision,
    setCategorySelection,
    updateCategorySelections,
    resetView
  } = useSectionViewStore(
    useShallow((state) => ({
      selectedDivisionId: state[viewKey].selectedDivisionId,
      categorySelections: state[viewKey].categorySelections,
      setSelectedDivision: state.setSelectedDivision,
      setCategorySelection: state.setCategorySelection,
      updateCategorySelections: state.updateCategorySelections,
      resetView: state.resetView
    }))
  )

  const handleSelectDivision = useCallback(
    (divisionId: string | null) => {
      setSelectedDivision(viewKey, divisionId)
    },
    [setSelectedDivision, viewKey]
  )

  const handleSelectCategory = useCallback(
    (divisionId: string, categoryId: string) => {
      setCategorySelection(viewKey, divisionId, categoryId)
    },
    [setCategorySelection, viewKey]
  )

  const handleResetView = useCallback(() => {
    resetView(viewKey)
  }, [resetView, viewKey])

  useEffect(() => {
    if (!loading && !divisions.length && !standings.length) {
      handleResetView()
    }
  }, [divisions.length, standings.length, loading, handleResetView])

  useEffect(() => {
    if (!divisions.length) {
      if (activeDivisionId !== null) {
        handleSelectDivision(null)
      }
      return
    }
    const hasSelected = activeDivisionId
      ? divisions.some((division) => division.id === activeDivisionId)
      : false
    if (hasSelected) return
    handleSelectDivision(divisions[0]?.id ?? null)
  }, [divisions, activeDivisionId, handleSelectDivision])

  useEffect(() => {
    updateCategorySelections(viewKey, (prev) => {
      const next = { ...prev }
      let changed = false
      const divisionMap = new Map(divisions.map((division) => [division.id, division]))
      for (const [divisionId, categoryId] of Object.entries(prev)) {
        const division = divisionMap.get(divisionId)
        if (!division) {
          delete next[divisionId]
          changed = true
          continue
        }
        const hasCategory = division.categories.some(
          (category) => category.category.id === categoryId
        )
        if (!hasCategory) {
          delete next[divisionId]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [divisions, updateCategorySelections, viewKey])

  const activeDivision = useMemo(() => {
    if (!divisions.length) return null
    const fallback = divisions[0]
    if (!activeDivisionId) return fallback
    return divisions.find((division) => division.id === activeDivisionId) ?? fallback
  }, [divisions, activeDivisionId])

  const divisionStanding = useMemo(() => {
    if (!activeDivision) return null
    return standings.find((standing) => standing.divisionId === activeDivision.id) ?? null
  }, [activeDivision, standings])

  const divisionCategories = useMemo(() => {
    if (!activeDivision) return []
    return sortCategories(activeDivision.categories)
  }, [activeDivision])

  const activeDivisionCategory = useMemo(() => {
    if (!activeDivision || !divisionCategories.length) return null
    const preset = categorySelections[activeDivision.id]
    if (preset) {
      return (
        divisionCategories.find((category) => category.category.id === preset) ??
        divisionCategories[0]
      )
    }
    return divisionCategories[0]
  }, [activeDivision, divisionCategories, categorySelections])

  const activeCategoryStanding: CategoryStanding | null = useMemo(() => {
    if (!activeDivisionCategory || !divisionStanding) return null
    return (
      divisionStanding.categories.find(
        (category) => category.categoryId === activeDivisionCategory.category.id
      ) ?? null
    )
  }, [activeDivisionCategory, divisionStanding])

  return {
    activeDivision,
    divisionCategories,
    activeDivisionCategory,
    activeCategoryStanding,
    handleSelectDivision,
    handleSelectCategory
  }
}

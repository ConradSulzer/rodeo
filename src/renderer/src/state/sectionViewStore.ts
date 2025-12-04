import { create } from 'zustand'

export type StandingsViewKey = 'standings' | 'podium'

type StandingsViewState = {
  selectedDivisionId: string | null
  categorySelections: Record<string, string>
}

type SectionViewState = {
  standings: StandingsViewState
  podium: StandingsViewState
  setSelectedDivision: (view: StandingsViewKey, divisionId: string | null) => void
  setCategorySelection: (view: StandingsViewKey, divisionId: string, categoryId: string) => void
  updateCategorySelections: (
    view: StandingsViewKey,
    updater: (current: Record<string, string>) => Record<string, string>
  ) => void
  resetView: (view: StandingsViewKey) => void
  resetAllViews: () => void
}

const createInitialStandingsState = (): StandingsViewState => ({
  selectedDivisionId: null,
  categorySelections: {}
})

export const useSectionViewStore = create<SectionViewState>()((set) => ({
  standings: createInitialStandingsState(),
  podium: createInitialStandingsState(),
  setSelectedDivision: (view, divisionId) =>
    set((state) => ({
      ...state,
      [view]: { ...state[view], selectedDivisionId: divisionId }
    })),
  setCategorySelection: (view, divisionId, categoryId) =>
    set((state) => ({
      ...state,
      [view]: {
        ...state[view],
        categorySelections: {
          ...state[view].categorySelections,
          [divisionId]: categoryId
        }
      }
    })),
  updateCategorySelections: (view, updater) =>
    set((state) => {
      const nextSelections = updater(state[view].categorySelections)
      if (nextSelections === state[view].categorySelections) {
        return state
      }
      return {
        ...state,
        [view]: {
          ...state[view],
          categorySelections: nextSelections
        }
      }
    }),
  resetView: (view) =>
    set((state) => ({
      ...state,
      [view]: createInitialStandingsState()
    })),
  resetAllViews: () => ({
    standings: createInitialStandingsState(),
    podium: createInitialStandingsState()
  })
}))

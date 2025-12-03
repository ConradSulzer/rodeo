import { create } from 'zustand'

type StandingsViewState = {
  selectedDivisionId: string | null
  categorySelections: Record<string, string>
}

type SectionViewState = {
  standings: StandingsViewState
  setStandingsSelectedDivision: (divisionId: string | null) => void
  setStandingsCategorySelection: (divisionId: string, categoryId: string) => void
  updateStandingsCategorySelections: (
    updater: (current: Record<string, string>) => Record<string, string>
  ) => void
  resetStandings: () => void
}

const initialStandingsState: StandingsViewState = {
  selectedDivisionId: null,
  categorySelections: {}
}

export const useSectionViewStore = create<SectionViewState>()((set) => ({
  standings: initialStandingsState,
  setStandingsSelectedDivision: (divisionId) =>
    set((state) => ({
      standings: { ...state.standings, selectedDivisionId: divisionId }
    })),
  setStandingsCategorySelection: (divisionId, categoryId) =>
    set((state) => ({
      standings: {
        ...state.standings,
        categorySelections: {
          ...state.standings.categorySelections,
          [divisionId]: categoryId
        }
      }
    })),
  updateStandingsCategorySelections: (updater) =>
    set((state) => {
      const nextSelections = updater(state.standings.categorySelections)
      if (nextSelections === state.standings.categorySelections) {
        return state
      }
      return {
        standings: {
          ...state.standings,
          categorySelections: nextSelections
        }
      }
    }),
  resetStandings: () =>
    set(() => ({
      standings: {
        selectedDivisionId: initialStandingsState.selectedDivisionId,
        categorySelections: { ...initialStandingsState.categorySelections }
      }
    }))
}))

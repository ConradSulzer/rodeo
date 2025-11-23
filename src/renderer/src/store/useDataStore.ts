import { create } from 'zustand'
import type { Player, PlayerAssignment } from '@core/players/players'
import type { DivisionView } from '@core/tournaments/divisions'
import type { Metric } from '@core/tournaments/metrics'
import type { SerializableTournamentState } from '@core/tournaments/state'

export type PlayerDirectory = Map<string, Player>

type DataStoreState = {
  playerAssignments: PlayerAssignment[]
  divisionViews: DivisionView[]
  metrics: Metric[]
  tournamentState?: SerializableTournamentState
  playerDirectory: PlayerDirectory
  loading: boolean
  error?: string
  fetchPlayerAssignments: () => Promise<void>
  fetchDivisionViews: () => Promise<void>
  fetchMetrics: () => Promise<void>
  fetchTournamentState: () => Promise<void>
  refreshAll: () => Promise<void>
}

export const useDataStore = create<DataStoreState>((set, get) => ({
  playerAssignments: [],
  divisionViews: [],
  metrics: [],
  tournamentState: undefined,
  playerDirectory: new Map(),
  loading: false,
  error: undefined,
  async fetchPlayerAssignments() {
    try {
      const assignments = await window.api.players.listAssignments()
      const directory = new Map(assignments.map(({ player }) => [player.id, player]))
      set({ playerAssignments: assignments, playerDirectory: directory })
    } catch {
      set({ error: 'Failed to load players' })
    }
  },
  async fetchDivisionViews() {
    try {
      const views = await window.api.divisions.listViews()
      set({ divisionViews: views })
    } catch {
      set({ error: 'Failed to load divisions' })
    }
  },
  async fetchMetrics() {
    try {
      const metrics = await window.api.metrics.list()
      set({ metrics })
    } catch {
      set({ error: 'Failed to load metrics' })
    }
  },
  async fetchTournamentState() {
    try {
      const state = await window.api.tournaments.getState()
      set({ tournamentState: state })
    } catch {
      set({ error: 'Failed to load tournament state' })
    }
  },
  async refreshAll() {
    set({ loading: true, error: undefined })
    try {
      await Promise.all([
        get().fetchPlayerAssignments(),
        get().fetchDivisionViews(),
        get().fetchMetrics(),
        get().fetchTournamentState()
      ])
    } finally {
      set({ loading: false })
    }
  }
}))

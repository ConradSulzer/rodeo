import { create } from 'zustand'
import type { Player, PlayerAssignment } from '@core/players/players'
import type { DivisionView } from '@core/tournaments/divisions'
import type { MetricRecord, MetricView } from '@core/tournaments/metrics'
import type { SerializableTournamentState } from '@core/tournaments/state'

export type PlayerDirectory = Map<string, Player>
export type MetricsDirectory = Map<string, MetricRecord>

type TournamentDataState = {
  playerAssignments: PlayerAssignment[]
  divisionViews: DivisionView[]
  metricViews: MetricView[]
  tournamentState?: SerializableTournamentState
  playerDirectory: PlayerDirectory
  metricsDirectory: MetricsDirectory
  metricList: MetricRecord[]
  loading: boolean
  error?: string
  fetchPlayerAssignments: () => Promise<void>
  fetchDivisionViews: () => Promise<void>
  fetchMetricViews: () => Promise<void>
  fetchTournamentState: () => Promise<void>
  refreshAll: () => Promise<void>
}

export const useTournamentDataStore = create<TournamentDataState>((set, get) => ({
  playerAssignments: [],
  divisionViews: [],
  metricViews: [],
  tournamentState: undefined,
  playerDirectory: new Map(),
  metricsDirectory: new Map(),
  metricList: [],
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
  async fetchMetricViews() {
    try {
      const views = await window.api.metrics.listViews()
      const metrics = await window.api.metrics.list()
      const sorted = [...metrics].sort((a, b) => a.label.localeCompare(b.label))
      const directory = new Map(sorted.map((metric) => [metric.id, metric]))
      set({ metricViews: views, metricList: sorted, metricsDirectory: directory })
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
        get().fetchMetricViews(),
        get().fetchTournamentState()
      ])
    } finally {
      set({ loading: false })
    }
  }
}))

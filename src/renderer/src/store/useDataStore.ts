import { create } from 'zustand'
import type { EnrichedPlayer } from '@core/players/players'
import type { Division } from '@core/tournaments/divisions'
import type { Metric } from '@core/tournaments/metrics'
import type { SerializableTournamentState } from '@core/tournaments/state'
import type { Category } from '@core/tournaments/categories'

export type PlayerDirectory = Map<string, EnrichedPlayer>

type StoreData = {
  players: EnrichedPlayer[]
  divisions: Division[]
  metrics: Metric[]
  categories: Category[]
  tournamentState?: SerializableTournamentState
  playerDirectory: PlayerDirectory
  loading: boolean
  error?: string
}

type DataStoreState = StoreData & {
  fetchPlayers: () => Promise<void>
  fetchDivisionViews: () => Promise<void>
  fetchMetrics: () => Promise<void>
  fetchCategories: () => Promise<void>
  fetchTournamentState: () => Promise<void>
  refreshAll: () => Promise<void>
  clear: () => void
}

const createInitialData = (): StoreData => ({
  players: [],
  divisions: [],
  metrics: [],
  categories: [],
  tournamentState: undefined,
  playerDirectory: new Map(),
  loading: false,
  error: undefined
})

export const useDataStore = create<DataStoreState>((set, get) => ({
  ...createInitialData(),
  async fetchPlayers() {
    try {
      const players = await window.api.players.list()
      const directory = new Map(players.map((player) => [player.id, player]))
      set({ players, playerDirectory: directory })
    } catch {
      set({ error: 'Failed to load players' })
    }
  },
  async fetchDivisionViews() {
    try {
      const divisions = await window.api.divisions.list()
      set({ divisions })
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
  async fetchCategories() {
    try {
      const categories = await window.api.categories.list()
      set({ categories })
    } catch {
      set({ error: 'Failed to load categories' })
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
        get().fetchPlayers(),
        get().fetchDivisionViews(),
        get().fetchMetrics(),
        get().fetchCategories(),
        get().fetchTournamentState()
      ])
    } finally {
      set({ loading: false })
    }
  },
  clear() {
    set((state) => ({
      ...state,
      ...createInitialData()
    }))
  }
}))

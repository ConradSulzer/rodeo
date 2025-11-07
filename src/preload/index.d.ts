import { ElectronAPI } from '@electron-toolkit/preload'
import { Player, PlayerDivisionTuple, NewPlayer, PatchPlayer } from '@core/players/players'
import { Category, NewCategory, PatchCategory } from '@core/tournaments/categories'
import { StandingRuleSummary } from '@core/tournaments/standingRules'
import {
  Division,
  DivisionCategoryLink,
  DivisionCategoryPatch,
  DivisionView,
  NewDivision,
  PatchDivision
} from '@core/tournaments/divisions'
import { NewScoreable, PatchScoreable, Scoreable } from '@core/tournaments/scoreables'
import type { SerializableTournamentState } from '@core/tournaments/state'
import type { ScoreEventInput } from '@core/events/events'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      players: {
        create: (data: NewPlayer) => Promise<string>
        update: (id: string, data: PatchPlayer) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
        get: (id: string) => Promise<Player>
        list: () => Promise<Array<Player>>
        listWithDivisions: () => Promise<Array<PlayerDivisionTuple>>
      }
      scoreables: {
        create: (data: NewScoreable) => Promise<string>
        update: (id: string, data: PatchScoreable) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
        get: (id: string) => Promise<Scoreable>
        list: () => Promise<Scoreable[]>
        listViews: () => Promise<
          (Scoreable & {
            divisions: string[]
          })[]
        >
      }
      categories: {
        create: (data: NewCategory) => Promise<string>
        update: (id: string, data: PatchCategory) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
        get: (id: string) => Promise<Category>
        list: () => Promise<Category[]>
        listViews: () => Promise<
          (Category & {
            scoreables: Scoreable[]
          })[]
        >
        listRules: () => Promise<StandingRuleSummary[]>
        addScoreable: (categoryId: string, scoreableId: string) => Promise<boolean>
        removeScoreable: (categoryId: string, scoreableId: string) => Promise<boolean>
        listScoreableIds: (categoryId: string) => Promise<string[]>
        listForScoreable: (scoreableId: string) => Promise<string[]>
      }
      divisions: {
        create: (data: NewDivision) => Promise<string>
        update: (id: string, data: PatchDivision) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
        get: (id: string) => Promise<Division>
        list: () => Promise<Division[]>
        addCategory: (
          divisionId: string,
          categoryId: string,
          depth?: number,
          order?: number
        ) => Promise<boolean>
        removeCategory: (divisionId: string, categoryId: string) => Promise<boolean>
        listCategories: (divisionId: string) => Promise<DivisionCategoryLink[]>
        updateCategoryLink: (
          divisionId: string,
          categoryId: string,
          patch: DivisionCategoryPatch
        ) => Promise<boolean>
        listForCategory: (categoryId: string) => Promise<DivisionCategoryLink[]>
        getView: (id: string) => Promise<DivisionView | undefined>
        listViews: () => Promise<DivisionView[]>
        addPlayer: (divisionId: string, playerId: string) => Promise<boolean>
        removePlayer: (divisionId: string, playerId: string) => Promise<boolean>
        listPlayers: (divisionId: string) => Promise<string[]>
        listForPlayer: (playerId: string) => Promise<string[]>
        move: (id: string, direction: 'up' | 'down') => Promise<boolean>
        reorder: (orderedIds: string[]) => Promise<boolean>
      }
      events: {
        record: (entries: ScoreEventInput[]) => Promise<{
          success: boolean
          errors: string[]
        }>
      }
      tournaments: {
        open: (filePath: string) => Promise<boolean>
        openDialog: () => Promise<string | null>
        createDialog: () => Promise<string | null>
        getMetadata: () => Promise<{
          id: string
          name: string
          eventDate: string | null
          createdAt: number
          updatedAt: number
        }>
        updateMetadata: (patch: { name?: string; eventDate?: string | null }) => Promise<{
          id: string
          name: string
          eventDate: string | null
          createdAt: number
          updatedAt: number
        }>
        close: () => Promise<boolean>
        getState: () => Promise<SerializableTournamentState>
        subscribe: (listener: (snapshot: SerializableTournamentState) => void) => () => void
      }
    }
  }
}

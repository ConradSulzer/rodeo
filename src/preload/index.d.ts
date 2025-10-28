import { ElectronAPI } from '@electron-toolkit/preload'
import { Player, NewPlayer, PatchPlayer } from '@core/players/players'
import { PatchScoreable, Scoreable } from '@core/tournaments/scoreables'

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
      }
      scoreables: {
        create: (data: NewScoreable) => Promise<string>
        update: (id: string, data: PatchScoreable) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
        get: (id: string) => Promise<Scoreable>
        list: () => Promise<Scoreable[]>
      }
      tournaments: {
        open: (filePath: string) => Promise<boolean>
        close: () => Promise<boolean>
      }
    }
  }
}

import { ElectronAPI } from '@electron-toolkit/preload'
import { Player, PlayerCreate } from '@core/players/players'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      players: {
        create: (data: PlayerCreate) => Promise<string>
        list: () => Promise<Array<Player>>
      }
      tournaments: {
        open: (filePath: string) => Promise<boolean>
        close: () => Promise<boolean>
      }
    }
  }
}

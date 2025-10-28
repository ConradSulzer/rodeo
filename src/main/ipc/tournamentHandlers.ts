import { closeTournament, openTournament } from '@core/tournaments/tournaments'
import { ipcMain } from 'electron'

ipcMain.handle('tournaments:open', (_evt, filePath: string) => {
  openTournament(filePath)
  return true
})

ipcMain.handle('tournaments:close', () => {
  closeTournament()
  return true
})

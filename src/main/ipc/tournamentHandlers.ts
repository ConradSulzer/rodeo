import { closeTournament, openTournament } from '@core/tournaments/tournaments'
import { ipcMain } from 'electron'
import { hydrate, clear, getSerializableState } from '../state/tournamentStore'

ipcMain.handle('tournaments:open', (_evt, filePath: string) => {
  const db = openTournament(filePath)
  hydrate(db)
  return true
})

ipcMain.handle('tournaments:close', () => {
  closeTournament()
  clear()
  return true
})

ipcMain.handle('tournaments:state:get', () => {
  return getSerializableState()
})

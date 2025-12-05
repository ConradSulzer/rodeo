import {
  closeTournament,
  getTournamentDb,
  getTournamentMetadata,
  openTournament,
  updateTournamentMetadata,
  type TournamentMetadataPatch
} from '@core/tournaments/tournaments'
import { ipcMain } from 'electron'
import { hydrate, clear, getSerializableState, refreshStandings } from '../state/tournamentStore'
import { showOpenFileDialog, showSaveFileDialog } from './utils/dialogs'

ipcMain.handle('tournaments:open', (_evt, filePath: string) => {
  const db = openTournament(filePath)
  hydrate(db)
  return true
})

ipcMain.handle('tournaments:dialog:openExisting', () =>
  showOpenFileDialog({ title: 'Open Tournament', allowedExtensions: ['rodeo'] })
)

ipcMain.handle('tournaments:dialog:create', () =>
  showSaveFileDialog({ title: 'Create Tournament', defaultName: 'tournament', extension: 'rodeo' })
)

ipcMain.handle('tournaments:meta:get', () => {
  const db = getTournamentDb()
  return getTournamentMetadata(db)
})

ipcMain.handle('tournaments:meta:update', (_evt, patch: TournamentMetadataPatch) => {
  const db = getTournamentDb()
  return updateTournamentMetadata(db, patch ?? {})
})

ipcMain.handle('tournaments:close', () => {
  // close current tournament DB connection
  closeTournament()

  // clear main process tournament store
  clear()

  return true
})

ipcMain.handle('tournaments:state:get', () => {
  return getSerializableState()
})

ipcMain.handle('tournaments:standings:refresh', () => {
  const db = getTournamentDb()
  refreshStandings(db)
  return true
})

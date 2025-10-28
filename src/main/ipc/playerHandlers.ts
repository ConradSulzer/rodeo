import { createPlayer, listAllPlayers, type PlayerCreate } from '@core/players/players'
import { getTournamentDb } from '@core/tournaments/tournaments'
import { ipcMain } from 'electron'

ipcMain.handle('players:create', (_evt, data: PlayerCreate) => {
  const db = getTournamentDb()
  const id = createPlayer(db, data)
  return id
})

ipcMain.handle('players:list', () => {
  const db = getTournamentDb()
  return listAllPlayers(db)
})

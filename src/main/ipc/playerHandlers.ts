import {
  createPlayer,
  deletePlayer,
  getPlayer,
  listAllPlayers,
  listAllPlayersWithDivisions,
  updatePlayer,
  type NewPlayer,
  type PatchPlayer
} from '@core/players/players'
import { getTournamentDb } from '@core/tournaments/tournaments'
import { ipcMain } from 'electron'

ipcMain.handle('players:create', (_evt, data: NewPlayer) => {
  const db = getTournamentDb()

  return createPlayer(db, data)
})

ipcMain.handle('players:update', (_evt, id: string, data: PatchPlayer) => {
  const db = getTournamentDb()

  return updatePlayer(db, id, data)
})

ipcMain.handle('players:delete', (_evt, id: string) => {
  const db = getTournamentDb()

  return deletePlayer(db, id)
})

ipcMain.handle('players:get', (_evt, id: string) => {
  const db = getTournamentDb()

  return getPlayer(db, id)
})

ipcMain.handle('players:list', () => {
  const db = getTournamentDb()
  return listAllPlayers(db)
})

ipcMain.handle('players:listWithDivisions', () => {
  const db = getTournamentDb()
  return listAllPlayersWithDivisions(db)
})

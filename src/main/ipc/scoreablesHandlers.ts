import {
  createScoreable,
  deleteScoreable,
  getScoreable,
  listAllScoreables,
  NewScoreable,
  PatchScoreable,
  updateScoreable
} from '@core/tournaments/scoreables'
import { getTournamentDb } from '@core/tournaments/tournaments'
import { ipcMain } from 'electron'

ipcMain.handle('scoreables:create', (_evt, data: NewScoreable) => {
  const db = getTournamentDb()
  const id = createScoreable(db, data)

  return id
})

ipcMain.handle('scoreables:update', (_evt, id: string, data: PatchScoreable) => {
  const db = getTournamentDb()

  return updateScoreable(db, id, data)
})

ipcMain.handle('scoreables:delete', (_evt, id) => {
  const db = getTournamentDb()
  return deleteScoreable(db, id)
})

ipcMain.handle('scoreables:get', (_evt, id: string) => {
  const db = getTournamentDb()
  const scoreable = getScoreable(db, id)

  return scoreable
})

ipcMain.handle('scoreables:list', () => {
  const db = getTournamentDb()
  const scoreables = listAllScoreables(db)

  return scoreables
})

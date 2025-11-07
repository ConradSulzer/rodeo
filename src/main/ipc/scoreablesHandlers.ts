import {
  createScoreable,
  deleteScoreable,
  getScoreable,
  listAllScoreables,
  listScoreableViews,
  moveScoreable,
  reorderScoreables,
  NewScoreable,
  PatchScoreable,
  updateScoreable
} from '@core/tournaments/scoreables'
import { getTournamentDb } from '@core/tournaments/tournaments'
import { ipcMain } from 'electron'
import { withStandingsRefresh } from '../state/tournamentStore'

ipcMain.handle('scoreables:create', (_evt, data: NewScoreable) => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => createScoreable(db, data))
})

ipcMain.handle('scoreables:update', (_evt, id: string, data: PatchScoreable) => {
  const db = getTournamentDb()

  return withStandingsRefresh(db, () => updateScoreable(db, id, data))
})

ipcMain.handle('scoreables:delete', (_evt, id) => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => deleteScoreable(db, id))
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

ipcMain.handle('scoreables:listViews', () => {
  const db = getTournamentDb()
  return listScoreableViews(db)
})

ipcMain.handle('scoreables:move', (_evt, id: string, direction: 'up' | 'down') => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => moveScoreable(db, id, direction))
})

ipcMain.handle('scoreables:reorder', (_evt, orderedIds: string[]) => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => reorderScoreables(db, orderedIds))
})

import {
  addScoreableToCategory,
  createCategory,
  deleteCategory,
  getCategory,
  listAllCategories,
  listCategoryViews,
  removeScoreableFromCategory,
  updateCategory,
  type NewCategory,
  type PatchCategory
} from '@core/tournaments/categories'
import { getTournamentDb } from '@core/tournaments/tournaments'
import { listStandingRules } from '@core/tournaments/standingRules'
import { ipcMain } from 'electron'
import { withStandingsRefresh } from '../state/tournamentStore'

ipcMain.handle('categories:create', (_evt, data: NewCategory) => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => createCategory(db, data))
})

ipcMain.handle('categories:update', (_evt, id: string, patch: PatchCategory) => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => updateCategory(db, id, patch))
})

ipcMain.handle('categories:delete', (_evt, id: string) => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => deleteCategory(db, id))
})

ipcMain.handle('categories:get', (_evt, id: string) => {
  const db = getTournamentDb()
  return getCategory(db, id)
})

ipcMain.handle('categories:list', () => {
  const db = getTournamentDb()
  return listAllCategories(db)
})

ipcMain.handle('categories:listViews', () => {
  const db = getTournamentDb()
  return listCategoryViews(db)
})

ipcMain.handle('categories:listRules', () => {
  return listStandingRules()
})

ipcMain.handle('categories:addScoreable', (_evt, categoryId: string, scoreableId: string) => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => addScoreableToCategory(db, categoryId, scoreableId))
})

ipcMain.handle('categories:removeScoreable', (_evt, categoryId: string, scoreableId: string) => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => removeScoreableFromCategory(db, categoryId, scoreableId))
})

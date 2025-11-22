import {
  addMetricToCategory,
  createCategory,
  deleteCategory,
  getCategory,
  listAllCategories,
  listCategoryViews,
  removeMetricFromCategory,
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

ipcMain.handle('categories:addMetric', (_evt, categoryId: string, metricId: string) => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => addMetricToCategory(db, categoryId, metricId))
})

ipcMain.handle('categories:removeMetric', (_evt, categoryId: string, metricId: string) => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => removeMetricFromCategory(db, categoryId, metricId))
})

import {
  addScoreableToCategory,
  createCategory,
  deleteCategory,
  getCategory,
  listAllCategories,
  listCategoryIdsForScoreable,
  listScoreableIdsForCategory,
  removeScoreableFromCategory,
  updateCategory,
  type NewCategory,
  type PatchCategory
} from '@core/tournaments/categories'
import { getTournamentDb } from '@core/tournaments/tournaments'
import { ipcMain } from 'electron'

ipcMain.handle('categories:create', (_evt, data: NewCategory) => {
  const db = getTournamentDb()
  return createCategory(db, data)
})

ipcMain.handle('categories:update', (_evt, id: string, patch: PatchCategory) => {
  const db = getTournamentDb()
  return updateCategory(db, id, patch)
})

ipcMain.handle('categories:delete', (_evt, id: string) => {
  const db = getTournamentDb()
  return deleteCategory(db, id)
})

ipcMain.handle('categories:get', (_evt, id: string) => {
  const db = getTournamentDb()
  return getCategory(db, id)
})

ipcMain.handle('categories:list', () => {
  const db = getTournamentDb()
  return listAllCategories(db)
})

ipcMain.handle('categories:addScoreable', (_evt, categoryId: string, scoreableId: string) => {
  const db = getTournamentDb()
  return addScoreableToCategory(db, categoryId, scoreableId)
})

ipcMain.handle('categories:removeScoreable', (_evt, categoryId: string, scoreableId: string) => {
  const db = getTournamentDb()
  return removeScoreableFromCategory(db, categoryId, scoreableId)
})

ipcMain.handle('categories:listScoreableIds', (_evt, categoryId: string) => {
  const db = getTournamentDb()
  return listScoreableIdsForCategory(db, categoryId)
})

ipcMain.handle('categories:listForScoreable', (_evt, scoreableId: string) => {
  const db = getTournamentDb()
  return listCategoryIdsForScoreable(db, scoreableId)
})

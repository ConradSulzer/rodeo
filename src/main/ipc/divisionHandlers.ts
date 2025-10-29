import {
  addCategoryToDivision,
  createDivision,
  deleteDivision,
  getDivision,
  listAllDivisions,
  listCategoriesForDivision,
  listDivisionsForCategory,
  removeCategoryFromDivision,
  updateDivision,
  updateDivisionCategoryLink,
  type DivisionCategoryPatch,
  type NewDivision,
  type PatchDivision
} from '@core/tournaments/divisions'
import { getTournamentDb } from '@core/tournaments/tournaments'
import { ipcMain } from 'electron'

ipcMain.handle('divisions:create', (_evt, data: NewDivision) => {
  const db = getTournamentDb()
  return createDivision(db, data)
})

ipcMain.handle('divisions:update', (_evt, id: string, patch: PatchDivision) => {
  const db = getTournamentDb()
  return updateDivision(db, id, patch)
})

ipcMain.handle('divisions:delete', (_evt, id: string) => {
  const db = getTournamentDb()
  return deleteDivision(db, id)
})

ipcMain.handle('divisions:get', (_evt, id: string) => {
  const db = getTournamentDb()
  return getDivision(db, id)
})

ipcMain.handle('divisions:list', () => {
  const db = getTournamentDb()
  return listAllDivisions(db)
})

ipcMain.handle(
  'divisions:addCategory',
  (_evt, divisionId: string, categoryId: string, depth = 1) => {
    const db = getTournamentDb()
    return addCategoryToDivision(db, divisionId, categoryId, depth)
  }
)

ipcMain.handle('divisions:removeCategory', (_evt, divisionId: string, categoryId: string) => {
  const db = getTournamentDb()
  return removeCategoryFromDivision(db, divisionId, categoryId)
})

ipcMain.handle('divisions:listCategories', (_evt, divisionId: string) => {
  const db = getTournamentDb()
  return listCategoriesForDivision(db, divisionId)
})

ipcMain.handle(
  'divisions:updateCategoryLink',
  (_evt, divisionId: string, categoryId: string, patch: DivisionCategoryPatch) => {
    const db = getTournamentDb()
    return updateDivisionCategoryLink(db, divisionId, categoryId, patch ?? {})
  }
)

ipcMain.handle('divisions:listForCategory', (_evt, categoryId: string) => {
  const db = getTournamentDb()
  return listDivisionsForCategory(db, categoryId)
})

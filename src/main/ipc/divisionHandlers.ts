import {
  addCategoryToDivision,
  addPlayerToDivision,
  createDivision,
  deleteDivision,
  getDivision,
  getDivisionView,
  listAllDivisions,
  listCategoriesForDivision,
  listDivisionIdsForPlayer,
  listDivisionViews,
  listDivisionsForCategory,
  listPlayerIdsForDivision,
  removeCategoryFromDivision,
  removePlayerFromDivision,
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

ipcMain.handle('divisions:getView', (_evt, id: string) => {
  const db = getTournamentDb()
  return getDivisionView(db, id)
})

ipcMain.handle('divisions:listViews', () => {
  const db = getTournamentDb()
  return listDivisionViews(db)
})

ipcMain.handle('divisions:addPlayer', (_evt, divisionId: string, playerId: string) => {
  const db = getTournamentDb()
  return addPlayerToDivision(db, divisionId, playerId)
})

ipcMain.handle('divisions:removePlayer', (_evt, divisionId: string, playerId: string) => {
  const db = getTournamentDb()
  return removePlayerFromDivision(db, divisionId, playerId)
})

ipcMain.handle('divisions:listPlayers', (_evt, divisionId: string) => {
  const db = getTournamentDb()
  return listPlayerIdsForDivision(db, divisionId)
})

ipcMain.handle('divisions:listForPlayer', (_evt, playerId: string) => {
  const db = getTournamentDb()
  return listDivisionIdsForPlayer(db, playerId)
})

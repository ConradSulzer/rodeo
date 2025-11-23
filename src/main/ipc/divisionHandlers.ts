import {
  addCategoryToDivision,
  addPlayerToDivision,
  createDivision,
  deleteDivision,
  getDivision,
  listDivisions,
  listCategoriesForDivision,
  listDivisionIdsForPlayer,
  listDivisionsForCategory,
  listPlayerIdsForDivision,
  moveDivision,
  reorderDivisions,
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
import { withStandingsRefresh } from '../state/tournamentStore'

ipcMain.handle('divisions:create', (_evt, data: NewDivision) => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => createDivision(db, data))
})

ipcMain.handle('divisions:update', (_evt, id: string, patch: PatchDivision) => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => updateDivision(db, id, patch))
})

ipcMain.handle('divisions:delete', (_evt, id: string) => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => deleteDivision(db, id))
})

ipcMain.handle('divisions:get', (_evt, id: string) => {
  const db = getTournamentDb()
  return getDivision(db, id)
})

ipcMain.handle('divisions:list', () => {
  const db = getTournamentDb()
  return listDivisions(db)
})

ipcMain.handle('divisions:move', (_evt, id: string, direction: 'up' | 'down') => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => moveDivision(db, id, direction))
})

ipcMain.handle('divisions:reorder', (_evt, orderedIds: string[]) => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => reorderDivisions(db, orderedIds))
})

ipcMain.handle(
  'divisions:addCategory',
  (_evt, divisionId: string, categoryId: string, depth = 1, order?: number) => {
    const db = getTournamentDb()
    return withStandingsRefresh(db, () =>
      addCategoryToDivision(db, divisionId, categoryId, depth, order)
    )
  }
)

ipcMain.handle('divisions:removeCategory', (_evt, divisionId: string, categoryId: string) => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => removeCategoryFromDivision(db, divisionId, categoryId))
})

ipcMain.handle('divisions:listCategories', (_evt, divisionId: string) => {
  const db = getTournamentDb()
  return listCategoriesForDivision(db, divisionId)
})

ipcMain.handle(
  'divisions:updateCategoryLink',
  (_evt, divisionId: string, categoryId: string, patch: DivisionCategoryPatch) => {
    const db = getTournamentDb()
    return withStandingsRefresh(db, () =>
      updateDivisionCategoryLink(db, divisionId, categoryId, patch ?? {})
    )
  }
)

ipcMain.handle('divisions:listForCategory', (_evt, categoryId: string) => {
  const db = getTournamentDb()
  return listDivisionsForCategory(db, categoryId)
})


ipcMain.handle('divisions:addPlayer', (_evt, divisionId: string, playerId: string) => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => addPlayerToDivision(db, divisionId, playerId))
})

ipcMain.handle('divisions:removePlayer', (_evt, divisionId: string, playerId: string) => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => removePlayerFromDivision(db, divisionId, playerId))
})

ipcMain.handle('divisions:listPlayers', (_evt, divisionId: string) => {
  const db = getTournamentDb()
  return listPlayerIdsForDivision(db, divisionId)
})

ipcMain.handle('divisions:listForPlayer', (_evt, playerId: string) => {
  const db = getTournamentDb()
  return listDivisionIdsForPlayer(db, playerId)
})

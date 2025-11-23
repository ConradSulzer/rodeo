import {
  createMetric,
  deleteMetric,
  getMetric,
  listAllMetrics,
  listMetricViews,
  listMetricsWithCategories,
  NewMetric,
  PatchMetric,
  updateMetric
} from '@core/tournaments/metrics'
import { getTournamentDb } from '@core/tournaments/tournaments'
import { ipcMain } from 'electron'
import { withStandingsRefresh } from '../state/tournamentStore'

ipcMain.handle('metrics:create', (_evt, data: NewMetric) => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => createMetric(db, data))
})

ipcMain.handle('metrics:update', (_evt, id: string, data: PatchMetric) => {
  const db = getTournamentDb()

  return withStandingsRefresh(db, () => updateMetric(db, id, data))
})

ipcMain.handle('metrics:delete', (_evt, id) => {
  const db = getTournamentDb()
  return withStandingsRefresh(db, () => deleteMetric(db, id))
})

ipcMain.handle('metrics:get', (_evt, id: string) => {
  const db = getTournamentDb()
  const metric = getMetric(db, id)

  return metric
})

ipcMain.handle('metrics:list', () => {
  const db = getTournamentDb()
  const metrics = listAllMetrics(db)

  return metrics
})

ipcMain.handle('metrics:listWithCategories', () => {
  const db = getTournamentDb()
  return listMetricsWithCategories(db)
})

ipcMain.handle('metrics:listViews', () => {
  const db = getTournamentDb()
  return listMetricViews(db)
})

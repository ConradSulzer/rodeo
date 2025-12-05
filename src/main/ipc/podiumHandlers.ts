import { ipcMain } from 'electron'
import { ulid } from 'ulid'
import { getTournamentDb } from '@core/tournaments/tournaments'
import { applyPodiumEvent, getState } from '../state/tournamentStore'
import {
  listPodiumEvents,
  type PodiumEvent,
  type PodiumEventInput
} from '@core/tournaments/podiumEvents'
import { serializePodiumAdjustments } from '@core/tournaments/podiumAdjustments'

ipcMain.handle('podium:events:record', (_evt, input: PodiumEventInput) => {
  const db = getTournamentDb()

  const event: PodiumEvent = {
    id: ulid(),
    ts: Date.now(),
    ...input
  }

  applyPodiumEvent(db, event)

  return { success: true }
})

ipcMain.handle('podium:events:list', () => {
  const db = getTournamentDb()
  return listPodiumEvents(db)
})

ipcMain.handle('podium:adjustments:get', () => {
  const state = getState()
  return serializePodiumAdjustments(state.podiumAdjustments)
})

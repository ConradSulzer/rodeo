import { ipcMain } from 'electron'
import { listAllEvents, type ScoreEventInput } from '@core/events/events'
import { getTournamentDb } from '@core/tournaments/tournaments'
import { applyEvent, getState } from '../state/tournamentStore'
import { buildEventsFromInputs } from '@core/events/eventInputs'

ipcMain.handle('events:recordMany', async (_evt, submissions: ScoreEventInput[]) => {
  const db = getTournamentDb()
  const state = getState()

  const validation = await buildEventsFromInputs(db, submissions, state.results)

  if (!validation.success) {
    return { success: false, errors: validation.errors }
  }

  const errors: string[] = []

  for (const event of validation.events) {
    const result = applyEvent(db, event)

    if (result.length) {
      errors.push(...result.map((err) => err.message))
      break
    }
  }

  return { success: errors.length === 0, errors }
})

ipcMain.handle('events:list', () => {
  const db = getTournamentDb()
  return listAllEvents(db)
})

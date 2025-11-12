import { ipcMain } from 'electron'

import { listAllEvents, getEvent, type EventId, RodeoEvent } from '@core/events/events'
import { getTournamentDb } from '@core/tournaments/tournaments'
import { cloneResults, type Results } from '@core/tournaments/results'
import {
  scoreEventAttrsSchema,
  type ScoreEventAttrs,
  toDomainEvents
} from '@core/events/eventInputs'
import { AppDatabase } from '@core/db/db'
import { applyEvent, getState } from '../state/tournamentStore'
import { Timestamp } from '@core/types/Shared'
import { applyBatch } from '@core/events/eventReducer'

ipcMain.handle('events:recordMany', async (_evt, submissions: ScoreEventAttrs[]) => {
  const db = getTournamentDb()
  const state = getState()
  const prep = await prepare(db, state.results, submissions, Date.now())

  if (!prep.ok) {
    return { success: false, errors: prep.errors }
  }

  const applyErrors = []

  for (const event of prep.events) {
    const errs = applyEvent(db, event)
    if (errs.length) {
      return { success: false, errors: errs.map((e) => e.message) }
    }
  }

  if (!applyErrors.length) return { success: false, errors: applyErrors }

  return { success: true, errors: [] }
})

ipcMain.handle('events:list', () => {
  const db = getTournamentDb()
  return listAllEvents(db)
})

type PrepOk = { ok: true; events: RodeoEvent[]; nextResults: Results }
type PrepErr = { ok: false; errors: string[] }

async function prepare(
  db: AppDatabase,
  current: Results,
  submissions: ScoreEventAttrs[],
  ts: Timestamp
): Promise<PrepOk | PrepErr> {
  // 1) validate attrs via Zod
  const parsed: ScoreEventAttrs[] = []
  const errs: string[] = []

  for (const s of submissions) {
    const r = scoreEventAttrsSchema.safeParse(s)
    if (!r.success) {
      errs.push(...r.error.issues.map((i) => i.message))
    } else {
      parsed.push(r.data)
    }
  }
  if (errs.length) return { ok: false, errors: errs }

  // 2) materialize events
  const events = toDomainEvents(parsed, ts)

  // 3) simulate on a clone
  const sim = cloneResults(current)
  const resolve = (id: EventId) => getEvent(db, id)
  const { errors } = applyBatch(sim, events, resolve)

  if (errors.length) {
    return { ok: false, errors: errors.map((e) => e.message) }
  }

  return { ok: true, events, nextResults: sim }
}

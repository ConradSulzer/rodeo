import { ipcMain } from 'electron'
import { ulid } from 'ulid'
import type { ItemCorrected, ItemScored, ItemVoided, ScoreEventInput } from '@core/events/events'
import { getTournamentDb } from '@core/tournaments/tournaments'
import { getScoreable } from '@core/tournaments/scoreables'
import { applyEvent } from '../state/tournamentStore'

ipcMain.handle('events:recordMany', async (_evt, submissions: ScoreEventInput[]) => {
  const db = getTournamentDb()
  const errors: string[] = []

  for (const submission of submissions) {
    const scoreable = getScoreable(db, submission.scoreableId)
    const scoreableName = submission.scoreableName ?? scoreable?.label ?? 'Scoreable'
    if (!scoreable) {
      errors.push(`Scoreable not found for ${submission.scoreableId}`)
      continue
    }

    const baseEvent = {
      id: ulid(),
      ts: Date.now(),
      playerId: submission.playerId,
      scoreableId: submission.scoreableId,
      scoreableName,
      note: submission.note
    }

    let event: ItemScored | ItemCorrected | ItemVoided | null = null

    const hasValue = submission.value !== undefined && submission.value !== null

    if (submission.void && submission.priorEventId) {
      event = {
        type: 'ItemVoided',
        ...baseEvent,
        priorEventId: submission.priorEventId
      }
    } else if (submission.priorEventId !== undefined && hasValue) {
      event = {
        type: 'ItemCorrected',
        ...baseEvent,
        priorEventId: submission.priorEventId,
        value: submission.value as number
      }
    } else if (hasValue) {
      event = {
        type: 'ItemScored',
        ...baseEvent,
        value: submission.value as number
      }
    }

    if (!event) {
      errors.push('Invalid score submission payload')
      continue
    }

    const result = applyEvent(db, event)
    if (result.length) {
      errors.push(...result.map((err) => err.message))
    }
  }

  return {
    success: errors.length === 0,
    errors
  }
})

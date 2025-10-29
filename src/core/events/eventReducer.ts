import { EventId, RodeoEvent, sortEventsByTime } from './events'
import { getOrCreatePlayerItems, Results } from '../tournaments/results'

type EventError = {
  status: 'error'
  event: RodeoEvent
  message: string
}

type ResolveFn = (id: EventId) => RodeoEvent | undefined

export function applyEvent(results: Results, e: RodeoEvent, resolve: ResolveFn): EventError[] {
  const errors: EventError[] = []

  const playerItems = getOrCreatePlayerItems(results, e.playerId)
  const current = playerItems.get(e.scoreableId)

  // Idempotence, ignore if this event is the current source
  if (current?.srcEventId === e.id) return errors

  // Make sure not to process stale or out of order events
  if (current && e.ts < current.updatedAt) {
    errors.push(createError(e, `Trying to apply event that is older than the current result.`))
    return errors
  }

  switch (e.type) {
    case 'ItemScored': {
      const existing = playerItems.get(e.scoreableId)

      if (existing) {
        errors.push(
          createError(e, `${e.scoreableName} already exists; void or correct the current result.`)
        )
        break
      }

      playerItems.set(e.scoreableId, {
        name: e.scoreableName,
        value: e.value,
        srcEventId: e.id,
        createdAt: e.ts,
        updatedAt: e.ts
      })

      break
    }

    case 'ItemCorrected': {
      const prior = resolve(e.priorEventId)

      if (!prior) {
        errors.push(createError(e, 'No prior event exists to update.'))
      } else if (prior.playerId !== e.playerId) {
        errors.push(createError(e, "Player doesn't match the prior event's player."))
      } else if (prior.scoreableId !== e.scoreableId) {
        errors.push(createError(e, "Item doesn't match the prior event's item."))
      } else if (!current) {
        errors.push(
          createError(e, `Player does not have an existing ${e.scoreableName} to correct.`)
        )
      } else if (current.srcEventId !== e.priorEventId) {
        errors.push(createError(e, 'Prior event is not the currently effective source.'))
      } else {
        playerItems.set(e.scoreableId, {
          ...current,
          value: e.value,
          srcEventId: e.id,
          updatedAt: e.ts
        })
      }

      break
    }

    case 'ItemVoided': {
      const prior = resolve(e.priorEventId)

      if (!prior) {
        errors.push(createError(e, 'No prior event exists to void.'))
      } else if (prior.playerId !== e.playerId) {
        errors.push(createError(e, "Player doesn't match the prior event's player."))
      } else if (prior.scoreableId !== e.scoreableId) {
        errors.push(createError(e, "Item doesn't match the prior event's item."))
      } else if (!current) {
        errors.push(createError(e, `No current ${e.scoreableName} exists to void.`))
        break
      } else if (current.srcEventId !== e.priorEventId) {
        errors.push(createError(e, 'Prior event is not the currently effective source.'))
      } else {
        playerItems.delete(e.scoreableId)
      }
      break
    }

    default:
      assertNever(e)
  }

  return errors
}

export function applyBatch(
  results: Results,
  events: RodeoEvent[],
  resolve: ResolveFn
): { results: Results; errors: EventError[] } {
  const errors: EventError[] = []
  for (const e of sortEventsByTime(events)) {
    errors.push(...applyEvent(results, e, resolve))
  }
  return { results, errors }
}

function assertNever(_x: never): never {
  throw new Error('Unexpected event type')
}

function createError(event: RodeoEvent, message: string): EventError {
  return { status: 'error', event, message }
}

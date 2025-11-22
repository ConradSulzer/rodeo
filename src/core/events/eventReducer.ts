import { EventId, ItemStateChanged, RodeoEvent, ScorecardVoided, sortEventsByTime } from './events'
import { getOrCreatePlayerItems, ItemResult, Results } from '../tournaments/results'

type EventError = {
  status: 'error'
  event: RodeoEvent
  message: string
}

type ResolveFn = (id: EventId) => RodeoEvent | undefined

export function reduceEvent(results: Results, e: RodeoEvent, resolve: ResolveFn): EventError[] {
  const errors: EventError[] = []

  // Void clears the player's scorecard
  // TODO: Come back and think about this behavior some more, can either fix here or down stream handle empties
  if (isVoidEvent(e)) {
    results.set(e.playerId, new Map())
    return errors
  }

  const newEvent: ItemStateChanged = e
  const playerItems = getOrCreatePlayerItems(results, newEvent.playerId)
  const current = playerItems.get(newEvent.scoreableId)

  // Ignore self-applied replay
  if (current?.srcEventId === newEvent.id) return errors

  // Reject stale events
  if (current && newEvent.ts < current.updatedAt) {
    errors.push(
      createError(newEvent, 'Trying to apply event that is older than the current result.')
    )
    return errors
  }

  // State-specific validation (only 'value' needs a numeric check)
  if (
    newEvent.state === 'value' &&
    (typeof newEvent.value !== 'number' || Number.isNaN(newEvent.value))
  ) {
    errors.push(createError(newEvent, 'Value state requires a numeric value.'))
    return errors
  }

  // Common prior/chain validation (covers both 'value' and 'empty')
  const preErr = validatePriorChain(current, newEvent, resolve)
  if (preErr) {
    errors.push(preErr)
    return errors
  }

  // Write the new item state
  const createdAt = current ? current.createdAt : newEvent.ts
  const base = {
    srcEventId: newEvent.id,
    createdAt,
    updatedAt: newEvent.ts
  }

  const next =
    newEvent.state === 'value'
      ? ({ status: 'value', value: newEvent.value, ...base } as const)
      : ({ status: 'empty', ...base } as const)

  playerItems.set(newEvent.scoreableId, next)
  return errors
}

export function reduceBatch(
  results: Results,
  events: RodeoEvent[],
  resolve: ResolveFn
): { results: Results; errors: EventError[] } {
  const errors: EventError[] = []
  for (const e of sortEventsByTime(events)) {
    errors.push(...reduceEvent(results, e, resolve))
  }
  return { results, errors }
}

function createError(event: RodeoEvent, message: string): EventError {
  return { status: 'error', event, message }
}

function isItemEvent(event: RodeoEvent): event is ItemStateChanged {
  return event.type === 'ItemStateChanged'
}

function isVoidEvent(event: RodeoEvent): event is ScorecardVoided {
  return event.type == 'ScorecardVoided'
}

function validatePriorEvent(
  newEvent: ItemStateChanged,
  current: ItemResult | undefined,
  resolve: ResolveFn
): { prior?: RodeoEvent; error?: EventError } {
  const id = newEvent.priorEventId

  if (!id) return { error: createError(newEvent, 'No prior id supplied.') }

  const prior = resolve(id)

  if (!prior) return { error: createError(newEvent, 'No prior event exists to update.') }
  if (!isItemEvent(prior))
    return { error: createError(newEvent, 'Prior event is not an item event.') }

  if (prior.playerId !== newEvent.playerId || prior.scoreableId !== newEvent.scoreableId) {
    return { error: createError(newEvent, 'Prior event does not match player/item.') }
  }

  if (!current || current.srcEventId !== id) {
    return { error: createError(newEvent, 'Prior event is not the currently effective source.') }
  }

  return { prior }
}

function requirePriorEventIfCurrentExists(
  current: ItemResult | undefined,
  newEvent: ItemStateChanged
): EventError | undefined {
  if (current && !newEvent.priorEventId) {
    return createError(
      newEvent,
      `${newEvent.scoreableId} already exists; reference the current event to update.`
    )
  }
  return undefined
}

function validatePriorChain(
  current: ItemResult | undefined,
  e: ItemStateChanged,
  resolve: ResolveFn
): EventError | null {
  // If something already exists, require a priorEventId
  const missingPrior = requirePriorEventIfCurrentExists(current, e)
  if (missingPrior) return missingPrior

  // If a priorEventId is present, validate it fully
  if (e.priorEventId) {
    const { error } = validatePriorEvent(e, current, resolve)
    if (error) return error
  }

  return null
}

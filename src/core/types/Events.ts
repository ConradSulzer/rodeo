import { ULID } from './Ids'
import { Timestamp } from './Tournament'

export type EventId = ULID
export type EventType = 'ItemMeasured' | 'ItemCorrected' | 'ItemVoided'

export interface BaseEvent {
  id: EventId
  ts: Timestamp
  playerId: ULID
  itemId: ULID
  itemName: string
  note?: string
}

export interface ItemScored extends BaseEvent {
  type: 'ItemScored'
  value: number
}

export interface ItemCorrected extends BaseEvent {
  type: 'ItemCorrected'
  priorEventId: EventId
  value: number
}

export interface ItemVoided extends BaseEvent {
  type: 'ItemVoided'
  priorEventId: EventId
}

export type RodeoEvent = ItemScored | ItemCorrected | ItemVoided

export interface EventStore {
  append(events: RodeoEvent[]): void
  resolve(id: EventId): RodeoEvent | undefined
  loadAll(): RodeoEvent[]
}

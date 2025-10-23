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

export const isMeasured = (e: RodeoEvent): e is ItemScored => e.type === 'ItemScored'
export const isCorrected = (e: RodeoEvent): e is ItemCorrected => e.type === 'ItemCorrected'
export const isVoided = (e: RodeoEvent): e is ItemVoided => e.type === 'ItemVoided'

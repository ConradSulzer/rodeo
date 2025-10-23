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

export interface ItemMeasured extends BaseEvent {
  type: 'ItemMeasured'
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

export type RodeoEvent = ItemMeasured | ItemCorrected | ItemVoided

export const isMeasured = (e: RodeoEvent): e is ItemMeasured => e.type === 'ItemMeasured'
export const isCorrected = (e: RodeoEvent): e is ItemCorrected => e.type === 'ItemCorrected'
export const isVoided = (e: RodeoEvent): e is ItemVoided => e.type === 'ItemVoided'

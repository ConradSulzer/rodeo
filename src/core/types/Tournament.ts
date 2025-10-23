import { EventId } from './events'
import { ULID } from './Ids'

export type Timestamp = number

export interface Tournament {
  id: ULID
  name: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Player {
  id: ULID
  first: string
  last: string
  identifier: string // email, cell phone, some info we get from registration to distinguish John Smith from John Smith
  divisions: ULID[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ScoreableItem {
  id: ULID
  name: string
  unit: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type RankDir = 'asc' | 'desc' // asc = lower wins, desc = higher wins

export interface Category {
  id: ULID
  name: string
  itemIds: ULID[]
  direction: RankDir
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Division {
  id: ULID
  name: string
  categoryIds: ULID[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type PlayerItems = Map<ULID, ItemResult>

export type Results = Map<ULID, PlayerItems> // playerId -> itemId -> ItemResult

export type ItemResult = {
  name: string
  value: number
  srcEventId: EventId // last event responsible for this value
  createdAt: Timestamp
  updatedAt: Timestamp
}

import { ULID } from 'ulid'
import { Timestamp } from './Shared'

export interface Scoreable {
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

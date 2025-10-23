import { RodeoEvent } from '../types/events'

export function sortEventsByTime(events: RodeoEvent[]): RodeoEvent[] {
  return [...events].sort((a, b) => (a.ts === b.ts ? a.id.localeCompare(b.id) : a.ts - b.ts))
}

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { FiEye } from 'react-icons/fi'
import type { RodeoEvent } from '@core/events/events'
import { ManageSectionShell } from '@renderer/components/ManageSectionShell'
import {
  renderCrudTableHeader,
  type CrudTableColumn
} from '@renderer/components/crud/CrudTableHeader'
import { useUniversalSearchSort } from '@renderer/hooks/useUniversalSearchSort'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@renderer/components/ui/table'
import { MdOutlineSubdirectoryArrowRight } from 'react-icons/md'
import { Button } from '@renderer/components/ui/button'
import { EventDetailsModal } from './EventDetailsModal'

export type EventRow = {
  id: string
  ts: number
  type: RodeoEvent['type']
  playerId: string
  playerName: string
  scoreableId?: string
  scoreableLabel?: string
  state?: 'value' | 'empty'
  value?: number
  note?: string
  priorEventId?: string
}

type EventTypeFilter = 'all' | RodeoEvent['type']

const columns: ReadonlyArray<CrudTableColumn<EventRow, 'actions'>> = [
  { key: 'ts', label: 'Time', sortable: true, align: 'left' },
  { key: 'playerName', label: 'Player', sortable: true },
  { key: 'scoreableLabel', label: 'Scoreable', sortable: false },
  { key: 'value' as keyof EventRow, label: 'Value', sortable: false, align: 'right' },
  { key: 'id', label: 'Event IDs', sortable: false },
  { key: 'actions', label: 'Actions', sortable: false, align: 'right' }
]

const EVENT_TYPES: EventTypeFilter[] = ['all', 'ItemStateChanged', 'ScorecardVoided']

const renderTimestamp = (ts: number) => {
  const timeString = new Date(ts).toLocaleString()
  const [date, time] = timeString.split(', ')

  return (
    <div className="flex flex-col">
      <span className="font-medium">{date}</span>
      <span className="text-xs ro-text-muted">{time}</span>
    </div>
  )
}

export function EventsSection() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<EventRow[]>([])
  const [typeFilter, setTypeFilter] = useState<EventTypeFilter>('all')
  const [detailsEvent, setDetailsEvent] = useState<EventRow | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      const [rawEvents, players, scoreables] = await Promise.all([
        window.api.events.list(),
        window.api.players.list(),
        window.api.scoreables.list()
      ])
      const playerMap = new Map(players.map((player) => [player.id, player.displayName]))
      const scoreableMap = new Map(scoreables.map((scoreable) => [scoreable.id, scoreable.label]))
      const rows: EventRow[] = rawEvents
        .map((event) => ({
          id: event.id,
          ts: event.ts,
          type: event.type,
          playerId: event.playerId,
          playerName: playerMap.get(event.playerId) ?? event.playerId,
          scoreableId: 'scoreableId' in event ? event.scoreableId : undefined,
          scoreableLabel:
            'scoreableId' in event && event.scoreableId
              ? (scoreableMap.get(event.scoreableId) ?? event.scoreableId)
              : undefined,
          state: event.type === 'ItemStateChanged' ? event.state : undefined,
          value:
            event.type === 'ItemStateChanged' && event.state === 'value' ? event.value : undefined,
          note: event.note,
          priorEventId: 'priorEventId' in event ? event.priorEventId : undefined
        }))
        .sort((a, b) => b.ts - a.ts)
      setEvents(rows)
    } catch (error) {
      console.error('Failed to load events', error)
      toast.error('Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
    const unsubscribe = window.api.tournaments.subscribe(() => fetchEvents())
    return () => unsubscribe()
  }, [fetchEvents])

  const filteredByType = useMemo(() => {
    if (typeFilter === 'all') return events
    return events.filter((event) => event.type === typeFilter)
  }, [events, typeFilter])

  const { results, query, setQuery, sort, toggleSort } = useUniversalSearchSort<EventRow>({
    items: filteredByType,
    searchKeys: ['playerName', 'playerId'],
    initialSort: { key: 'ts', direction: 'desc' }
  })

  const filterSelect = (
    <div className="flex space-x-3 text-sm items-center">
      <span>Events Filter</span>
      <select
        className="rounded-md border ro-border bg-transparent px-3 py-1 text-xs font-mono uppercase"
        value={typeFilter}
        onChange={(event) => setTypeFilter(event.target.value as EventTypeFilter)}
      >
        {EVENT_TYPES.map((type) => (
          <option key={type} value={type}>
            {type === 'all' ? 'All Events' : type}
          </option>
        ))}
      </select>
    </div>
  )

  const renderRow = useCallback((event: EventRow): ReactNode => {
    const priorId = event.priorEventId
    return (
      <TableRow key={event.id}>
        <TableCell className="whitespace-nowrap text-xs font-mono">
          {renderTimestamp(event.ts)}
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span className="font-medium">{event.playerName}</span>
            <span className="text-xs ro-text-muted">{event.playerId}</span>
          </div>
        </TableCell>
        <TableCell>
          {event.scoreableLabel ? (
            <div className="flex flex-col">
              <span className="font-medium">{event.scoreableLabel}</span>
              <span className="text-xs ro-text-muted">{event.type}</span>
            </div>
          ) : (
            <span className="text-xs ro-text-muted">{event.type}</span>
          )}
        </TableCell>
        <TableCell align="right">
          {event.type === 'ScorecardVoided'
            ? '—'
            : event.state === 'empty'
              ? 'Empty'
              : typeof event.value === 'number'
                ? event.value
                : '—'}
        </TableCell>
        <TableCell className="font-mono text-xs ro-text-main break-all">
          <div className="flex flex-col">
            <span>{event.id}</span>
            {priorId && (
              <span className="flex space-x-1">
                <MdOutlineSubdirectoryArrowRight />
                {priorId}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell align="right">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setDetailsEvent(event)}
            aria-label={`View event ${event.id}`}
          >
            <FiEye />
          </Button>
        </TableCell>
      </TableRow>
    ) as ReactNode
  }, [])

  return (
    <ManageSectionShell
      title="Events"
      description="Audit the underlying scoring events."
      searchPlaceholder="Search events"
      searchValue={query}
      onSearchChange={setQuery}
      actions={filterSelect}
    >
      {loading ? (
        <div className="flex flex-1 items-center justify-center ro-text-muted">
          Loading events...
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <Table containerClassName="h-full">
              <TableHeader>
                <TableRow>
                  {renderCrudTableHeader<EventRow, 'actions'>({ columns, sort, toggleSort })}
                </TableRow>
              </TableHeader>
              <TableBody>{results.map(renderRow)}</TableBody>
            </Table>
          </div>
        </div>
      )}
      <EventDetailsModal event={detailsEvent} onClose={() => setDetailsEvent(null)} />
    </ManageSectionShell>
  )
}

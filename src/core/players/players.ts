import type { AppDatabase } from '@core/db/db'
import { player as pl } from '@core/db/schema'
import type { DivisionRecord } from '@core/tournaments/divisions'
import { eq } from 'drizzle-orm'
import { ulid } from 'ulid'
import type { MetricRecord } from '@core/tournaments/metrics'
import { loadDivisionMetricDirectory } from '@core/tournaments/divisions'

export type PlayerRecord = typeof pl.$inferSelect
export type PlayerMetric = Pick<MetricRecord, 'id' | 'label'>

export type PlayerViewable = Pick<PlayerRecord, 'id' | 'displayName' | 'email'>

export type EnrichedPlayer = PlayerRecord & {
  divisions: DivisionRecord[]
  metrics: PlayerMetric[]
}

type PlayerContactFields = {
  cellPhone?: string | null
  emergencyContact?: string | null
}

export type NewPlayer = {
  firstName: string
  lastName: string
  displayName: string
  email: string
} & PlayerContactFields

export type PatchPlayer = Partial<NewPlayer>
export type PlayerId = string

const now = () => Date.now()

export function createPlayer(db: AppDatabase, data: NewPlayer): string {
  const id = ulid()
  const t = now()
  const { cellPhone = null, emergencyContact = null, ...rest } = data
  db.insert(pl)
    .values({ id, ...rest, cellPhone, emergencyContact, createdAt: t, updatedAt: t })
    .run()
  return id
}

export function updatePlayer(db: AppDatabase, id: string, patch: PatchPlayer) {
  if (!Object.keys(patch).length) return false

  const { cellPhone, emergencyContact, ...rest } = patch
  const updateData: Partial<typeof pl.$inferInsert> = {
    ...rest,
    updatedAt: now()
  }

  if (cellPhone !== undefined) updateData.cellPhone = cellPhone ?? null
  if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact ?? null

  const result = db.update(pl).set(updateData).where(eq(pl.id, id)).run()

  return result.changes > 0
}

export function deletePlayer(db: AppDatabase, id: string) {
  const result = db.delete(pl).where(eq(pl.id, id)).run()

  return result.changes > 0
}

export function listEnrichedPlayers(db: AppDatabase): EnrichedPlayer[] {
  const players = db.query.player
    .findMany({
      orderBy: (player, { asc }) => [asc(player.displayName)],
      with: {
        playerDivisions: {
          with: { division: true }
        }
      }
    })
    .sync()

  if (!players.length) return []

  const cleaned = players.map(({ playerDivisions, ...rest }) => ({
    ...rest,
    divisions: cleanPlayerDivisions({ playerDivisions }) // [{ id }]
  }))

  const divisionMetricDirectory = loadDivisionMetricDirectory(db)

  const enrichedPlayers = cleaned.map(({ divisions, ...rest }) => {
    const uniqueMetrics = new Map<string, PlayerMetric>()

    for (const { id: divisionId } of divisions) {
      const divisionMetrics = divisionMetricDirectory.get(divisionId) ?? []
      for (const metric of divisionMetrics) {
        if (!uniqueMetrics.has(metric.id)) {
          uniqueMetrics.set(metric.id, metric)
        }
      }
    }

    const metrics = [...uniqueMetrics.values()].sort((a, b) => a.label.localeCompare(b.label))

    return {
      ...rest,
      divisions,
      metrics
    }
  })

  return enrichedPlayers
}

export function listViewablePlayers(db: AppDatabase): PlayerViewable[] {
  const players = db.query.player
    .findMany({
      columns: {
        id: true,
        displayName: true,
        email: true
      },
      orderBy: (player, { asc }) => [asc(player.displayName)]
    })
    .sync()

  return players
}

function cleanPlayerDivisions(row: {
  playerDivisions: Array<{ division: DivisionRecord | null }>
}): DivisionRecord[] {
  return row.playerDivisions
    .map((link) => link.division)
    .filter((division): division is DivisionRecord => division !== null)
    .sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER
      return orderA === orderB ? a.name.localeCompare(b.name) : orderA - orderB
    })
}

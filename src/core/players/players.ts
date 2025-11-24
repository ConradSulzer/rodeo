import type { AppDatabase } from '@core/db/db'
import { player as pl, divisionCategory as dc, categoryMetric as cm } from '@core/db/schema'
import type { DivisionRecord } from '@core/tournaments/divisions'
import { sql, asc, eq } from 'drizzle-orm'
import { ulid } from 'ulid'
import type { MetricRecord } from '@core/tournaments/metrics'

export type PlayerRecord = typeof pl.$inferSelect
export type PlayerMetric = Pick<MetricRecord, 'id' | 'label'>

export type Player = PlayerRecord & {
  divisions: DivisionRecord[]
  metrics: string[]
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

export function listPlayers(db: AppDatabase): Player[] {
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
    const uniqueMetricIds = new Set<string>()

    for (const { id: divisionId } of divisions) {
      const metricIds = divisionMetricDirectory.get(divisionId) ?? []
      for (const metricId of metricIds) uniqueMetricIds.add(metricId)
    }

    return {
      ...rest,
      divisions,
      metrics: [...uniqueMetricIds]
    }
  })

  return enrichedPlayers
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

export function loadDivisionMetricDirectory(db: AppDatabase): Map<string, string[]> {
  const rows = db
    .select({
      divisionId: dc.divisionId,
      metricIdsJson: sql<string>`
        json_group_array(DISTINCT ${cm.metricId})
      `
    })
    .from(dc)
    .innerJoin(cm, eq(cm.categoryId, dc.categoryId))
    .groupBy(dc.divisionId)
    .orderBy(asc(dc.divisionId))
    .all() as { divisionId: string; metricIdsJson: string }[]

  return new Map(rows.map((row) => [row.divisionId, JSON.parse(row.metricIdsJson) as string[]]))
}

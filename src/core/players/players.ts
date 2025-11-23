import type { AppDatabase } from '@core/db/db'
import { division as dv, player as pl, playerDivision as pd } from '@core/db/schema'
import { listDivisionViews, type DivisionRecord } from '@core/tournaments/divisions'
import { eq, asc } from 'drizzle-orm'
import { ulid } from 'ulid'
import type { MetricRecord } from '@core/tournaments/metrics'

export type Player = typeof pl.$inferSelect

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
export type PlayerAssignment = {
  player: Player
  divisions: DivisionRecord[]
  divisionIds: string[]
  metrics: MetricRecord[]
  metricIds: string[]
}

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

export function getPlayer(db: AppDatabase, id: string): Player | undefined {
  return db.select().from(pl).where(eq(pl.id, id)).get()
}

export function listAllPlayers(db: AppDatabase): Player[] {
  return db.select().from(pl).orderBy(asc(pl.displayName)).all()
}

export function listAllPlayerAssignments(db: AppDatabase): PlayerAssignment[] {
  const players = listAllPlayers(db)
  if (!players.length) return []

  const assignments = db
    .select({ playerId: pd.playerId, division: dv })
    .from(pd)
    .innerJoin(dv, eq(pd.divisionId, dv.id))
    .orderBy(asc(pd.playerId), asc(dv.name))
    .all()

  const divisionMap = new Map<string, DivisionRecord[]>()
  for (const { playerId, division } of assignments) {
    if (!division) continue
    const list = divisionMap.get(playerId)
    if (list) {
      list.push(division)
    } else {
      divisionMap.set(playerId, [division])
    }
  }

  const divisionViews = listDivisionViews(db)
  const divisionViewMap = new Map(divisionViews.map((view) => [view.id, view]))

  return players.map((player) => {
    const divisions = divisionMap.get(player.id) ?? []
    const metricMap = new Map<string, MetricRecord>()

    for (const division of divisions) {
      const view = divisionViewMap.get(division.id)
      if (!view) continue
      for (const categoryView of view.categories) {
        for (const metric of categoryView.metrics) {
          if (!metricMap.has(metric.id)) {
            metricMap.set(metric.id, metric)
          }
        }
      }
    }

    const metrics = Array.from(metricMap.values()).sort((a, b) => a.label.localeCompare(b.label))

    return {
      player,
      divisions,
      divisionIds: divisions.map((division) => division.id),
      metrics,
      metricIds: metrics.map((metric) => metric.id)
    }
  })
}

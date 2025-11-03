import type { AppDatabase } from '@core/db/db'
import { division as dv, player as pl, playerDivision as pd } from '@core/db/schema'
import type { Division } from '@core/tournaments/divisions'
import { eq, asc } from 'drizzle-orm'
import { ulid } from 'ulid'

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
export type PlayerDivisionTuple = [Player, Division[]]

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

export function listAllPlayersWithDivisions(db: AppDatabase): PlayerDivisionTuple[] {
  const players = listAllPlayers(db)
  if (!players.length) return []

  const assignments = db
    .select({ playerId: pd.playerId, division: dv })
    .from(pd)
    .innerJoin(dv, eq(pd.divisionId, dv.id))
    .orderBy(asc(pd.playerId), asc(dv.name))
    .all()

  const divisionMap = new Map<string, Division[]>()
  for (const { playerId, division } of assignments) {
    if (!division) continue
    const list = divisionMap.get(playerId)
    if (list) {
      list.push(division)
    } else {
      divisionMap.set(playerId, [division])
    }
  }

  return players.map((player) => [player, divisionMap.get(player.id) ?? []])
}

import type { AppDatabase } from '@core/db/db'
import { player as pl } from '@core/db/schema'
import { eq, asc } from 'drizzle-orm'
import { ulid } from 'ulid'

export type Player = typeof pl.$inferSelect
export type NewPlayer = Omit<Player, 'id' | 'createdAt' | 'updatedAt'>
export type PatchPlayer = Partial<NewPlayer>

export type PlayerId = string

const now = () => Date.now()

export function createPlayer(db: AppDatabase, data: NewPlayer): string {
  const id = ulid()
  const t = now()
  db.insert(pl)
    .values({ id, ...data, createdAt: t, updatedAt: t })
    .run()
  return id
}

export function updatePlayer(db: AppDatabase, id: string, patch: PatchPlayer) {
  if (!Object.keys(patch).length) return false

  const result = db
    .update(pl)
    .set({ ...patch, updatedAt: now() })
    .where(eq(pl.id, id))
    .run()

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

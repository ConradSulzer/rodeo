import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { player as pl } from '@core/db/schema'
import { eq, asc } from 'drizzle-orm'
import { ulid } from 'ulid'

export type Player = typeof pl.$inferSelect
export type NewPlayer = typeof pl.$inferInsert
export type PlayerCreate = Omit<NewPlayer, 'id' | 'createdAt' | 'updatedAt'>

const now = () => Date.now()

export function createPlayer(db: BetterSQLite3Database, data: PlayerCreate): string {
  const id = ulid()
  const t = now()
  db.insert(pl)
    .values({ id, ...data, createdAt: t, updatedAt: t })
    .run()
  return id
}

export function updatePlayer(
  db: BetterSQLite3Database,
  id: string,
  patch: Partial<Omit<NewPlayer, 'id' | 'createdAt' | 'updatedAt'>>
): void {
  if (!Object.keys(patch).length) return
  db.update(pl)
    .set({ ...patch, updatedAt: now() })
    .where(eq(pl.id, id))
    .run()
}

export function deletePlayer(db: BetterSQLite3Database, id: string): void {
  db.delete(pl).where(eq(pl.id, id)).run()
}

export function getPlayer(db: BetterSQLite3Database, id: string): Player | undefined {
  return db.select().from(pl).where(eq(pl.id, id)).get()
}

export function listAllPlayers(db: BetterSQLite3Database): Player[] {
  return db.select().from(pl).orderBy(asc(pl.displayName)).all()
}

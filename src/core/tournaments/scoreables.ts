import { ulid } from 'ulid'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { scoreable as sc } from '@core/db/schema'
import { asc, eq } from 'drizzle-orm'

export type Scoreable = typeof sc.$inferSelect
export type NewScoreable = Omit<Scoreable, 'id' | 'createdAt' | 'updatedAt'>
export type PatchScoreable = Partial<NewScoreable>

const now = () => Date.now()

export function createScoreable(db: BetterSQLite3Database, data: NewScoreable): string {
  const id = ulid()
  const t = now()
  db.insert(sc)
    .values({ id, ...data, createdAt: t, updatedAt: t })
    .run()
  return id
}

export function updateScoreable(db: BetterSQLite3Database, id: string, patch: PatchScoreable) {
  if (!Object.keys(patch).length) return false

  const result = db
    .update(sc)
    .set({ ...patch, updatedAt: now() })
    .where(eq(sc.id, id))
    .run()

  return result.changes > 0
}

export function deleteScoreable(db: BetterSQLite3Database, id: string) {
  const result = db.delete(sc).where(eq(sc.id, id)).run()

  return result.changes > 0
}

export function getScoreable(db: BetterSQLite3Database, id: string): Scoreable | undefined {
  return db.select().from(sc).where(eq(sc.id, id)).get()
}

export function listAllScoreables(db: BetterSQLite3Database): Scoreable[] {
  return db.select().from(sc).orderBy(asc(sc.label)).all()
}

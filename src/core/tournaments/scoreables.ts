import { ulid } from 'ulid'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { scoreable as sc } from '@core/db/schema'
import { asc, eq } from 'drizzle-orm'

export type Scoreable = typeof sc.$inferSelect
export type NewScoreable = typeof sc.$inferInsert

const now = () => Date.now()

export function createScoreable(
  db: BetterSQLite3Database,
  data: Omit<NewScoreable, 'id' | 'createdAt' | 'updatedAt'>
): string {
  const id = ulid()
  const t = now()
  db.insert(sc)
    .values({ id, ...data, createdAt: t, updatedAt: t })
    .run()
  return id
}

export function updateScoreable(
  db: BetterSQLite3Database,
  id: string,
  patch: Partial<Pick<NewScoreable, 'label' | 'unit'>>
): void {
  if (!Object.keys(patch).length) return
  db.update(sc)
    .set({ ...patch, updatedAt: now() })
    .where(eq(sc.id, id))
    .run()
}

export function deleteScoreable(db: BetterSQLite3Database, id: string): void {
  db.delete(sc).where(eq(sc.id, id)).run()
}

export function getScoreable(db: BetterSQLite3Database, id: string): Scoreable | undefined {
  return db.select().from(sc).where(eq(sc.id, id)).get()
}

export function listAllScoreables(db: BetterSQLite3Database): Scoreable[] {
  return db.select().from(sc).orderBy(asc(sc.label)).all()
}

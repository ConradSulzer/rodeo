import { ulid } from 'ulid'
import type { AppDatabase } from '@core/db/db'
import { scoreable as sc } from '@core/db/schema'
import { asc, eq } from 'drizzle-orm'

export type Scoreable = typeof sc.$inferSelect
export type NewScoreable = Omit<Scoreable, 'id' | 'createdAt' | 'updatedAt'>
export type PatchScoreable = Partial<NewScoreable>

const now = () => Date.now()

export function createScoreable(db: AppDatabase, data: NewScoreable): string {
  const id = ulid()
  const t = now()
  db.insert(sc)
    .values({ id, ...data, createdAt: t, updatedAt: t })
    .run()
  return id
}

export function updateScoreable(db: AppDatabase, id: string, patch: PatchScoreable) {
  if (!Object.keys(patch).length) return false

  const result = db
    .update(sc)
    .set({ ...patch, updatedAt: now() })
    .where(eq(sc.id, id))
    .run()

  return result.changes > 0
}

export function deleteScoreable(db: AppDatabase, id: string) {
  const result = db.delete(sc).where(eq(sc.id, id)).run()

  return result.changes > 0
}

export function getScoreable(db: AppDatabase, id: string): Scoreable | undefined {
  return db.select().from(sc).where(eq(sc.id, id)).get()
}

export function listAllScoreables(db: AppDatabase): Scoreable[] {
  return db.select().from(sc).orderBy(asc(sc.label)).all()
}

import { ulid } from 'ulid'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import {
  category as cat,
  categoryScoreable as catScoreable
} from '@core/db/schema'
import { and, asc, eq } from 'drizzle-orm'

export type Category = typeof cat.$inferSelect
export type NewCategory = Omit<Category, 'id' | 'createdAt' | 'updatedAt'>
export type PatchCategory = Partial<NewCategory>

const now = () => Date.now()

export function createCategory(db: BetterSQLite3Database, data: NewCategory): string {
  const id = ulid()
  const t = now()

  db.insert(cat)
    .values({ id, ...data, createdAt: t, updatedAt: t })
    .run()

  return id
}

export function updateCategory(db: BetterSQLite3Database, id: string, patch: PatchCategory) {
  if (!Object.keys(patch).length) return false

  const result = db
    .update(cat)
    .set({ ...patch, updatedAt: now() })
    .where(eq(cat.id, id))
    .run()

  return result.changes > 0
}

export function deleteCategory(db: BetterSQLite3Database, id: string) {
  const result = db.delete(cat).where(eq(cat.id, id)).run()

  return result.changes > 0
}

export function getCategory(db: BetterSQLite3Database, id: string): Category | undefined {
  return db.select().from(cat).where(eq(cat.id, id)).get()
}

export function listAllCategories(db: BetterSQLite3Database): Category[] {
  return db.select().from(cat).orderBy(asc(cat.name)).all()
}

export function addScoreableToCategory(
  db: BetterSQLite3Database,
  categoryId: string,
  scoreableId: string
) {
  const result = db
    .insert(catScoreable)
    .values({ categoryId, scoreableId })
    .onConflictDoNothing()
    .run()

  return result.changes > 0
}

export function removeScoreableFromCategory(
  db: BetterSQLite3Database,
  categoryId: string,
  scoreableId: string
) {
  const result = db
    .delete(catScoreable)
    .where(and(eq(catScoreable.categoryId, categoryId), eq(catScoreable.scoreableId, scoreableId)))
    .run()

  return result.changes > 0
}

export function listScoreableIdsForCategory(db: BetterSQLite3Database, categoryId: string) {
  return db
    .select({ scoreableId: catScoreable.scoreableId })
    .from(catScoreable)
    .where(eq(catScoreable.categoryId, categoryId))
    .all()
    .map((row) => row.scoreableId)
}

export function listCategoryIdsForScoreable(db: BetterSQLite3Database, scoreableId: string) {
  return db
    .select({ categoryId: catScoreable.categoryId })
    .from(catScoreable)
    .where(eq(catScoreable.scoreableId, scoreableId))
    .all()
    .map((row) => row.categoryId)
}

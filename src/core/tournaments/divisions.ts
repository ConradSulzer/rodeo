import { ulid } from 'ulid'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { division as dv, divisionCategory as dvCategory } from '@core/db/schema'
import { and, asc, eq } from 'drizzle-orm'

export type Division = typeof dv.$inferSelect
export type NewDivision = Omit<Division, 'id' | 'createdAt' | 'updatedAt'>
export type PatchDivision = Partial<NewDivision>

const now = () => Date.now()

export function createDivision(db: BetterSQLite3Database, data: NewDivision): string {
  const id = ulid()
  const t = now()

  db.insert(dv)
    .values({ id, ...data, createdAt: t, updatedAt: t })
    .run()

  return id
}

export function updateDivision(db: BetterSQLite3Database, id: string, patch: PatchDivision) {
  if (!Object.keys(patch).length) return false

  const result = db
    .update(dv)
    .set({ ...patch, updatedAt: now() })
    .where(eq(dv.id, id))
    .run()

  return result.changes > 0
}

export function deleteDivision(db: BetterSQLite3Database, id: string) {
  const result = db.delete(dv).where(eq(dv.id, id)).run()

  return result.changes > 0
}

export function getDivision(db: BetterSQLite3Database, id: string): Division | undefined {
  return db.select().from(dv).where(eq(dv.id, id)).get()
}

export function listAllDivisions(db: BetterSQLite3Database): Division[] {
  return db.select().from(dv).orderBy(asc(dv.name)).all()
}

export function addCategoryToDivision(
  db: BetterSQLite3Database,
  divisionId: string,
  categoryId: string
) {
  const result = db
    .insert(dvCategory)
    .values({ divisionId, categoryId })
    .onConflictDoNothing()
    .run()

  return result.changes > 0
}

export function removeCategoryFromDivision(
  db: BetterSQLite3Database,
  divisionId: string,
  categoryId: string
) {
  const result = db
    .delete(dvCategory)
    .where(and(eq(dvCategory.divisionId, divisionId), eq(dvCategory.categoryId, categoryId)))
    .run()

  return result.changes > 0
}

export function listCategoryIdsForDivision(db: BetterSQLite3Database, divisionId: string) {
  return db
    .select({ categoryId: dvCategory.categoryId })
    .from(dvCategory)
    .where(eq(dvCategory.divisionId, divisionId))
    .all()
    .map((row) => row.categoryId)
}

export function listDivisionIdsForCategory(db: BetterSQLite3Database, categoryId: string) {
  return db
    .select({ divisionId: dvCategory.divisionId })
    .from(dvCategory)
    .where(eq(dvCategory.categoryId, categoryId))
    .all()
    .map((row) => row.divisionId)
}

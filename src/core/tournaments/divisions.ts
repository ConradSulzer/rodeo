import { ulid } from 'ulid'
import type { AppDatabase } from '@core/db/db'
import { division as dv, divisionCategory as dvCategory } from '@core/db/schema'
import { and, asc, eq } from 'drizzle-orm'

export type Division = typeof dv.$inferSelect
export type NewDivision = Omit<Division, 'id' | 'createdAt' | 'updatedAt'>
export type PatchDivision = Partial<NewDivision>
export type DivisionCategoryLink = typeof dvCategory.$inferSelect
export type DivisionCategoryPatch = Partial<Pick<DivisionCategoryLink, 'depth'>>

const now = () => Date.now()

export function createDivision(db: AppDatabase, data: NewDivision): string {
  const id = ulid()
  const t = now()

  db.insert(dv)
    .values({ id, ...data, createdAt: t, updatedAt: t })
    .run()

  return id
}

export function updateDivision(db: AppDatabase, id: string, patch: PatchDivision) {
  if (!Object.keys(patch).length) return false

  const result = db
    .update(dv)
    .set({ ...patch, updatedAt: now() })
    .where(eq(dv.id, id))
    .run()

  return result.changes > 0
}

export function deleteDivision(db: AppDatabase, id: string) {
  const result = db.delete(dv).where(eq(dv.id, id)).run()

  return result.changes > 0
}

export function getDivision(db: AppDatabase, id: string): Division | undefined {
  return db.select().from(dv).where(eq(dv.id, id)).get()
}

export function listAllDivisions(db: AppDatabase): Division[] {
  return db.select().from(dv).orderBy(asc(dv.name)).all()
}

export function addCategoryToDivision(
  db: AppDatabase,
  divisionId: string,
  categoryId: string,
  depth = 1
) {
  const normalizedDepth = Math.max(1, Math.floor(depth))

  const result = db
    .insert(dvCategory)
    .values({ divisionId, categoryId, depth: normalizedDepth })
    .onConflictDoUpdate({
      target: [dvCategory.divisionId, dvCategory.categoryId],
      set: { depth: normalizedDepth }
    })
    .run()

  return result.changes > 0
}

export function removeCategoryFromDivision(
  db: AppDatabase,
  divisionId: string,
  categoryId: string
) {
  const result = db
    .delete(dvCategory)
    .where(and(eq(dvCategory.divisionId, divisionId), eq(dvCategory.categoryId, categoryId)))
    .run()

  return result.changes > 0
}

export function updateDivisionCategoryLink(
  db: AppDatabase,
  divisionId: string,
  categoryId: string,
  patch: DivisionCategoryPatch
) {
  const updateData: Partial<typeof dvCategory.$inferInsert> = {}

  if (patch.depth !== undefined) {
    updateData.depth = Math.max(1, Math.floor(patch.depth))
  }

  if (!Object.keys(updateData).length) return false

  const result = db
    .update(dvCategory)
    .set(updateData)
    .where(and(eq(dvCategory.divisionId, divisionId), eq(dvCategory.categoryId, categoryId)))
    .run()

  return result.changes > 0
}

export function listCategoriesForDivision(
  db: AppDatabase,
  divisionId: string
): DivisionCategoryLink[] {
  return db
    .select({
      divisionId: dvCategory.divisionId,
      categoryId: dvCategory.categoryId,
      depth: dvCategory.depth
    })
    .from(dvCategory)
    .where(eq(dvCategory.divisionId, divisionId))
    .orderBy(asc(dvCategory.categoryId))
    .all()
}

export function listDivisionsForCategory(
  db: AppDatabase,
  categoryId: string
): DivisionCategoryLink[] {
  return db
    .select({
      divisionId: dvCategory.divisionId,
      categoryId: dvCategory.categoryId,
      depth: dvCategory.depth
    })
    .from(dvCategory)
    .where(eq(dvCategory.categoryId, categoryId))
    .orderBy(asc(dvCategory.divisionId))
    .all()
}

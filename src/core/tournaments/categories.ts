import { ulid } from 'ulid'
import type { AppDatabase } from '@core/db/db'
import { category as cat, categoryScoreable as catScoreable } from '@core/db/schema'
import { and, asc, eq } from 'drizzle-orm'

export type Category = typeof cat.$inferSelect
type CategoryWritableFields = Omit<Category, 'id' | 'createdAt' | 'updatedAt'>
export type NewCategory = Omit<CategoryWritableFields, 'rules'> & { rules?: string[] }
export type PatchCategory = Partial<Omit<CategoryWritableFields, 'rules'>> & { rules?: string[] }

const now = () => Date.now()

function normalizeCategoryRules(rules?: string[]): string[] {
  if (!Array.isArray(rules)) return []

  const cleaned = rules
    .filter((rule): rule is string => typeof rule === 'string')
    .map((rule) => rule.trim())
    .filter((rule) => rule.length > 0)

  return Array.from(new Set(cleaned))
}

export function createCategory(db: AppDatabase, data: NewCategory): string {
  const id = ulid()
  const t = now()
  const { rules, ...rest } = data
  const normalizedRules = normalizeCategoryRules(rules)

  db.insert(cat)
    .values({ id, ...rest, rules: normalizedRules, createdAt: t, updatedAt: t })
    .run()

  return id
}

export function updateCategory(db: AppDatabase, id: string, patch: PatchCategory) {
  if (!Object.keys(patch).length) return false

  const { rules, ...rest } = patch
  const updateData: Partial<typeof cat.$inferInsert> = { ...rest }

  if (rules !== undefined) {
    updateData.rules = normalizeCategoryRules(rules)
  }

  if (!Object.keys(updateData).length) return false

  updateData.updatedAt = now()

  const result = db.update(cat).set(updateData).where(eq(cat.id, id)).run()

  return result.changes > 0
}

export function deleteCategory(db: AppDatabase, id: string) {
  const result = db.delete(cat).where(eq(cat.id, id)).run()

  return result.changes > 0
}

export function getCategory(db: AppDatabase, id: string): Category | undefined {
  return db.select().from(cat).where(eq(cat.id, id)).get()
}

export function listAllCategories(db: AppDatabase): Category[] {
  return db.select().from(cat).orderBy(asc(cat.name)).all()
}

export function addScoreableToCategory(db: AppDatabase, categoryId: string, scoreableId: string) {
  const result = db
    .insert(catScoreable)
    .values({ categoryId, scoreableId })
    .onConflictDoNothing()
    .run()

  return result.changes > 0
}

export function removeScoreableFromCategory(
  db: AppDatabase,
  categoryId: string,
  scoreableId: string
) {
  const result = db
    .delete(catScoreable)
    .where(and(eq(catScoreable.categoryId, categoryId), eq(catScoreable.scoreableId, scoreableId)))
    .run()

  return result.changes > 0
}

export function listScoreableIdsForCategory(db: AppDatabase, categoryId: string) {
  return db
    .select({ scoreableId: catScoreable.scoreableId })
    .from(catScoreable)
    .where(eq(catScoreable.categoryId, categoryId))
    .all()
    .map((row) => row.scoreableId)
}

export function listCategoryIdsForScoreable(db: AppDatabase, scoreableId: string) {
  return db
    .select({ categoryId: catScoreable.categoryId })
    .from(catScoreable)
    .where(eq(catScoreable.scoreableId, scoreableId))
    .all()
    .map((row) => row.categoryId)
}

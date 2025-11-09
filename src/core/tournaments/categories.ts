import { ulid } from 'ulid'
import type { AppDatabase } from '@core/db/db'
import {
  category as cat,
  categoryScoreable as catScoreable,
  scoreable as sc
} from '@core/db/schema'
import { and, asc, eq } from 'drizzle-orm'
import type { Scoreable } from './scoreables'

export type Category = typeof cat.$inferSelect
type CategoryWritableFields = Omit<Category, 'id' | 'createdAt' | 'updatedAt'>
type CategoryOptionalFields = 'rules' | 'showScoreablesCount' | 'scoreablesCountName'
export type NewCategory = Omit<CategoryWritableFields, CategoryOptionalFields> &
  Partial<Pick<CategoryWritableFields, CategoryOptionalFields>> & {
    rules?: string[]
  }
export type PatchCategory = Partial<CategoryWritableFields>
export type CategoryView = Category & { scoreables: Scoreable[] }

const now = () => Date.now()

function normalizeCategoryRules(rules?: string[]): string[] {
  if (!Array.isArray(rules)) return []

  const cleaned = rules
    .filter((rule): rule is string => typeof rule === 'string')
    .map((rule) => rule.trim())
    .filter((rule) => rule.length > 0)

  return Array.from(new Set(cleaned))
}

function normalizeScoreablesCountName(scoreablesCountName?: string): string {
  return scoreablesCountName?.trim() ?? ''
}

export function createCategory(db: AppDatabase, data: NewCategory): string {
  const id = ulid()
  const t = now()
  const {
    rules,
    showScoreablesCount = false,
    scoreablesCountName,
    ...rest
  } = data
  const normalizedRules = normalizeCategoryRules(rules)
  const normalizedCountName = normalizeScoreablesCountName(scoreablesCountName)
  db.insert(cat)
    .values({
      id,
      ...rest,
      rules: normalizedRules,
      showScoreablesCount,
      scoreablesCountName: showScoreablesCount ? normalizedCountName : '',
      createdAt: t,
      updatedAt: t
    })
    .run()

  return id
}

export function updateCategory(db: AppDatabase, id: string, patch: PatchCategory) {
  if (!Object.keys(patch).length) return false

  const { rules, showScoreablesCount, scoreablesCountName, ...rest } = patch
  const updateData: Partial<typeof cat.$inferInsert> = { ...rest }

  if (rules !== undefined) {
    updateData.rules = normalizeCategoryRules(rules)
  }

  if (showScoreablesCount !== undefined) {
    updateData.showScoreablesCount = showScoreablesCount
    if (!showScoreablesCount) {
      updateData.scoreablesCountName = ''
    } else if (scoreablesCountName !== undefined) {
      updateData.scoreablesCountName = normalizeScoreablesCountName(scoreablesCountName)
    }
  } else if (scoreablesCountName !== undefined) {
    updateData.scoreablesCountName = normalizeScoreablesCountName(scoreablesCountName)
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

export function listCategoryViews(db: AppDatabase): CategoryView[] {
  const categories = listAllCategories(db)
  if (!categories.length) return []

  const scoreablesByCategory = db
    .select({
      categoryId: catScoreable.categoryId,
      scoreableId: sc.id,
      label: sc.label,
      unit: sc.unit,
      createdAt: sc.createdAt,
      updatedAt: sc.updatedAt
    })
    .from(catScoreable)
    .innerJoin(sc, eq(catScoreable.scoreableId, sc.id))
    .orderBy(asc(catScoreable.categoryId), asc(sc.label))
    .all()

  const map = new Map<string, Scoreable[]>()
  for (const row of scoreablesByCategory) {
    const scoreable: Scoreable = {
      id: row.scoreableId,
      label: row.label ?? '',
      unit: row.unit ?? '',
      createdAt: row.createdAt ?? 0,
      updatedAt: row.updatedAt ?? 0
    }
    const list = map.get(row.categoryId)
    if (list) {
      list.push(scoreable)
    } else {
      map.set(row.categoryId, [scoreable])
    }
  }

  return categories.map((category) => ({
    ...category,
    scoreables: map.get(category.id) ?? []
  }))
}

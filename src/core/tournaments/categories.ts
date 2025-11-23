import { ulid } from 'ulid'
import type { AppDatabase } from '@core/db/db'
import { category as cat, categoryMetric as catMetric } from '@core/db/schema'
import { and, eq } from 'drizzle-orm'
import type { MetricRecord } from './metrics'

export type CategoryRecord = typeof cat.$inferSelect
export type Category = CategoryRecord & {
  metrics: MetricRecord[]
  divisions: { id: string; name: string }[]
}
type CategoryWritableFields = Omit<CategoryRecord, 'id' | 'createdAt' | 'updatedAt'>
type CategoryOptionalFields = 'rules' | 'showMetricsCount' | 'metricsCountName'
export type NewCategory = Omit<CategoryWritableFields, CategoryOptionalFields> &
  Partial<Pick<CategoryWritableFields, CategoryOptionalFields>> & {
    rules?: string[]
  }
export type PatchCategory = Partial<CategoryWritableFields>

const now = () => Date.now()

function normalizeCategoryRules(rules?: string[]): string[] {
  if (!Array.isArray(rules)) return []

  const cleaned = rules
    .filter((rule): rule is string => typeof rule === 'string')
    .map((rule) => rule.trim())
    .filter((rule) => rule.length > 0)

  return Array.from(new Set(cleaned))
}

function normalizeMetricsCountName(metricsCountName?: string): string {
  return metricsCountName?.trim() ?? ''
}

export function createCategory(db: AppDatabase, data: NewCategory): string {
  const id = ulid()
  const t = now()
  const { rules, showMetricsCount = false, metricsCountName, ...rest } = data
  const normalizedRules = normalizeCategoryRules(rules)
  const normalizedCountName = normalizeMetricsCountName(metricsCountName)
  db.insert(cat)
    .values({
      id,
      ...rest,
      rules: normalizedRules,
      showMetricsCount,
      metricsCountName: showMetricsCount ? normalizedCountName : '',
      createdAt: t,
      updatedAt: t
    })
    .run()

  return id
}

export function updateCategory(db: AppDatabase, id: string, patch: PatchCategory) {
  if (!Object.keys(patch).length) return false

  const { rules, showMetricsCount, metricsCountName, ...rest } = patch
  const updateData: Partial<typeof cat.$inferInsert> = { ...rest }

  if (rules !== undefined) {
    updateData.rules = normalizeCategoryRules(rules)
  }

  if (showMetricsCount !== undefined) {
    updateData.showMetricsCount = showMetricsCount
    if (!showMetricsCount) {
      updateData.metricsCountName = ''
    } else if (metricsCountName !== undefined) {
      updateData.metricsCountName = normalizeMetricsCountName(metricsCountName)
    }
  } else if (metricsCountName !== undefined) {
    updateData.metricsCountName = normalizeMetricsCountName(metricsCountName)
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

export function getCategory(db: AppDatabase, id: string): CategoryRecord | undefined {
  return db.select().from(cat).where(eq(cat.id, id)).get()
}

export function listCategories(db: AppDatabase): Category[] {
  const categoriesWithRelations = db
    .query.category.findMany({
      orderBy: (categories, { asc }) => [asc(categories.name)],
      with: {
        categoryMetrics: {
          with: {
            metric: true
          }
        },
        divisionCategories: {
          with: {
            division: true
          }
        }
      }
    })
    .sync()

  return categoriesWithRelations.map(({ categoryMetrics, divisionCategories, ...category }) => {
    const metrics = categoryMetrics
      .map((link) => link.metric)
      .filter((metric): metric is MetricRecord => Boolean(metric))
      .sort((a, b) => a.label.localeCompare(b.label))

    const divisions = divisionCategories
      .map((link) => link.division)
      .filter(
        (division): division is NonNullable<(typeof divisionCategories)[number]['division']> =>
          Boolean(division)
      )
      .map(({ id, name }) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return {
      ...(category as CategoryRecord),
      metrics,
      divisions
    }
  })
}

export function addMetricToCategory(db: AppDatabase, categoryId: string, metricId: string) {
  const result = db.insert(catMetric).values({ categoryId, metricId }).onConflictDoNothing().run()

  return result.changes > 0
}

export function removeMetricFromCategory(db: AppDatabase, categoryId: string, metricId: string) {
  const result = db
    .delete(catMetric)
    .where(and(eq(catMetric.categoryId, categoryId), eq(catMetric.metricId, metricId)))
    .run()

  return result.changes > 0
}

export function listMetricIdsForCategory(db: AppDatabase, categoryId: string) {
  return db
    .select({ metricId: catMetric.metricId })
    .from(catMetric)
    .where(eq(catMetric.categoryId, categoryId))
    .all()
    .map((row) => row.metricId)
}

export function listCategoryIdsForMetric(db: AppDatabase, metricId: string) {
  return db
    .select({ categoryId: catMetric.categoryId })
    .from(catMetric)
    .where(eq(catMetric.metricId, metricId))
    .all()
    .map((row) => row.categoryId)
}

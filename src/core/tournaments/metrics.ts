import { ulid } from 'ulid'
import type { AppDatabase } from '@core/db/db'
import {
  categoryMetric as categoryMetricTable,
  division as divisionTable,
  divisionCategory as divisionCategoryTable,
  metric as sc
} from '@core/db/schema'
import { asc, eq, sql } from 'drizzle-orm'

export type MetricRecord = typeof sc.$inferSelect
export type Metric = MetricRecord & { categories: string[] }
export type NewMetric = {
  label: string
  unit: string
}
export type PatchMetric = Partial<NewMetric>
export type MetricView = MetricRecord & {
  divisions: string[]
}

const now = () => Date.now()

export function createMetric(db: AppDatabase, data: NewMetric): string {
  const id = ulid()
  const t = now()

  db.insert(sc)
    .values({
      id,
      label: data.label,
      unit: data.unit,
      createdAt: t,
      updatedAt: t
    })
    .run()
  return id
}

export function updateMetric(db: AppDatabase, id: string, patch: PatchMetric) {
  if (!Object.keys(patch).length) return false

  const result = db
    .update(sc)
    .set({
      ...(patch.label !== undefined ? { label: patch.label } : {}),
      ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
      updatedAt: now()
    })
    .where(eq(sc.id, id))
    .run()

  return result.changes > 0
}

export function deleteMetric(db: AppDatabase, id: string) {
  const result = db.delete(sc).where(eq(sc.id, id)).run()

  return result.changes > 0
}

export function getMetric(db: AppDatabase, id: string): MetricRecord | undefined {
  return db.select().from(sc).where(eq(sc.id, id)).get()
}

export function listAllMetrics(db: AppDatabase): MetricRecord[] {
  return db.select().from(sc).orderBy(asc(sc.label)).all()
}

// TODO: This should become the list function since we always want to use the richer data
export function listMetricsWithCategories(db: AppDatabase): Metric[] {
  const rows = db
    .select({
      id: sc.id,
      label: sc.label,
      unit: sc.unit,
      createdAt: sc.createdAt,
      updatedAt: sc.updatedAt,
      categories:
        sql`COALESCE(json_group_array(DISTINCT ${categoryMetricTable.categoryId}), '[]')`.as(
          'categories'
        )
    })
    .from(sc)
    .leftJoin(categoryMetricTable, eq(categoryMetricTable.metricId, sc.id))
    .groupBy(sc.id)
    .orderBy(sql`${sc.label} COLLATE NOCASE`)
    .all()

  return rows.map((row) => {
    const categories = (JSON.parse(row.categories as string) as string[]).sort((a, b) =>
      a.localeCompare(b)
    )
    return {
      id: row.id,
      label: row.label,
      unit: row.unit,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      categories
    }
  })
}

export function listMetricViews(db: AppDatabase): MetricView[] {
  const metrics = listAllMetrics(db)
  if (!metrics.length) return []

  const results = db
    .select({
      metricId: sc.id,
      divisionName: divisionTable.name
    })
    .from(sc)
    .leftJoin(categoryMetricTable, eq(categoryMetricTable.metricId, sc.id))
    .leftJoin(
      divisionCategoryTable,
      eq(divisionCategoryTable.categoryId, categoryMetricTable.categoryId)
    )
    .leftJoin(divisionTable, eq(divisionTable.id, divisionCategoryTable.divisionId))
    .orderBy(asc(sc.label), asc(divisionTable.name))
    .all()

  const divisionMap = new Map<string, Set<string>>()

  for (const row of results) {
    if (!row.metricId || !row.divisionName) continue
    const set = divisionMap.get(row.metricId)
    if (set) {
      set.add(row.divisionName)
    } else {
      divisionMap.set(row.metricId, new Set([row.divisionName]))
    }
  }

  return metrics.map((metric) => ({
    ...metric,
    divisions: Array.from(divisionMap.get(metric.id) ?? []).sort((a, b) => a.localeCompare(b))
  }))
}

import { ulid } from 'ulid'
import type { AppDatabase } from '@core/db/db'
import {
  categoryMetric as categoryMetricTable,
  division as divisionTable,
  divisionCategory as divisionCategoryTable,
  metric as sc
} from '@core/db/schema'
import { asc, eq } from 'drizzle-orm'

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

export function listMetrics(db: AppDatabase): Metric[] {
  const metricsWithRelations = db
    .query.metric.findMany({
      orderBy: (metrics, { asc }) => [asc(metrics.label)],
      with: {
        categoryMetrics: true
      }
    })
    .sync()

  return metricsWithRelations.map(({ categoryMetrics, ...metric }) => {
    const categories = categoryMetrics
      .map((link) => link.categoryId)
      .sort((a, b) => a.localeCompare(b))

    return {
      ...(metric as MetricRecord),
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

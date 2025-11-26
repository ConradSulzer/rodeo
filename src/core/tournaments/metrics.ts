import { ulid } from 'ulid'
import type { AppDatabase } from '@core/db/db'
import { metric as sc } from '@core/db/schema'
import { eq } from 'drizzle-orm'

export type MetricRecord = typeof sc.$inferSelect
export type Metric = MetricRecord & { categories: string[] }
export type NewMetric = {
  label: string
  unit: string
}
export type PatchMetric = Partial<NewMetric>
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

export function listMetrics(db: AppDatabase): Metric[] {
  const metricsWithRelations = db.query.metric
    .findMany({
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

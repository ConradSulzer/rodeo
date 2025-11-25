import { ulid } from 'ulid'
import type { AppDatabase } from '@core/db/db'
import {
  division as dv,
  divisionCategory as dvCategory,
  playerDivision as pd,
  categoryMetric as cm,
  metric as mt
} from '@core/db/schema'
import { and, eq, asc } from 'drizzle-orm'
import type { CategoryRecord } from '@core/tournaments/categories'
import type { MetricRecord } from '@core/tournaments/metrics'

export type DivisionRecord = typeof dv.$inferSelect
export type NewDivision = Omit<DivisionRecord, 'id' | 'createdAt' | 'updatedAt' | 'order'> & {
  order?: number
}
export type PatchDivision = Partial<NewDivision>
export type DivisionCategoryLink = typeof dvCategory.$inferSelect
export type DivisionCategoryPatch = Partial<Pick<DivisionCategoryLink, 'depth' | 'order'>>

export type DivisionCategory = {
  category: CategoryRecord
  depth: number
  order: number
  metrics: MetricRecord[]
}

export type Division = DivisionRecord & {
  categories: DivisionCategory[]
  eligiblePlayerIds: string[]
}

const now = () => Date.now()

const normalizeOrder = (value: number | undefined) => {
  if (value === undefined) return undefined
  if (!Number.isFinite(value)) return 0
  return Math.floor(value)
}

export function createDivision(db: AppDatabase, data: NewDivision): string {
  const id = ulid()
  const t = now()
  const normalizedOrder = normalizeOrder(data.order)

  const insertData: typeof dv.$inferInsert = {
    id,
    name: data.name,
    createdAt: t,
    updatedAt: t
  }

  if (normalizedOrder !== undefined) {
    insertData.order = normalizedOrder
  }

  db.insert(dv).values(insertData).run()

  return id
}

export function updateDivision(db: AppDatabase, id: string, patch: PatchDivision) {
  if (!Object.keys(patch).length) return false

  const { order, ...rest } = patch
  const updatePayload: Partial<typeof dv.$inferInsert> = {
    ...rest,
    updatedAt: now()
  }

  if (order !== undefined) {
    updatePayload.order = normalizeOrder(order)
  }

  const result = db.update(dv).set(updatePayload).where(eq(dv.id, id)).run()

  return result.changes > 0
}

export function deleteDivision(db: AppDatabase, id: string) {
  const result = db.delete(dv).where(eq(dv.id, id)).run()

  return result.changes > 0
}

export function getDivision(db: AppDatabase, id: string): DivisionRecord | undefined {
  return db.select().from(dv).where(eq(dv.id, id)).get()
}

export function listDivisions(db: AppDatabase): Division[] {
  const divisionsWithRelations = db.query.division
    .findMany({
      orderBy: (divisions, { asc }) => [asc(divisions.order), asc(divisions.name)],
      with: {
        divisionCategories: {
          with: {
            category: {
              with: {
                categoryMetrics: {
                  with: {
                    metric: true
                  }
                }
              }
            }
          }
        },
        playerDivisions: true
      }
    })
    .sync()

  return divisionsWithRelations.map(({ divisionCategories, playerDivisions, ...division }) => {
    const categories = divisionCategories
      .map((link) => {
        const category = link.category
        if (!category) return null

        const { categoryMetrics: categoryMetricLinks = [], ...categoryData } = category

        const metrics = categoryMetricLinks
          .map((metricLink) => metricLink.metric)
          .filter((metric): metric is MetricRecord => Boolean(metric))
          .sort((a, b) => a.label.localeCompare(b.label))

        return {
          category: categoryData,
          depth: link.depth,
          order: link.order,
          metrics
        }
      })
      .filter((entry): entry is DivisionCategory => entry !== null)
      .sort((a, b) => {
        const orderA = a.order ?? 0
        const orderB = b.order ?? 0
        return orderA === orderB ? a.category.id.localeCompare(b.category.id) : orderA - orderB
      })

    const eligiblePlayerIds = playerDivisions
      .map((link) => link.playerId)
      .filter((playerId): playerId is string => Boolean(playerId))
      .sort((a, b) => a.localeCompare(b))

    return {
      ...(division as DivisionRecord),
      categories,
      eligiblePlayerIds
    }
  })
}

export function addCategoryToDivision(
  db: AppDatabase,
  divisionId: string,
  categoryId: string,
  depth = 1,
  order?: number
) {
  const normalizedDepth = Math.max(1, Math.floor(depth))
  const normalizedOrder = normalizeOrder(order)

  const insertData: typeof dvCategory.$inferInsert = {
    divisionId,
    categoryId,
    depth: normalizedDepth
  }

  if (normalizedOrder !== undefined) {
    insertData.order = normalizedOrder
  }

  const updateData: Partial<typeof dvCategory.$inferInsert> = { depth: normalizedDepth }
  if (normalizedOrder !== undefined) {
    updateData.order = normalizedOrder
  }

  const result = db
    .insert(dvCategory)
    .values(insertData)
    .onConflictDoUpdate({
      target: [dvCategory.divisionId, dvCategory.categoryId],
      set: updateData
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

type DivisionMetric = Pick<MetricRecord, 'id' | 'label'>

export function loadDivisionMetricDirectory(db: AppDatabase): Map<string, DivisionMetric[]> {
  const rows = db
    .select({
      divisionId: dvCategory.divisionId,
      metricId: mt.id,
      metricLabel: mt.label
    })
    .from(dvCategory)
    .innerJoin(cm, eq(cm.categoryId, dvCategory.categoryId))
    .innerJoin(mt, eq(mt.id, cm.metricId))
    .groupBy(dvCategory.divisionId, mt.id, mt.label)
    .orderBy(asc(dvCategory.divisionId), asc(mt.label))
    .all() as Array<{ divisionId: string; metricId: string; metricLabel: string }>

  const directory = new Map<string, DivisionMetric[]>()

  for (const { divisionId, metricId, metricLabel } of rows) {
    let metrics = directory.get(divisionId)
    if (!metrics) {
      metrics = []
      directory.set(divisionId, metrics)
    }
    metrics.push({ id: metricId, label: metricLabel })
  }

  return directory
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
  if (patch.order !== undefined) {
    updateData.order = normalizeOrder(patch.order)
  }

  if (!Object.keys(updateData).length) return false

  const result = db
    .update(dvCategory)
    .set(updateData)
    .where(and(eq(dvCategory.divisionId, divisionId), eq(dvCategory.categoryId, categoryId)))
    .run()

  return result.changes > 0
}

export function addPlayerToDivision(
  db: AppDatabase,
  divisionId: string,
  playerId: string
): boolean {
  const result = db.insert(pd).values({ divisionId, playerId }).onConflictDoNothing().run()

  return result.changes > 0
}

export function removePlayerFromDivision(
  db: AppDatabase,
  divisionId: string,
  playerId: string
): boolean {
  const result = db
    .delete(pd)
    .where(and(eq(pd.divisionId, divisionId), eq(pd.playerId, playerId)))
    .run()

  return result.changes > 0
}

export function moveDivision(db: AppDatabase, id: string, direction: 'up' | 'down') {
  const divisions = listDivisions(db)
  const index = divisions.findIndex((division) => division.id === id)
  if (index === -1) return false

  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= divisions.length) return false

  const current = divisions[index]
  const target = divisions[targetIndex]
  const timestamp = now()

  const updatedCurrent = db
    .update(dv)
    .set({ order: target.order, updatedAt: timestamp })
    .where(eq(dv.id, current.id))
    .run()

  const updatedTarget = db
    .update(dv)
    .set({ order: current.order, updatedAt: timestamp })
    .where(eq(dv.id, target.id))
    .run()

  return updatedCurrent.changes > 0 && updatedTarget.changes > 0
}

export function reorderDivisions(db: AppDatabase, orderedIds: string[]) {
  if (!orderedIds.length) return false
  const existingIds = new Set(listDivisions(db).map((division) => division.id))
  const filtered = orderedIds.filter((id) => existingIds.has(id))
  if (!filtered.length) return false

  const timestamp = now()
  const updates = filtered.map((id, index) =>
    db
      .update(dv)
      .set({ order: index + 1, updatedAt: timestamp })
      .where(eq(dv.id, id))
      .run()
  )

  return updates.some((result) => result.changes > 0)
}

import { ulid } from 'ulid'
import type { AppDatabase } from '@core/db/db'
import {
  division as dv,
  divisionCategory as dvCategory,
  playerDivision as pd
} from '@core/db/schema'
import { and, asc, eq } from 'drizzle-orm'
import {
  getCategory,
  listScoreableIdsForCategory,
  type Category
} from '@core/tournaments/categories'
import { getScoreable, type Scoreable } from '@core/tournaments/scoreables'

export type Division = typeof dv.$inferSelect
export type NewDivision = Omit<Division, 'id' | 'createdAt' | 'updatedAt' | 'order'> & {
  order?: number
}
export type PatchDivision = Partial<NewDivision>
export type DivisionCategoryLink = typeof dvCategory.$inferSelect
export type DivisionCategoryPatch = Partial<Pick<DivisionCategoryLink, 'depth' | 'order'>>

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

export function getDivision(db: AppDatabase, id: string): Division | undefined {
  return db.select().from(dv).where(eq(dv.id, id)).get()
}

export function listAllDivisions(db: AppDatabase): Division[] {
  return db.select().from(dv).orderBy(asc(dv.order), asc(dv.name)).all()
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

export function listCategoriesForDivision(
  db: AppDatabase,
  divisionId: string
): DivisionCategoryLink[] {
  return db
    .select({
      divisionId: dvCategory.divisionId,
      categoryId: dvCategory.categoryId,
      depth: dvCategory.depth,
      order: dvCategory.order
    })
    .from(dvCategory)
    .where(eq(dvCategory.divisionId, divisionId))
    .orderBy(asc(dvCategory.order), asc(dvCategory.categoryId))
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
      depth: dvCategory.depth,
      order: dvCategory.order
    })
    .from(dvCategory)
    .where(eq(dvCategory.categoryId, categoryId))
    .orderBy(asc(dvCategory.order), asc(dvCategory.divisionId))
    .all()
}

export type DivisionCategoryView = {
  category: Category
  depth: number
  order: number
  scoreables: Scoreable[]
}

export type DivisionView = Division & {
  categories: DivisionCategoryView[]
  eligiblePlayerIds: string[]
}

export function getDivisionView(db: AppDatabase, divisionId: string): DivisionView | undefined {
  const division = getDivision(db, divisionId)
  if (!division) return undefined

  const categories = buildDivisionCategories(db, divisionId)
  const eligiblePlayerIds = listPlayerIdsForDivision(db, divisionId)

  return {
    ...division,
    categories,
    eligiblePlayerIds
  }
}

export function listDivisionViews(db: AppDatabase): DivisionView[] {
  return listAllDivisions(db).map((division) => ({
    ...division,
    categories: buildDivisionCategories(db, division.id),
    eligiblePlayerIds: listPlayerIdsForDivision(db, division.id)
  }))
}

function buildDivisionCategories(db: AppDatabase, divisionId: string): DivisionCategoryView[] {
  const links = listCategoriesForDivision(db, divisionId)

  return links
    .map((link) => {
      const category = getCategory(db, link.categoryId)
      if (!category) return null

      const scoreables = listScoreableIdsForCategory(db, link.categoryId)
        .map((scoreableId) => getScoreable(db, scoreableId))
        .filter((scoreable): scoreable is Scoreable => Boolean(scoreable))

      return {
        category,
        depth: link.depth,
        order: link.order,
        scoreables
      }
    })
    .filter((entry): entry is DivisionCategoryView => entry !== null)
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

export function listPlayerIdsForDivision(db: AppDatabase, divisionId: string): string[] {
  return db
    .select({ playerId: pd.playerId })
    .from(pd)
    .where(eq(pd.divisionId, divisionId))
    .orderBy(asc(pd.playerId))
    .all()
    .map((row) => row.playerId)
}

export function listDivisionIdsForPlayer(db: AppDatabase, playerId: string): string[] {
  return db
    .select({ divisionId: pd.divisionId })
    .from(pd)
    .where(eq(pd.playerId, playerId))
    .orderBy(asc(pd.divisionId))
    .all()
    .map((row) => row.divisionId)
}

export function moveDivision(db: AppDatabase, id: string, direction: 'up' | 'down') {
  const divisions = listAllDivisions(db)
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
  const existingIds = new Set(listAllDivisions(db).map((division) => division.id))
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

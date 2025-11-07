import { ulid } from 'ulid'
import type { AppDatabase } from '@core/db/db'
import {
  categoryScoreable as categoryScoreableTable,
  division as divisionTable,
  divisionCategory as divisionCategoryTable,
  scoreable as sc
} from '@core/db/schema'
import { asc, eq, sql } from 'drizzle-orm'

export type Scoreable = typeof sc.$inferSelect
export type NewScoreable = {
  label: string
  unit: string
  order?: number
}
export type PatchScoreable = Partial<NewScoreable>
export type ScoreableView = Scoreable & {
  divisions: string[]
}

const now = () => Date.now()

function getNextOrder(db: AppDatabase): number {
  const result = db
    .select({
      maxOrder: sql<number>`coalesce(max(${sc.order}), 0)`
    })
    .from(sc)
    .get()

  return (result?.maxOrder ?? 0) + 1
}

export function createScoreable(db: AppDatabase, data: NewScoreable): string {
  const id = ulid()
  const t = now()
  const nextOrder = data.order ?? getNextOrder(db)

  db.insert(sc)
    .values({
      id,
      label: data.label,
      unit: data.unit,
      order: nextOrder,
      createdAt: t,
      updatedAt: t
    })
    .run()
  return id
}

export function updateScoreable(db: AppDatabase, id: string, patch: PatchScoreable) {
  if (!Object.keys(patch).length) return false

  const result = db
    .update(sc)
    .set({
      ...(patch.label !== undefined ? { label: patch.label } : {}),
      ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
      ...(patch.order !== undefined ? { order: patch.order } : {}),
      updatedAt: now()
    })
    .where(eq(sc.id, id))
    .run()

  return result.changes > 0
}

export function deleteScoreable(db: AppDatabase, id: string) {
  const result = db.delete(sc).where(eq(sc.id, id)).run()

  return result.changes > 0
}

export function getScoreable(db: AppDatabase, id: string): Scoreable | undefined {
  return db.select().from(sc).where(eq(sc.id, id)).get()
}

export function listAllScoreables(db: AppDatabase): Scoreable[] {
  return db.select().from(sc).orderBy(asc(sc.order), asc(sc.label)).all()
}

export function moveScoreable(db: AppDatabase, id: string, direction: 'up' | 'down'): boolean {
  const scoreables = listAllScoreables(db)
  const index = scoreables.findIndex((item) => item.id === id)
  if (index === -1) return false

  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= scoreables.length) return false

  const current = scoreables[index]
  const target = scoreables[targetIndex]

  const nowTs = now()

  const updatedCurrent = db
    .update(sc)
    .set({ order: target.order, updatedAt: nowTs })
    .where(eq(sc.id, current.id))
    .run()

  const updatedTarget = db
    .update(sc)
    .set({ order: current.order, updatedAt: nowTs })
    .where(eq(sc.id, target.id))
    .run()

  return updatedCurrent.changes > 0 && updatedTarget.changes > 0
}

export function reorderScoreables(db: AppDatabase, orderedIds: string[]): boolean {
  const existing = new Set(listAllScoreables(db).map((item) => item.id))
  const filtered = orderedIds.filter((id) => existing.has(id))
  if (!filtered.length) return false

  const updates = filtered.map((id, idx) =>
    db
      .update(sc)
      .set({ order: idx + 1, updatedAt: now() })
      .where(eq(sc.id, id))
      .run()
  )

  return updates.some((result) => result.changes > 0)
}

export function listScoreableViews(db: AppDatabase): ScoreableView[] {
  const scoreables = listAllScoreables(db)
  if (!scoreables.length) return []

  const results = db
    .select({
      scoreableId: sc.id,
      divisionName: divisionTable.name
    })
    .from(sc)
    .leftJoin(categoryScoreableTable, eq(categoryScoreableTable.scoreableId, sc.id))
    .leftJoin(
      divisionCategoryTable,
      eq(divisionCategoryTable.categoryId, categoryScoreableTable.categoryId)
    )
    .leftJoin(divisionTable, eq(divisionTable.id, divisionCategoryTable.divisionId))
    .orderBy(asc(sc.order), asc(sc.label), asc(divisionTable.name))
    .all()

  const divisionMap = new Map<string, Set<string>>()

  for (const row of results) {
    if (!row.scoreableId || !row.divisionName) continue
    const set = divisionMap.get(row.scoreableId)
    if (set) {
      set.add(row.divisionName)
    } else {
      divisionMap.set(row.scoreableId, new Set([row.divisionName]))
    }
  }

  return scoreables.map((scoreable) => ({
    ...scoreable,
    divisions: Array.from(divisionMap.get(scoreable.id) ?? []).sort((a, b) => a.localeCompare(b))
  }))
}

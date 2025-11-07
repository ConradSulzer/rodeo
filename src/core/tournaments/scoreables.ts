import { ulid } from 'ulid'
import type { AppDatabase } from '@core/db/db'
import {
  categoryScoreable as categoryScoreableTable,
  division as divisionTable,
  divisionCategory as divisionCategoryTable,
  scoreable as sc
} from '@core/db/schema'
import { asc, eq } from 'drizzle-orm'

export type Scoreable = typeof sc.$inferSelect
export type NewScoreable = {
  label: string
  unit: string
}
export type PatchScoreable = Partial<NewScoreable>
export type ScoreableView = Scoreable & {
  divisions: string[]
}

const now = () => Date.now()

export function createScoreable(db: AppDatabase, data: NewScoreable): string {
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

export function updateScoreable(db: AppDatabase, id: string, patch: PatchScoreable) {
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

export function deleteScoreable(db: AppDatabase, id: string) {
  const result = db.delete(sc).where(eq(sc.id, id)).run()

  return result.changes > 0
}

export function getScoreable(db: AppDatabase, id: string): Scoreable | undefined {
  return db.select().from(sc).where(eq(sc.id, id)).get()
}

export function listAllScoreables(db: AppDatabase): Scoreable[] {
  return db.select().from(sc).orderBy(asc(sc.label)).all()
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
    .orderBy(asc(sc.label), asc(divisionTable.name))
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

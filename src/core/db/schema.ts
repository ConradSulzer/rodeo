import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  foreignKey,
  uniqueIndex,
  primaryKey
} from 'drizzle-orm/sqlite-core'

export const player = sqliteTable(
  'player',
  {
    id: text('id').primaryKey(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    displayName: text('display_name').notNull(),
    email: text('email').notNull(),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull()
  },
  (t) => [uniqueIndex('player_email_first_last').on(t.email, t.firstName, t.lastName)]
)

export const scoreable = sqliteTable(
  'scoreable',
  {
    id: text('id').primaryKey(),
    label: text('label').notNull(),
    unit: text('unit').notNull(),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull()
  },
  (t) => [uniqueIndex('uniq_scoreable_label').on(t.label)]
)

export const category = sqliteTable(
  'category',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    direction: text('direction', { enum: ['asc', 'desc'] }).notNull(),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull()
  },
  (t) => [uniqueIndex('uniq_category_name').on(t.name)]
)

export const division = sqliteTable(
  'division',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull()
  },
  (t) => [uniqueIndex('uniq_division_name').on(t.name)]
)

export const categoryScoreable = sqliteTable(
  'category_scoreable',
  {
    categoryId: text('category_id')
      .notNull()
      .references(() => category.id, { onUpdate: 'cascade', onDelete: 'cascade' }),
    scoreableId: text('scoreable_id')
      .notNull()
      .references(() => scoreable.id, { onUpdate: 'cascade', onDelete: 'cascade' })
  },
  (t) => [
    primaryKey({ columns: [t.categoryId, t.scoreableId], name: 'category_scoreable_pk' }),
    index('category_scoreable_scoreable').on(t.scoreableId)
  ]
)

export const divisionCategory = sqliteTable(
  'division_category',
  {
    divisionId: text('division_id')
      .notNull()
      .references(() => division.id, { onUpdate: 'cascade', onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => category.id, { onUpdate: 'cascade', onDelete: 'cascade' })
  },
  (t) => [
    primaryKey({ columns: [t.divisionId, t.categoryId], name: 'division_category_pk' }),
    index('division_category_category').on(t.categoryId)
  ]
)

export const event = sqliteTable(
  'event',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    ts: integer('ts', { mode: 'number' }).notNull(),
    playerId: text('player_id')
      .notNull()
      .references(() => player.id),
    scoreableId: text('scoreable_id')
      .notNull()
      .references(() => scoreable.id),
    priorEventId: text('prior_event_id'),
    note: text('note'),
    value: real('value')
  },
  (t) => [
    index('event_player_scoreable_ts').on(t.playerId, t.scoreableId, t.ts),
    index('event_prior').on(t.priorEventId),
    foreignKey({
      columns: [t.priorEventId],
      foreignColumns: [t.id],
      name: 'event_prior_fk'
    })
      .onUpdate('cascade')
      .onDelete('restrict')
  ]
)

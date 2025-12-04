import { relations } from 'drizzle-orm'
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
    cellPhone: text('cell_phone'),
    emergencyContact: text('emergency_contact'),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull()
  },
  (t) => [uniqueIndex('player_email_first_last').on(t.email, t.firstName, t.lastName)]
)

export const metric = sqliteTable(
  'metric',
  {
    id: text('id').primaryKey(),
    label: text('label').notNull(),
    unit: text('unit').notNull(),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull()
  },
  (t) => [uniqueIndex('uniq_metric_label').on(t.label)]
)

export const category = sqliteTable(
  'category',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    mode: text('mode', { enum: ['aggregate', 'pick_one'] })
      .notNull()
      .default('aggregate'),
    direction: text('direction', { enum: ['asc', 'desc'] }).notNull(),
    showMetricsCount: integer('show_metrics_count', { mode: 'boolean' }).notNull().default(false),
    metricsCountName: text('metrics_count_name').notNull().default(''),
    rules: text('rules', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default([] as string[]),
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
    order: integer('order', { mode: 'number' }).notNull().default(0),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull()
  },
  (t) => [uniqueIndex('uniq_division_name').on(t.name)]
)

export const categoryMetric = sqliteTable(
  'category_metric',
  {
    categoryId: text('category_id')
      .notNull()
      .references(() => category.id, { onUpdate: 'cascade', onDelete: 'cascade' }),
    metricId: text('metric_id')
      .notNull()
      .references(() => metric.id, { onUpdate: 'cascade', onDelete: 'cascade' })
  },
  (t) => [
    primaryKey({ columns: [t.categoryId, t.metricId], name: 'category_metric_pk' }),
    index('category_metric_metric').on(t.metricId)
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
      .references(() => category.id, { onUpdate: 'cascade', onDelete: 'cascade' }),
    order: integer('order', { mode: 'number' }).notNull().default(0),
    depth: integer('depth', { mode: 'number' }).notNull().default(1)
  },
  (t) => [
    primaryKey({ columns: [t.divisionId, t.categoryId], name: 'division_category_pk' }),
    index('division_category_category').on(t.categoryId)
  ]
)

export const playerDivision = sqliteTable(
  'player_division',
  {
    playerId: text('player_id')
      .notNull()
      .references(() => player.id, { onUpdate: 'cascade', onDelete: 'cascade' }),
    divisionId: text('division_id')
      .notNull()
      .references(() => division.id, { onUpdate: 'cascade', onDelete: 'cascade' })
  },
  (t) => [
    primaryKey({ columns: [t.playerId, t.divisionId], name: 'player_division_pk' }),
    index('player_division_division').on(t.divisionId),
    index('player_division_player').on(t.playerId)
  ]
)

export const event = sqliteTable(
  'event',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    state: text('state'),
    ts: integer('ts', { mode: 'number' }).notNull(),
    playerId: text('player_id')
      .notNull()
      .references(() => player.id),
    metricId: text('metric_id').references(() => metric.id),
    priorEventId: text('prior_event_id'),
    note: text('note'),
    value: real('value')
  },
  (t) => [
    index('event_player_metric_ts').on(t.playerId, t.metricId, t.ts),
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

export const tournamentMeta = sqliteTable('tournament', {
  id: text('id').primaryKey().default('meta'),
  name: text('name').notNull().default('Untitled Tournament'),
  eventDate: text('event_date'),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull()
})

export const playerRelations = relations(player, ({ many }) => ({
  playerDivisions: many(playerDivision),
  events: many(event)
}))

export const metricRelations = relations(metric, ({ many }) => ({
  categoryMetrics: many(categoryMetric),
  events: many(event)
}))

export const categoryRelations = relations(category, ({ many }) => ({
  categoryMetrics: many(categoryMetric),
  divisionCategories: many(divisionCategory)
}))

export const divisionRelations = relations(division, ({ many }) => ({
  divisionCategories: many(divisionCategory),
  playerDivisions: many(playerDivision)
}))

export const categoryMetricRelations = relations(categoryMetric, ({ one }) => ({
  category: one(category, {
    fields: [categoryMetric.categoryId],
    references: [category.id]
  }),
  metric: one(metric, {
    fields: [categoryMetric.metricId],
    references: [metric.id]
  })
}))

export const divisionCategoryRelations = relations(divisionCategory, ({ one }) => ({
  division: one(division, {
    fields: [divisionCategory.divisionId],
    references: [division.id]
  }),
  category: one(category, {
    fields: [divisionCategory.categoryId],
    references: [category.id]
  })
}))

export const playerDivisionRelations = relations(playerDivision, ({ one }) => ({
  player: one(player, {
    fields: [playerDivision.playerId],
    references: [player.id]
  }),
  division: one(division, {
    fields: [playerDivision.divisionId],
    references: [division.id]
  })
}))

export const eventRelations = relations(event, ({ one, many }) => ({
  player: one(player, {
    fields: [event.playerId],
    references: [player.id]
  }),
  metric: one(metric, {
    fields: [event.metricId],
    references: [metric.id]
  }),
  priorEvent: one(event, {
    fields: [event.priorEventId],
    references: [event.id],
    relationName: 'priorEvent'
  }),
  nextEvents: many(event, {
    relationName: 'priorEvent'
  })
}))

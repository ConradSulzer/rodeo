import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  foreignKey,
  uniqueIndex
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

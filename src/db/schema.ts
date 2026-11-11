import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// Mirrors the server tables. Dates are yyyy-MM-dd text and timestamps are ISO text.
// `dirty` marks rows changed on the phone that the server has not received yet;
// `deleted_at` keeps a removed row around until its removal has been synced.
const syncColumns = {
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  deleted_at: text('deleted_at'),
  dirty: integer('dirty', { mode: 'boolean' }).notNull().default(false),
}

export const members = sqliteTable('members', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  contact: text('contact'),
  address: text('address'),
  date_joined: text('date_joined').notNull(),
  fee: real('fee').notNull(),
  expiry_date: text('expiry_date').notNull(),
  notes: text('notes'),
  gender: text('gender'),
  birth_date: text('birth_date'),
  category: text('category'),
  // Photos stay on this phone and are never synced
  photo_uri: text('photo_uri'),
  ...syncColumns,
})

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  type: text('type').$type<'income' | 'expense'>().notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  date: text('date').notNull(),
  payment_mode: text('payment_mode'),
  notes: text('notes'),
  // Set on membership fee payments to link them to the paying member
  member_id: text('member_id'),
  ...syncColumns,
})

// Single row, id = 1
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  default_duration_months: integer('default_duration_months').notNull().default(12),
  default_fee: real('default_fee').notNull().default(500),
  expiry_warning_days: integer('expiry_warning_days').notNull().default(30),
  updated_at: text('updated_at').notNull(),
  dirty: integer('dirty', { mode: 'boolean' }).notNull().default(false),
})

// Single row, id = 1. The login token itself lives in the secure store.
export const syncState = sqliteTable('sync_state', {
  id: integer('id').primaryKey(),
  server_url: text('server_url'),
  email: text('email'),
  // Server clock value returned by the last sync; the next sync asks for changes after it
  last_pulled_at: text('last_pulled_at'),
  last_synced_at: text('last_synced_at'),
})

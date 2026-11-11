import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'
import * as schema from './schema'

export const SINGLETON_ID = 1

// The change listener is what makes useLiveQuery screens refresh after a write
const sqlite = openDatabaseSync('zac.db', { enableChangeListener: true })

export const db = drizzle(sqlite, { schema })

// Creates the settings and sync-state rows on first launch
export function ensureSingletonRows() {
  db.insert(schema.settings)
    .values({ id: SINGLETON_ID, updated_at: new Date(0).toISOString() })
    .onConflictDoNothing()
    .run()
  db.insert(schema.syncState).values({ id: SINGLETON_ID }).onConflictDoNothing().run()
}

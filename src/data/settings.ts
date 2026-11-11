import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { db, SINGLETON_ID } from '@/db/client'
import { settings } from '@/db/schema'
import { nowIso } from '@/lib/utils'
import type { SettingsInput } from '@/types'

export const DEFAULT_SETTINGS: SettingsInput = {
  default_duration_months: 12,
  default_fee: 500,
  expiry_warning_days: 30,
}

export function useSettings(): SettingsInput {
  const { data } = useLiveQuery(db.select().from(settings).where(eq(settings.id, SINGLETON_ID)))
  return data[0] ?? DEFAULT_SETTINGS
}

export function getSettings(): SettingsInput {
  return db.select().from(settings).where(eq(settings.id, SINGLETON_ID)).get() ?? DEFAULT_SETTINGS
}

export function updateSettings(input: SettingsInput) {
  db.update(settings)
    .set({ ...input, updated_at: nowIso(), dirty: true })
    .where(eq(settings.id, SINGLETON_ID))
    .run()
}

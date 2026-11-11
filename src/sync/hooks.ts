import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { db, SINGLETON_ID } from '@/db/client'
import { members, settings, syncState, transactions } from '@/db/schema'
import type { SyncState } from '@/types'

export function useSyncState(): SyncState | undefined {
  const { data } = useLiveQuery(db.select().from(syncState).where(eq(syncState.id, SINGLETON_ID)))
  return data[0]
}

// Number of local changes the server has not received yet
export function usePendingCount(): number {
  const dirtyMembers = useLiveQuery(db.select({ id: members.id }).from(members).where(eq(members.dirty, true)))
  const dirtyTransactions = useLiveQuery(
    db.select({ id: transactions.id }).from(transactions).where(eq(transactions.dirty, true)),
  )
  const dirtySettings = useLiveQuery(db.select({ id: settings.id }).from(settings).where(eq(settings.dirty, true)))
  return dirtyMembers.data.length + dirtyTransactions.data.length + dirtySettings.data.length
}

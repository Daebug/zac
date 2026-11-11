import { and, eq, isNotNull } from 'drizzle-orm'
import * as SecureStore from 'expo-secure-store'
import { db, SINGLETON_ID } from '@/db/client'
import { members, settings, syncState, transactions } from '@/db/schema'
import { deletePhoto } from '@/lib/photos'
import { nowIso } from '@/lib/utils'

const TOKEN_KEY = 'zac_auth_token'
const REQUEST_TIMEOUT_MS = 15_000

export type SyncOutcome =
  | { ok: true }
  // not_connected: sync was never set up. signed_out: the login expired. offline: server unreachable.
  | { ok: false; reason: 'not_connected' | 'signed_out' | 'offline' | 'error'; message: string }

type ServerMember = Omit<typeof members.$inferSelect, 'photo_uri' | 'dirty'>
type ServerTransaction = Omit<typeof transactions.$inferSelect, 'dirty'>

interface SyncResponse {
  server_time: string
  members: ServerMember[]
  transactions: ServerTransaction[]
  settings: { default_duration_months: number; default_fee: number; expiry_warning_days: number; updated_at: string } | null
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

// Accepts "192.168.1.5:3001" as well as a full address
function normalizeServerUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '')
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
}

async function postJson<T>(url: string, body: unknown, token?: string): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new HttpError(response.status, data?.error ?? `Request failed: ${response.status}`)
    return data as T
  } finally {
    clearTimeout(timer)
  }
}

const OFFLINE_MESSAGE = 'Could not reach the server. Your changes are saved on this phone and will sync later.'

function toFailure(error: unknown): SyncOutcome {
  if (error instanceof HttpError) return { ok: false, reason: 'error', message: error.message }
  return { ok: false, reason: 'offline', message: OFFLINE_MESSAGE }
}

export async function connect(serverUrl: string, email: string, password: string): Promise<SyncOutcome> {
  const url = normalizeServerUrl(serverUrl)
  try {
    const { token } = await postJson<{ token: string }>(`${url}/auth/login`, { email: email.trim(), password })
    await SecureStore.setItemAsync(TOKEN_KEY, token)
    // Clearing the cursor makes the next sync pull everything from this account
    db.update(syncState)
      .set({ server_url: url, email: email.trim(), last_pulled_at: null })
      .where(eq(syncState.id, SINGLETON_ID))
      .run()
    return { ok: true }
  } catch (error) {
    return toFailure(error)
  }
}

export async function disconnect() {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
  db.update(syncState)
    .set({ email: null, last_pulled_at: null, last_synced_at: null })
    .where(eq(syncState.id, SINGLETON_ID))
    .run()
}

function applyResponse(
  response: SyncResponse,
  pushed: { members: Map<string, string>; transactions: Map<string, string>; settings: string | null },
) {
  const removedPhotos: (string | null)[] = []

  db.transaction((tx) => {
    // A local row is kept as-is when it changed after it was sent (or was never sent)
    const changedSincePush = (local: { dirty: boolean; updated_at: string }, pushedAt: string | undefined) =>
      local.dirty && local.updated_at !== pushedAt

    const localMembers = new Map(
      tx.select({ id: members.id, dirty: members.dirty, updated_at: members.updated_at, photo_uri: members.photo_uri })
        .from(members).all().map(m => [m.id, m]),
    )
    for (const row of response.members) {
      const local = localMembers.get(row.id)
      if (local && changedSincePush(local, pushed.members.get(row.id))) continue
      const values = {
        name: row.name,
        contact: row.contact,
        address: row.address,
        date_joined: row.date_joined,
        fee: row.fee,
        expiry_date: row.expiry_date,
        notes: row.notes,
        gender: row.gender,
        birth_date: row.birth_date,
        category: row.category,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: null,
        dirty: false,
      }
      if (row.deleted_at) {
        if (local) {
          tx.delete(members).where(eq(members.id, row.id)).run()
          removedPhotos.push(local.photo_uri)
        }
      } else if (local) {
        tx.update(members).set(values).where(eq(members.id, row.id)).run()
      } else {
        tx.insert(members).values({ ...values, id: row.id }).run()
      }
    }

    const localTransactions = new Map(
      tx.select({ id: transactions.id, dirty: transactions.dirty, updated_at: transactions.updated_at })
        .from(transactions).all().map(t => [t.id, t]),
    )
    for (const row of response.transactions) {
      const local = localTransactions.get(row.id)
      if (local && changedSincePush(local, pushed.transactions.get(row.id))) continue
      const values = {
        type: row.type,
        category: row.category,
        description: row.description,
        amount: row.amount,
        date: row.date,
        payment_mode: row.payment_mode,
        notes: row.notes,
        member_id: row.member_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: null,
        dirty: false,
      }
      if (row.deleted_at) {
        if (local) tx.delete(transactions).where(eq(transactions.id, row.id)).run()
      } else if (local) {
        tx.update(transactions).set(values).where(eq(transactions.id, row.id)).run()
      } else {
        tx.insert(transactions).values({ ...values, id: row.id }).run()
      }
    }

    const localSettings = tx.select().from(settings).where(eq(settings.id, SINGLETON_ID)).get()
    if (response.settings && localSettings && !changedSincePush(localSettings, pushed.settings ?? undefined)) {
      const { default_duration_months, default_fee, expiry_warning_days, updated_at } = response.settings
      tx.update(settings)
        .set({ default_duration_months, default_fee, expiry_warning_days, updated_at, dirty: false })
        .where(eq(settings.id, SINGLETON_ID))
        .run()
    }

    // Anything sent and not edited since is now on the server
    for (const [id, pushedAt] of pushed.members) {
      tx.update(members).set({ dirty: false }).where(and(eq(members.id, id), eq(members.updated_at, pushedAt))).run()
    }
    for (const [id, pushedAt] of pushed.transactions) {
      tx.update(transactions).set({ dirty: false })
        .where(and(eq(transactions.id, id), eq(transactions.updated_at, pushedAt))).run()
    }
    if (pushed.settings) {
      tx.update(settings).set({ dirty: false })
        .where(and(eq(settings.id, SINGLETON_ID), eq(settings.updated_at, pushed.settings))).run()
    }

    // Removals the server now knows about no longer need to be kept
    tx.delete(members).where(and(isNotNull(members.deleted_at), eq(members.dirty, false))).run()
    tx.delete(transactions).where(and(isNotNull(transactions.deleted_at), eq(transactions.dirty, false))).run()

    tx.update(syncState)
      .set({ last_pulled_at: response.server_time, last_synced_at: nowIso() })
      .where(eq(syncState.id, SINGLETON_ID))
      .run()
  })

  for (const uri of removedPhotos) deletePhoto(uri)
}

async function runSync(): Promise<SyncOutcome> {
  const state = db.select().from(syncState).where(eq(syncState.id, SINGLETON_ID)).get()
  if (!state?.server_url || !state.email) {
    return { ok: false, reason: 'not_connected', message: 'Sync is not set up yet.' }
  }
  const token = await SecureStore.getItemAsync(TOKEN_KEY)
  if (!token) return { ok: false, reason: 'signed_out', message: 'Please sign in again to sync.' }

  const dirtyMembers = db.select().from(members).where(eq(members.dirty, true)).all()
  const dirtyTransactions = db.select().from(transactions).where(eq(transactions.dirty, true)).all()
  const dirtySettings = db.select().from(settings)
    .where(and(eq(settings.id, SINGLETON_ID), eq(settings.dirty, true))).get()

  try {
    const response = await postJson<SyncResponse>(`${state.server_url}/zac/sync`, {
      last_pulled_at: state.last_pulled_at,
      changes: {
        members: dirtyMembers.map(({ photo_uri: _photo, dirty: _dirty, ...row }) => row),
        transactions: dirtyTransactions.map(({ dirty: _dirty, ...row }) => row),
        settings: dirtySettings ?? null,
      },
    }, token)

    applyResponse(response, {
      members: new Map(dirtyMembers.map(m => [m.id, m.updated_at])),
      transactions: new Map(dirtyTransactions.map(t => [t.id, t.updated_at])),
      settings: dirtySettings?.updated_at ?? null,
    })
    return { ok: true }
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      await SecureStore.deleteItemAsync(TOKEN_KEY)
      return { ok: false, reason: 'signed_out', message: 'Your sign-in has expired. Please sign in again to sync.' }
    }
    return toFailure(error)
  }
}

let inFlight: Promise<SyncOutcome> | null = null

// Calls made while a sync is running share its result instead of starting another
export function sync(): Promise<SyncOutcome> {
  inFlight ??= runSync()
    .catch((error): SyncOutcome => ({ ok: false, reason: 'error', message: error instanceof Error ? error.message : 'Sync failed' }))
    .finally(() => { inFlight = null })
  return inFlight
}

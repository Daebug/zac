import { and, eq, inArray, isNull } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { randomUUID } from 'expo-crypto'
import { useMemo } from 'react'
import { db } from '@/db/client'
import { members, transactions } from '@/db/schema'
import { deletePhoto } from '@/lib/photos'
import { getMemberStatus, nowIso } from '@/lib/utils'
import type { Member, MemberInput, MemberWithStatus } from '@/types'
import { useSettings } from './settings'
import { membershipPayment } from './transactions'

const toNull = (text: string) => text.trim() || null

function toColumns(input: MemberInput) {
  return {
    name: input.name.trim(),
    contact: toNull(input.contact),
    address: toNull(input.address),
    date_joined: input.date_joined,
    fee: input.fee,
    expiry_date: input.expiry_date,
    notes: toNull(input.notes),
    gender: toNull(input.gender),
    birth_date: toNull(input.birth_date),
    category: toNull(input.category),
  }
}

export function useMembers(): MemberWithStatus[] {
  const { data } = useLiveQuery(db.select().from(members).where(isNull(members.deleted_at)))
  const { expiry_warning_days } = useSettings()
  return useMemo(
    () => data.map(m => ({ ...m, status: getMemberStatus(m.expiry_date, expiry_warning_days) })),
    [data, expiry_warning_days],
  )
}

// `loaded` is false until the first read finishes, so screens can tell "loading" from "not found"
export function useMember(id: string | undefined): { member: Member | undefined; loaded: boolean } {
  const { data, updatedAt } = useLiveQuery(
    db.select().from(members).where(and(eq(members.id, id ?? ''), isNull(members.deleted_at))),
    [id],
  )
  return { member: data[0], loaded: updatedAt !== undefined }
}

export function getMember(id: string): Member | undefined {
  return db.select().from(members).where(and(eq(members.id, id), isNull(members.deleted_at))).get()
}

// Adds members and, for each one with a fee, the linked membership fee income
export function createMembers(inputs: MemberInput[]) {
  db.transaction((tx) => {
    for (const input of inputs) {
      const now = nowIso()
      const member = { ...toColumns(input), id: randomUUID(), created_at: now, updated_at: now, dirty: true }
      tx.insert(members).values(member).run()
      if (member.fee > 0) {
        tx.insert(transactions)
          .values(membershipPayment(member, { label: 'Membership fee', amount: member.fee, date: member.date_joined }))
          .run()
      }
    }
  })
}

export function updateMember(id: string, input: MemberInput) {
  db.update(members)
    .set({ ...toColumns(input), updated_at: nowIso(), dirty: true })
    .where(eq(members.id, id))
    .run()
}

export function bulkUpdateMembers(ids: string[], changes: { expiry_date?: string; fee?: number }) {
  db.update(members)
    .set({ ...changes, updated_at: nowIso(), dirty: true })
    .where(inArray(members.id, ids))
    .run()
}

// Past payments stay in Funds; only the members and their photos are removed
export function deleteMembers(ids: string[]) {
  const photos = db.select({ photo_uri: members.photo_uri }).from(members).where(inArray(members.id, ids)).all()
  const now = nowIso()
  db.update(members)
    .set({ deleted_at: now, updated_at: now, dirty: true, photo_uri: null })
    .where(inArray(members.id, ids))
    .run()
  for (const { photo_uri } of photos) deletePhoto(photo_uri)
}

// Extends the membership and records the payment in one step
export function renewMember(
  member: Pick<Member, 'id' | 'name'>,
  renewal: { expiry_date: string; amount: number; date: string; payment_mode: string },
) {
  db.transaction((tx) => {
    tx.update(members)
      .set({ expiry_date: renewal.expiry_date, updated_at: nowIso(), dirty: true })
      .where(eq(members.id, member.id))
      .run()
    if (renewal.amount > 0) {
      tx.insert(transactions).values(membershipPayment(member, { label: 'Membership renewal', ...renewal })).run()
    }
  })
}

// Photos are local to this phone, so changing one does not mark the member for sync
export function setMemberPhoto(member: Pick<Member, 'id' | 'photo_uri'>, photoUri: string | null) {
  db.update(members).set({ photo_uri: photoUri }).where(eq(members.id, member.id)).run()
  deletePhoto(member.photo_uri)
}

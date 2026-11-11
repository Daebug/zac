import { and, eq, isNull } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { randomUUID } from 'expo-crypto'
import { db } from '@/db/client'
import { transactions } from '@/db/schema'
import { nowIso } from '@/lib/utils'
import { MEMBERSHIP_FEE_CATEGORY, type Transaction, type TransactionInput } from '@/types'

type NewTransaction = typeof transactions.$inferInsert

const toNull = (text: string) => text.trim() || null

function toColumns(input: TransactionInput) {
  return {
    type: input.type,
    category: input.category,
    description: input.description.trim(),
    amount: input.amount,
    date: input.date,
    payment_mode: toNull(input.payment_mode),
    notes: toNull(input.notes),
  }
}

// Builds a membership fee income row linked to the paying member
export function membershipPayment(
  member: { id: string; name: string },
  payment: { label: string; amount: number; date: string; payment_mode?: string },
): NewTransaction {
  const now = nowIso()
  return {
    id: randomUUID(),
    type: 'income',
    category: MEMBERSHIP_FEE_CATEGORY,
    description: `${payment.label} – ${member.name}`,
    amount: payment.amount,
    date: payment.date,
    payment_mode: payment.payment_mode ? toNull(payment.payment_mode) : null,
    member_id: member.id,
    created_at: now,
    updated_at: now,
    dirty: true,
  }
}

export function useTransactions(): Transaction[] {
  const { data } = useLiveQuery(db.select().from(transactions).where(isNull(transactions.deleted_at)))
  return data
}

// Income, expenses and balance across a list of transactions
export function summarize(list: Transaction[]) {
  let income = 0
  let expenses = 0
  for (const { type, amount } of list) {
    if (type === 'income') income += amount
    else expenses += amount
  }
  return { income, expenses, balance: income - expenses }
}

export function getTransaction(id: string): Transaction | undefined {
  return db.select().from(transactions).where(and(eq(transactions.id, id), isNull(transactions.deleted_at))).get()
}

export function createTransaction(input: TransactionInput) {
  const now = nowIso()
  db.insert(transactions)
    .values({ ...toColumns(input), id: randomUUID(), created_at: now, updated_at: now, dirty: true })
    .run()
}

export function updateTransaction(id: string, input: TransactionInput) {
  db.update(transactions)
    .set({ ...toColumns(input), updated_at: nowIso(), dirty: true })
    .where(eq(transactions.id, id))
    .run()
}

export function deleteTransaction(id: string) {
  const now = nowIso()
  db.update(transactions)
    .set({ deleted_at: now, updated_at: now, dirty: true })
    .where(eq(transactions.id, id))
    .run()
}

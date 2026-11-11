import type { members, settings, syncState, transactions } from '@/db/schema'

export type Member = typeof members.$inferSelect
export type Transaction = typeof transactions.$inferSelect
export type Settings = typeof settings.$inferSelect
export type SyncState = typeof syncState.$inferSelect

export type MemberStatus = 'active' | 'expiring_soon' | 'expired'
export type MemberWithStatus = Member & { status: MemberStatus }
export const STATUS_LABEL: Record<MemberStatus, string> = {
  active: 'Active',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
}

export const ARCHER_CATEGORIES = ['Barebow', 'Compound', 'Recurve'] as const
export const GENDERS = ['Male', 'Female', 'Other'] as const

export type TransactionType = 'income' | 'expense'
export const MEMBERSHIP_FEE_CATEGORY = 'Membership Fee'
export const INCOME_CATEGORIES = [MEMBERSHIP_FEE_CATEGORY, 'Donation', 'Sponsorship', 'Event Income', 'Other'] as const
export const EXPENSE_CATEGORIES = ['Equipment', 'Venue / Facility', 'Event', 'Training', 'Admin', 'Supplies', 'Other'] as const
export const PAYMENT_MODES = ['Cash', 'GCash', 'Bank Transfer', 'Check', 'Others'] as const
export const DURATION_MONTH_OPTIONS = [1, 3, 6, 12] as const

export interface MemberInput {
  name: string
  contact: string
  address: string
  date_joined: string
  fee: number
  expiry_date: string
  notes: string
  gender: string
  birth_date: string
  category: string
}

export interface TransactionInput {
  type: TransactionType
  category: string
  description: string
  amount: number
  date: string
  payment_mode: string
  notes: string
}

export interface SettingsInput {
  default_duration_months: number
  default_fee: number
  expiry_warning_days: number
}

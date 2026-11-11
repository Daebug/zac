import { addMonths, differenceInDays, differenceInMonths, differenceInYears, format, parseISO } from 'date-fns'
import type { MemberStatus } from '@/types'

const DATE_FORMAT = 'yyyy-MM-dd'
const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })

export const MAX_AMOUNT = 99_999_999.99

export function today(): string {
  return format(new Date(), DATE_FORMAT)
}

export function toDateString(date: Date): string {
  return format(date, DATE_FORMAT)
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function daysUntil(dateStr: string): number {
  return differenceInDays(parseISO(dateStr), new Date())
}

export function getMemberStatus(expiryDateStr: string, warningDays: number): MemberStatus {
  const diff = daysUntil(expiryDateStr)
  if (diff < 0) return 'expired'
  if (diff <= warningDays) return 'expiring_soon'
  return 'active'
}

export function computeExpiryDate(fromDate: string, durationMonths: number): string {
  return format(addMonths(parseISO(fromDate), durationMonths), DATE_FORMAT)
}

// A renewal extends from the current expiry while it is still valid, otherwise from today
export function computeRenewalDate(expiryDate: string, durationMonths: number): string {
  const from = daysUntil(expiryDate) < 0 ? today() : expiryDate
  return computeExpiryDate(from, durationMonths)
}

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, yyyy')
}

export function formatDateTime(isoStr: string): string {
  return format(parseISO(isoStr), 'MMM d, yyyy h:mm a')
}

export function calcAge(birthDate: string | null): number | null {
  return birthDate ? differenceInYears(new Date(), parseISO(birthDate)) : null
}

export function membershipDuration(dateJoined: string): string {
  const joined = parseISO(dateJoined)
  const now = new Date()
  const years = differenceInYears(now, joined)
  const months = differenceInMonths(now, joined) - years * 12
  if (years > 0 && months > 0) return `${years}y ${months}m`
  if (years > 0) return `${years} yr${years > 1 ? 's' : ''}`
  if (months > 0) return `${months} mo`
  return '< 1 mo'
}

// "Expired 3 days ago", "Expires today" or "Expires in 12 days"
export function expiryPhrase(expiryDate: string): string {
  const days = daysUntil(expiryDate)
  if (days < 0) return `Expired ${-days} day${days === -1 ? '' : 's'} ago`
  if (days === 0) return 'Expires today'
  return `Expires in ${days} day${days === 1 ? '' : 's'}`
}

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

// Parses a money field; returns null unless it is a number from `min` up to the server's limit
export function parseAmount(text: string, min = 0): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < min || value > MAX_AMOUNT) return null
  return Math.round(value * 100) / 100
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong'
}

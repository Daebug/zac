import { isValid, parseISO } from 'date-fns'
import * as DocumentPicker from 'expo-document-picker'
import { File, Paths } from 'expo-file-system'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { STATUS_LABEL, type MemberInput, type MemberWithStatus, type Transaction } from '@/types'
import { calcAge, formatCurrency, formatDate, MAX_AMOUNT, plural } from './utils'

const CSV_COLUMNS = [
  'name', 'gender', 'birth_date', 'category', 'contact', 'address', 'date_joined', 'fee', 'expiry_date', 'notes',
] as const
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
// US Letter landscape, in points
const PDF_PAGE = { width: 792, height: 612 }

// ── CSV ─────────────────────────────────────────────────────────────────────

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function toCsv(rows: (string | number | null)[][]): string {
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n')
}

// Splits CSV text into rows of cells, honouring quoted cells that contain commas, quotes or line breaks
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const source = text.replace(/^﻿/, '')

  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter(cells => cells.some(value => value.trim() !== ''))
}

const isDate = (value: string) => DATE_RE.test(value) && isValid(parseISO(value))

// Turns CSV text into members. Throws with the row number of the first problem, so nothing is imported half-way.
export function parseMembersCsv(text: string): MemberInput[] {
  const [header, ...lines] = parseCsv(text)
  if (!header || lines.length === 0) throw new Error('The file has no member rows.')

  const columns = header.map(name => name.trim().toLowerCase())
  if (!columns.includes('name')) throw new Error('The file needs a "name" column. Use the template to get the right columns.')

  return lines.map((cells, index) => {
    const value = (column: string) => (cells[columns.indexOf(column)] ?? '').trim()
    const fail = (problem: string): never => {
      // +2: one for the header row, one because rows are counted from 1
      throw new Error(`Row ${index + 2}: ${problem}`)
    }
    const fee = Number(value('fee'))

    if (!value('name')) fail('name is required')
    if (!isDate(value('date_joined'))) fail('date_joined must be a date like 2025-01-31')
    if (!isDate(value('expiry_date'))) fail('expiry_date must be a date like 2025-01-31')
    if (value('birth_date') && !isDate(value('birth_date'))) fail('birth_date must be a date like 2000-01-31')
    if (value('fee') === '' || !Number.isFinite(fee) || fee < 0 || fee > MAX_AMOUNT) fail('fee must be a number of 0 or more')

    return {
      name: value('name'),
      gender: value('gender'),
      birth_date: value('birth_date'),
      category: value('category'),
      contact: value('contact'),
      address: value('address'),
      date_joined: value('date_joined'),
      fee: Math.round(fee * 100) / 100,
      expiry_date: value('expiry_date'),
      notes: value('notes'),
    }
  })
}

// Lets the user pick a CSV file. Resolves to null if they cancel.
export async function pickMembersCsv(): Promise<MemberInput[] | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true })
  if (result.canceled) return null
  return parseMembersCsv(await new File(result.assets[0].uri).text())
}

// ── Sharing ─────────────────────────────────────────────────────────────────

function cacheFile(name: string): File {
  const file = new File(Paths.cache, name)
  if (file.exists) file.delete()
  return file
}

async function shareText(name: string, text: string, mimeType: string) {
  const file = cacheFile(name)
  file.create()
  await file.write(text)
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name })
}

async function sharePdf(name: string, html: string) {
  const { uri } = await Print.printToFileAsync({ html, ...PDF_PAGE })
  const file = cacheFile(name)
  await new File(uri).move(file)
  await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: name })
}

export function exportMembersCsv(members: MemberWithStatus[]) {
  const rows = members.map(member => CSV_COLUMNS.map(column => member[column]))
  return shareText('zac-members.csv', toCsv([[...CSV_COLUMNS], ...rows]), 'text/csv')
}

export function shareImportTemplate() {
  return shareText('zac-import-template.csv', toCsv([[...CSV_COLUMNS]]), 'text/csv')
}

// ── PDF ─────────────────────────────────────────────────────────────────────

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

function escapeHtml(value: string | number | null): string {
  return value === null ? '' : String(value).replace(/[&<>"']/g, char => HTML_ESCAPES[char])
}

function htmlDocument(title: string, subtitle: string, headers: string[], rows: (string | number | null)[][], footer = ''): string {
  const cells = (tag: string, values: (string | number | null)[]) =>
    `<tr>${values.map(value => `<${tag}>${escapeHtml(value)}</${tag}>`).join('')}</tr>`
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Helvetica, Arial, sans-serif; color: #0f172a; margin: 24px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p { font-size: 11px; color: #64748b; margin: 0 0 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #1e2a5e; color: #fff; text-align: left; padding: 6px; }
  td { padding: 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tfoot td { font-weight: bold; border-bottom: none; text-align: right; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(subtitle)}</p>
<table>
<thead>${cells('th', headers)}</thead>
<tbody>${rows.map(row => cells('td', row)).join('')}</tbody>
${footer}
</table>
</body>
</html>`
}

function printedOn(count: string): string {
  const date = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
  return `Printed ${date} · ${count}`
}

export function exportMembersPdf(members: MemberWithStatus[]) {
  const html = htmlDocument(
    'Zamboanga Archery Club — Members',
    printedOn(plural(members.length, 'member')),
    ['Name', 'Category', 'Age', 'Contact', 'Address', 'Date Joined', 'Expiry Date', 'Status'],
    members.map(member => [
      member.name,
      member.category,
      calcAge(member.birth_date),
      member.contact,
      member.address,
      formatDate(member.date_joined),
      formatDate(member.expiry_date),
      STATUS_LABEL[member.status],
    ]),
  )
  return sharePdf('zac-members.pdf', html)
}

export function exportFundsPdf(transactions: Transaction[], totals: { income: number; expenses: number; balance: number }) {
  const HEADERS = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Payment', 'Notes']
  const totalRow = (label: string, amount: number) =>
    `<tr><td colspan="${HEADERS.length}">${label}: ${escapeHtml(formatCurrency(amount))}</td></tr>`
  const html = htmlDocument(
    'Zamboanga Archery Club — Funds',
    printedOn(plural(transactions.length, 'transaction')),
    HEADERS,
    transactions.map(transaction => [
      formatDate(transaction.date),
      transaction.type === 'income' ? 'Income' : 'Expense',
      transaction.category,
      transaction.description,
      `${transaction.type === 'income' ? '+' : '−'}${formatCurrency(transaction.amount)}`,
      transaction.payment_mode,
      transaction.notes,
    ]),
    `<tfoot>${totalRow('Total Income', totals.income)}${totalRow('Total Expenses', totals.expenses)}${totalRow('Balance', totals.balance)}</tfoot>`,
  )
  return sharePdf('zac-funds.pdf', html)
}

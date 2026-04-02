import type { LeaveRequest, ImportResult, LeaveType, LeaveStatus } from '../types'
import { USERS, LEAVE_TYPES, ALL_STATUSES, CSV_HEADERS, MAX_IMPORT_SIZE_BYTES } from './constants'
import { calcBusinessDays, today } from './date'

/** Prevent CSV formula injection by prefixing dangerous characters */
export function sanitizeForCSV(value: string): string {
  if (typeof value !== 'string') return String(value)
  if (['=', '+', '-', '@', '\t', '\r'].some((c) => value.startsWith(c))) {
    return `'${value}`
  }
  return value
}

function escapeCSVField(value: string): string {
  const sanitized = sanitizeForCSV(String(value))
  if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n')) {
    return `"${sanitized.replace(/"/g, '""')}"`
  }
  return sanitized
}

function rowToCSV(r: LeaveRequest): string {
  return CSV_HEADERS.map((h) => escapeCSVField(String((r as unknown as Record<string, string>)[h] ?? '')))
    .join(',')
}

export function exportToCSV(requests: LeaveRequest[], filename = 'leave-export.csv'): void {
  const header = CSV_HEADERS.join(',')
  const rows = requests.map(rowToCSV)
  const content = [header, ...rows].join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, filename)
}

export function downloadTemplate(): void {
  const header = CSV_HEADERS.join(',')
  const example = [
    crypto.randomUUID(),
    'u01',
    'Vacation',
    `${today()}`,
    `${today()}`,
    'Annual leave',
    'Submitted',
    new Date().toISOString(),
    new Date().toISOString(),
  ]
    .map(escapeCSVField)
    .join(',')
  const blob = new Blob([[header, example].join('\n')], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, 'leave-import-template.csv')
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

export async function importFromCSV(
  file: File,
  allRequests: LeaveRequest[],
): Promise<ImportResult> {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('Only .csv files are accepted.')
  }
  if (file.size > MAX_IMPORT_SIZE_BYTES) {
    throw new Error('File exceeds maximum size of 2 MB.')
  }

  const text = await file.text()
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) {
    throw new Error('CSV file has no data rows.')
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.trim())
  const requiredHeaders: Array<keyof LeaveRequest> = ['id', 'userId', 'leaveType', 'startDate', 'endDate', 'reason', 'status']
  const missing = requiredHeaders.filter((h) => !headers.includes(h))
  if (missing.length > 0) {
    throw new Error(`Missing columns: ${missing.join(', ')}`)
  }

  const userIds = new Set(USERS.map((u) => u.id))
  const errors: Array<{ row: number; message: string }> = []
  const upsertMap = new Map(allRequests.map((r) => [r.id, r]))

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? '').trim() })

    if (!row['id']) { errors.push({ row: rowNum, message: 'Missing id.' }); continue }
    if (!userIds.has(row['userId'])) { errors.push({ row: rowNum, message: `Unknown userId: ${row['userId']}` }); continue }
    if (!(LEAVE_TYPES as readonly string[]).includes(row['leaveType'])) { errors.push({ row: rowNum, message: `Invalid leaveType: ${row['leaveType']}` }); continue }
    if (!(ALL_STATUSES as readonly string[]).includes(row['status'])) { errors.push({ row: rowNum, message: `Invalid status: ${row['status']}` }); continue }
    if (!row['startDate'] || !row['endDate']) { errors.push({ row: rowNum, message: 'Missing startDate or endDate.' }); continue }
    if (row['endDate'] < row['startDate']) { errors.push({ row: rowNum, message: 'endDate before startDate.' }); continue }

    const duration = calcBusinessDays(row['startDate'], row['endDate'])
    const existing = upsertMap.get(row['id'])
    const now = new Date().toISOString()

    const updated: LeaveRequest = {
      ...(existing ?? {}),
      id: row['id'],
      userId: row['userId'],
      leaveType: row['leaveType'] as LeaveType,
      startDate: row['startDate'],
      endDate: row['endDate'],
      reason: row['reason'] ?? '',
      status: row['status'] as LeaveStatus,
      duration,
      createdAt: row['createdAt'] || existing?.createdAt || now,
      updatedAt: now,
      auditTrail: [
        ...(existing?.auditTrail ?? []),
        { timestamp: now, action: 'import', actor: 'Manager', details: 'Imported via CSV.' },
      ],
    }
    upsertMap.set(row['id'], updated)
  }

  if (errors.length > 0) {
    exportErrorReport(errors)
  }

  return { requests: Array.from(upsertMap.values()), errors }
}

function exportErrorReport(errors: Array<{ row: number; message: string }>): void {
  const header = 'row,message'
  const rows = errors.map(({ row, message }) => `${row},${escapeCSVField(message)}`)
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  triggerDownload(blob, `leave-import-errors-${ts}.csv`)
}

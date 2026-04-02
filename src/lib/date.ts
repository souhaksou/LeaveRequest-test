import { COMPANY_HOLIDAYS } from './constants'

export function floorTo2Decimals(n: number): number {
  return Math.floor(n * 100) / 100
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function toISODateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function calcBusinessDays(
  startDate: string,
  endDate: string,
  holidays: string[] = COMPANY_HOLIDAYS,
): number {
  const holidaySet = new Set(holidays)
  const start = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)

  if (end < start) return 0

  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const iso = toISODateString(cur)
    if (!isWeekend(cur) && !holidaySet.has(iso)) {
      count++
    }
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export function today(): string {
  return toISODateString(new Date())
}

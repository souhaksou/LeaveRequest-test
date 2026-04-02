import { describe, it, expect } from 'vitest'
import { floorTo2Decimals, calcBusinessDays, isWeekend, parseLocalDate } from './date'

describe('floorTo2Decimals', () => {
  it('floors positive numbers to 2 decimal places', () => {
    expect(floorTo2Decimals(1.999)).toBe(1.99)
    expect(floorTo2Decimals(3.456)).toBe(3.45)
  })

  it('leaves already-2-decimal numbers unchanged', () => {
    expect(floorTo2Decimals(2.50)).toBe(2.50)
    expect(floorTo2Decimals(0.10)).toBe(0.10)
  })

  it('handles integers', () => {
    expect(floorTo2Decimals(5)).toBe(5)
    expect(floorTo2Decimals(0)).toBe(0)
  })
})

describe('calcBusinessDays', () => {
  it('counts a single Monday as 1 business day', () => {
    // 2024-04-08 is a Monday
    expect(calcBusinessDays('2024-04-08', '2024-04-08', [])).toBe(1)
  })

  it('counts Mon–Fri as 5 business days', () => {
    // 2024-04-08 (Mon) to 2024-04-12 (Fri)
    expect(calcBusinessDays('2024-04-08', '2024-04-12', [])).toBe(5)
  })

  it('excludes Saturday and Sunday', () => {
    // 2024-04-08 (Mon) to 2024-04-14 (Sun) = 5 business days
    expect(calcBusinessDays('2024-04-08', '2024-04-14', [])).toBe(5)
  })

  it('excludes configured holidays', () => {
    // Mon–Fri with one holiday on Wednesday
    expect(calcBusinessDays('2024-04-08', '2024-04-12', ['2024-04-10'])).toBe(4)
  })

  it('returns 0 when end is before start', () => {
    expect(calcBusinessDays('2024-04-12', '2024-04-08', [])).toBe(0)
  })

  it('returns 0 for a weekend-only range', () => {
    // 2024-04-13 (Sat) to 2024-04-14 (Sun)
    expect(calcBusinessDays('2024-04-13', '2024-04-14', [])).toBe(0)
  })

  it('uses COMPANY_HOLIDAYS by default when no holidays arg provided', () => {
    // 2024-12-25 (Wed) and 2024-12-26 (Thu) are both in COMPANY_HOLIDAYS
    // 2024-12-23 (Mon) to 2024-12-27 (Fri) = 3 business days (Wed + Thu excluded)
    const result = calcBusinessDays('2024-12-23', '2024-12-27')
    expect(result).toBe(3)
  })
})

describe('isWeekend', () => {
  it('returns true for Saturday', () => {
    expect(isWeekend(new Date('2024-04-13'))).toBe(true)
  })

  it('returns true for Sunday', () => {
    expect(isWeekend(new Date('2024-04-14'))).toBe(true)
  })

  it('returns false for weekdays', () => {
    expect(isWeekend(parseLocalDate('2024-04-08'))).toBe(false)
    expect(isWeekend(parseLocalDate('2024-04-12'))).toBe(false)
  })
})

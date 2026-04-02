import { describe, it, expect, vi } from 'vitest'
import { validateLeaveRequest, calcUsedBalance } from './validation'
import type { LeaveRequest } from '../types'

// Mock today() so tests aren't date-dependent
vi.mock('./date', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./date')>()
  return {
    ...actual,
    today: () => '2025-01-01',
  }
})

function makeRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 'req-1',
    userId: 'u01',
    leaveType: 'Vacation',
    startDate: '2025-06-01',
    endDate: '2025-06-05',
    reason: 'Holiday trip',
    status: 'Submitted',
    duration: 5,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    auditTrail: [],
    ...overrides,
  }
}

describe('validateLeaveRequest — required fields', () => {
  it('errors when userId is missing', () => {
    const errors = validateLeaveRequest({ ...makeRequest(), userId: '' }, [])
    expect(errors.some((e) => e.field === 'userId')).toBe(true)
  })

  it('errors when leaveType is missing', () => {
    const draft = { ...makeRequest(), leaveType: undefined } as Partial<LeaveRequest>
    const errors = validateLeaveRequest(draft, [])
    expect(errors.some((e) => e.field === 'leaveType')).toBe(true)
  })

  it('errors when reason is empty', () => {
    const errors = validateLeaveRequest({ ...makeRequest(), reason: '  ' }, [])
    expect(errors.some((e) => e.field === 'reason')).toBe(true)
  })

  it('passes with all required fields filled', () => {
    const errors = validateLeaveRequest(makeRequest(), [])
    expect(errors).toHaveLength(0)
  })
})

describe('validateLeaveRequest — date rules', () => {
  it('errors when startDate is in the past', () => {
    const errors = validateLeaveRequest({ ...makeRequest(), startDate: '2024-12-01' }, [])
    expect(errors.some((e) => e.field === 'startDate')).toBe(true)
  })

  it('errors when endDate is before startDate', () => {
    const errors = validateLeaveRequest(
      { ...makeRequest(), startDate: '2025-06-10', endDate: '2025-06-05' },
      [],
    )
    expect(errors.some((e) => e.field === 'endDate')).toBe(true)
  })
})

describe('validateLeaveRequest — overlap detection', () => {
  const existing = makeRequest({ id: 'req-existing', startDate: '2025-06-03', endDate: '2025-06-07' })

  it('errors when dates overlap with an active request', () => {
    const draft = makeRequest({ id: 'req-new' }) // 2025-06-01 to 2025-06-05 overlaps
    const errors = validateLeaveRequest(draft, [existing])
    expect(errors.some((e) => e.message.includes('Overlaps'))).toBe(true)
  })

  it('does not error when overlapping request is Cancelled', () => {
    const cancelled = { ...existing, status: 'Cancelled' as const }
    const draft = makeRequest({ id: 'req-new' })
    const errors = validateLeaveRequest(draft, [cancelled])
    expect(errors.some((e) => e.message.includes('Overlaps'))).toBe(false)
  })

  it('does not error when overlapping request is Rejected', () => {
    const rejected = { ...existing, status: 'Rejected' as const }
    const draft = makeRequest({ id: 'req-new' })
    const errors = validateLeaveRequest(draft, [rejected])
    expect(errors.some((e) => e.message.includes('Overlaps'))).toBe(false)
  })
})

describe('validateLeaveRequest — leave balance', () => {
  it('errors when requested duration exceeds remaining balance', () => {
    // Vacation quota = 15. Pre-existing approved = 13 days used.
    const approved = makeRequest({
      id: 'req-prev',
      status: 'Approved',
      duration: 13,
      startDate: '2025-03-01',
      endDate: '2025-03-14',
    })
    // Draft requests 5 more days (2025-06-02 Mon to 2025-06-06 Fri = 5 days)
    const draft = makeRequest({ id: 'req-new', startDate: '2025-06-02', endDate: '2025-06-06' })
    const errors = validateLeaveRequest(draft, [approved])
    expect(errors.some((e) => e.field === 'duration')).toBe(true)
  })

  it('passes when duration is within remaining balance', () => {
    const errors = validateLeaveRequest(makeRequest(), [])
    expect(errors).toHaveLength(0)
  })
})

describe('calcUsedBalance', () => {
  const requests: LeaveRequest[] = [
    makeRequest({ id: 'a', userId: 'u01', leaveType: 'Vacation', status: 'Approved', duration: 5 }),
    makeRequest({ id: 'b', userId: 'u01', leaveType: 'Vacation', status: 'Submitted', duration: 3 }),
    makeRequest({ id: 'c', userId: 'u01', leaveType: 'Vacation', status: 'Cancelled', duration: 2 }),
    makeRequest({ id: 'd', userId: 'u01', leaveType: 'Vacation', status: 'Rejected', duration: 4 }),
    makeRequest({ id: 'e', userId: 'u02', leaveType: 'Vacation', status: 'Approved', duration: 7 }),
  ]

  it('sums Approved + Submitted durations for the user and type', () => {
    expect(calcUsedBalance('u01', 'Vacation', requests)).toBe(8)
  })

  it('excludes Cancelled and Rejected', () => {
    const used = calcUsedBalance('u01', 'Vacation', requests)
    expect(used).not.toBeGreaterThan(8)
  })

  it('excludes the specified id (for edit scenario)', () => {
    expect(calcUsedBalance('u01', 'Vacation', requests, 'b')).toBe(5)
  })

  it('returns 0 for a different user', () => {
    expect(calcUsedBalance('u03', 'Vacation', requests)).toBe(0)
  })
})

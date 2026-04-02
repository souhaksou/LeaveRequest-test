import type { LeaveRequest, LeaveType, ValidationError } from '../types'
import { LEAVE_QUOTAS } from './constants'
import { calcBusinessDays, today } from './date'

export function calcUsedBalance(
  userId: string,
  leaveType: LeaveType,
  requests: LeaveRequest[],
  excludeId?: string,
): number {
  return requests
    .filter(
      (r) =>
        r.userId === userId &&
        r.leaveType === leaveType &&
        r.status !== 'Cancelled' &&
        r.status !== 'Rejected' &&
        r.id !== excludeId,
    )
    .reduce((sum, r) => sum + r.duration, 0)
}

function hasOverlap(
  a: { startDate: string; endDate: string },
  b: { startDate: string; endDate: string },
): boolean {
  return a.startDate <= b.endDate && a.endDate >= b.startDate
}

export function validateLeaveRequest(
  draft: Partial<LeaveRequest>,
  allRequests: LeaveRequest[],
): ValidationError[] {
  const errors: ValidationError[] = []

  if (!draft.userId) {
    errors.push({ field: 'userId', message: 'User is required.' })
  }
  if (!draft.leaveType) {
    errors.push({ field: 'leaveType', message: 'Leave type is required.' })
  }
  if (!draft.reason || draft.reason.trim() === '') {
    errors.push({ field: 'reason', message: 'Reason is required.' })
  }
  if (!draft.startDate) {
    errors.push({ field: 'startDate', message: 'Start date is required.' })
  }
  if (!draft.endDate) {
    errors.push({ field: 'endDate', message: 'End date is required.' })
  }

  if (draft.startDate && draft.startDate < today()) {
    errors.push({ field: 'startDate', message: 'Start date cannot be in the past.' })
  }
  if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
    errors.push({ field: 'endDate', message: 'End date must be on or after start date.' })
  }

  if (draft.startDate && draft.endDate && draft.startDate <= draft.endDate) {
    const duration = calcBusinessDays(draft.startDate, draft.endDate)
    if (duration <= 0) {
      errors.push({ message: 'The selected period contains no working days.' })
    }

    if (draft.userId && draft.leaveType) {
      const quota = LEAVE_QUOTAS[draft.leaveType]
      const used = calcUsedBalance(draft.userId, draft.leaveType, allRequests, draft.id)
      if (duration > quota - used) {
        errors.push({
          field: 'duration',
          message: `Insufficient balance. ${quota - used} day(s) remaining for ${draft.leaveType}.`,
        })
      }
    }

    if (draft.userId) {
      const conflict = allRequests.find(
        (r) =>
          r.id !== draft.id &&
          r.userId === draft.userId &&
          r.status !== 'Cancelled' &&
          r.status !== 'Rejected' &&
          hasOverlap(
            { startDate: draft.startDate!, endDate: draft.endDate! },
            { startDate: r.startDate, endDate: r.endDate },
          ),
      )
      if (conflict) {
        errors.push({
          message: `Overlaps with an existing request (${conflict.startDate} – ${conflict.endDate}).`,
        })
      }
    }
  }

  return errors
}

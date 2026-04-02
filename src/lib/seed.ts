import { faker } from '@faker-js/faker'
import type { LeaveRequest, LeaveStatus, LeaveType, AuditEvent } from '../types'
import { USERS, LEAVE_TYPES } from './constants'
import { calcBusinessDays, toISODateString } from './date'
import { loadRequests, saveRequests } from './storage'

const STATUSES: LeaveStatus[] = ['Submitted', 'Approved', 'Rejected', 'Cancelled']

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function generateRequest(): LeaveRequest {
  const user = faker.helpers.arrayElement(USERS)
  const leaveType: LeaveType = faker.helpers.arrayElement(LEAVE_TYPES)
  const status: LeaveStatus = faker.helpers.weightedArrayElement([
    { value: 'Approved' as LeaveStatus, weight: 50 },
    { value: 'Submitted' as LeaveStatus, weight: 20 },
    { value: 'Rejected' as LeaveStatus, weight: 15 },
    { value: 'Cancelled' as LeaveStatus, weight: 15 },
  ])

  const startDate = randomDate(new Date('2022-01-01'), new Date('2025-12-01'))
  const endDate = addDays(startDate, faker.number.int({ min: 0, max: 10 }))

  const startStr = toISODateString(startDate)
  const endStr = toISODateString(endDate)
  const duration = calcBusinessDays(startStr, endStr)

  const createdAt = faker.date.between({ from: startDate, to: new Date() }).toISOString()
  const updatedAt = new Date(
    Math.max(new Date(createdAt).getTime(), faker.date.recent({ days: 30 }).getTime()),
  ).toISOString()

  const id = crypto.randomUUID()

  const auditTrail: AuditEvent[] = [
    {
      timestamp: createdAt,
      action: 'create',
      actor: user.name,
      details: `Request submitted for ${leaveType} leave.`,
    },
  ]

  if (status === 'Approved') {
    auditTrail.push({
      timestamp: updatedAt,
      action: 'approve',
      actor: 'Manager',
      details: 'Request approved.',
    })
  } else if (status === 'Rejected') {
    auditTrail.push({
      timestamp: updatedAt,
      action: 'reject',
      actor: 'Manager',
      details: faker.helpers.arrayElement([
        'Insufficient coverage.',
        'Overlapping team schedule.',
        'Peak business period.',
      ]),
    })
  } else if (status === 'Cancelled') {
    auditTrail.push({
      timestamp: updatedAt,
      action: 'cancel',
      actor: user.name,
      details: 'Request cancelled by employee.',
    })
  }

  return {
    id,
    userId: user.id,
    leaveType,
    startDate: startStr,
    endDate: endStr,
    reason: faker.lorem.sentence(),
    status,
    duration,
    createdAt,
    updatedAt,
    auditTrail,
  }
}

export function seedIfEmpty(): LeaveRequest[] {
  const existing = loadRequests()
  if (existing.length > 0) return existing

  faker.seed(42)
  const requests: LeaveRequest[] = Array.from({ length: 500 }, generateRequest)
  saveRequests(requests)
  return requests
}

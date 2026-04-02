import type { LeaveType, User } from '../types'

export const STORAGE_KEY = 'leave-requests-v1'

export const USERS: User[] = [
  { id: 'u01', name: 'Alice Johnson' },
  { id: 'u02', name: 'Bob Smith' },
  { id: 'u03', name: 'Carol Williams' },
  { id: 'u04', name: 'David Brown' },
  { id: 'u05', name: 'Eva Martinez' },
  { id: 'u06', name: 'Frank Lee' },
  { id: 'u07', name: 'Grace Kim' },
  { id: 'u08', name: 'Henry Chen' },
  { id: 'u09', name: 'Iris Patel' },
  { id: 'u10', name: 'James Wilson' },
]

export const LEAVE_TYPES: LeaveType[] = ['Personal', 'Sick', 'Vacation', 'Bereavement']

export const LEAVE_QUOTAS: Record<LeaveType, number> = {
  Personal: 7,
  Sick: 10,
  Vacation: 15,
  Bereavement: 5,
}

// Company holidays (YYYY-MM-DD) — add years as needed
export const COMPANY_HOLIDAYS: string[] = [
  // 2023
  '2023-01-01', '2023-01-02',
  '2023-04-07', '2023-04-10',
  '2023-05-01',
  '2023-12-25', '2023-12-26',
  // 2024
  '2024-01-01',
  '2024-03-29', '2024-04-01',
  '2024-05-01',
  '2024-12-25', '2024-12-26',
  // 2025
  '2025-01-01',
  '2025-04-18', '2025-04-21',
  '2025-05-01',
  '2025-12-25', '2025-12-26',
  // 2026
  '2026-01-01',
  '2026-04-03', '2026-04-06',
  '2026-05-01',
  '2026-12-25', '2026-12-26',
]

export const ALL_STATUSES = ['Submitted', 'Approved', 'Rejected', 'Cancelled'] as const

export const CSV_HEADERS = ['id', 'userId', 'leaveType', 'startDate', 'endDate', 'reason', 'status', 'createdAt', 'updatedAt'] as const

export const MAX_IMPORT_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

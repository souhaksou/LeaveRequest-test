export type LeaveType = 'Personal' | 'Sick' | 'Vacation' | 'Bereavement'
export type LeaveStatus = 'Submitted' | 'Approved' | 'Rejected' | 'Cancelled'
export type Role = 'Employee' | 'Manager'
export type AuditAction = 'create' | 'edit' | 'approve' | 'reject' | 'cancel' | 'import' | 'delete'

export interface User {
  id: string
  name: string
}

export interface AuditEvent {
  timestamp: string
  action: AuditAction
  actor: string
  details?: string
}

export interface LeaveRequest {
  id: string
  userId: string
  leaveType: LeaveType
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
  reason: string
  status: LeaveStatus
  duration: number    // business days
  createdAt: string   // ISO datetime
  updatedAt: string   // ISO datetime
  auditTrail: AuditEvent[]
}

export interface LeaveBalance {
  leaveType: LeaveType
  quota: number
  used: number
  remaining: number
}

export interface FilterState {
  userId: string
  startDate: string
  endDate: string
  status: LeaveStatus[]
}

export interface ValidationError {
  field?: string
  message: string
}

export interface ImportResult {
  requests: LeaveRequest[]
  errors: Array<{ row: number; message: string }>
}

import { STORAGE_KEY } from './constants'
import type { LeaveRequest } from '../types'

export function loadRequests(): LeaveRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as LeaveRequest[]
  } catch {
    return []
  }
}

export function saveRequests(requests: LeaveRequest[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests))
  } catch {
    // localStorage quota exceeded — data persists in memory only for this session
  }
}

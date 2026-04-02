import type { LeaveRequest, Role, FilterState } from '../types'
import { USERS } from './constants'

function userName(userId: string): string {
  return USERS.find((u) => u.id === userId)?.name ?? userId
}

export async function exportToPDF(
  requests: LeaveRequest[],
  filters: FilterState,
  role: Role,
): Promise<void> {
  // Lazy-load PDF libraries on demand to keep initial bundle small
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ orientation: 'landscape' })
  const now = new Date().toLocaleString()

  doc.setFontSize(16)
  doc.text('Leave Management Report', 14, 18)

  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(`Generated: ${now}`, 14, 25)
  doc.text(`Role: ${role}`, 14, 30)

  const activeFilters: string[] = []
  if (filters.userId) activeFilters.push(`User: ${userName(filters.userId)}`)
  if (filters.startDate) activeFilters.push(`From: ${filters.startDate}`)
  if (filters.endDate) activeFilters.push(`To: ${filters.endDate}`)
  if (filters.status.length > 0) activeFilters.push(`Status: ${filters.status.join(', ')}`)
  if (activeFilters.length > 0) {
    doc.text(`Filters: ${activeFilters.join(' | ')}`, 14, 35)
  }

  const head = [['ID', 'User', 'Type', 'Start', 'End', 'Days', 'Status', 'Reason']]
  const body = requests.map((r) => [
    r.id.slice(0, 8),
    userName(r.userId),
    r.leaveType,
    r.startDate,
    r.endDate,
    String(r.duration),
    r.status,
    r.reason.length > 40 ? r.reason.slice(0, 40) + '…' : r.reason,
  ])

  autoTable(doc, {
    head,
    body,
    startY: activeFilters.length > 0 ? 40 : 34,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [25, 118, 210] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  })

  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  doc.save(`leave-report-${ts}.pdf`)
}

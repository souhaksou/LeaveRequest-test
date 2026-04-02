import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material'
import type { ReactNode } from 'react'
import { alpha } from '@mui/material/styles'
import { USERS } from '../lib/constants'
import type { LeaveRequest, LeaveStatus } from '../types'

const STATUS_COLORS: Record<LeaveStatus, 'success' | 'warning' | 'error' | 'default'> = {
  Approved: 'success',
  Submitted: 'warning',
  Rejected: 'error',
  Cancelled: 'default',
}

interface Column {
  field: keyof LeaveRequest
  label: string
  width?: number | string
}

const COLUMNS: Column[] = [
  { field: 'userId', label: 'Employee', width: 160 },
  { field: 'leaveType', label: 'Leave Type', width: 130 },
  { field: 'startDate', label: 'Start Date', width: 120 },
  { field: 'endDate', label: 'End Date', width: 120 },
  { field: 'duration', label: 'Days', width: 80 },
  { field: 'status', label: 'Status', width: 120 },
  { field: 'reason', label: 'Reason' },
  { field: 'createdAt', label: 'Created At', width: 190 },
]

interface Props {
  requests: LeaveRequest[]
  groupByUser: boolean
  sortField: keyof LeaveRequest
  sortAsc: boolean
  onSortChange: (field: keyof LeaveRequest) => void
  onRowClick: (req: LeaveRequest) => void
  selectedId?: string
}

function userName(userId: string): string {
  return USERS.find((u) => u.id === userId)?.name ?? userId
}

function formatCell(req: LeaveRequest, field: keyof LeaveRequest): ReactNode {
  const val = req[field]
  if (field === 'userId') return userName(req.userId)
  if (field === 'status') {
    return (
      <Chip
        label={req.status}
        size="small"
        color={STATUS_COLORS[req.status]}
        variant={req.status === 'Submitted' ? 'filled' : 'outlined'}
      />
    )
  }
  if (field === 'createdAt' || field === 'updatedAt') {
    return new Date(String(val)).toLocaleString()
  }
  if (field === 'reason') {
    const text = String(val)
    return text.length > 68 ? `${text.slice(0, 68)}...` : text
  }
  return String(val ?? '')
}

export function RequestTable({
  requests,
  groupByUser,
  sortField,
  sortAsc,
  onSortChange,
  onRowClick,
  selectedId,
}: Props) {
  if (requests.length === 0) {
    return (
      <Paper
        sx={{
          py: 8,
          textAlign: 'center',
          bgcolor: 'background.paper',
          borderStyle: 'dashed',
        }}
      >
        <Typography variant="h6">No requests match your current filters</Typography>
        <Typography variant="body2" color="text.secondary">
          Try clearing filters or adjusting your search terms.
        </Typography>
      </Paper>
    )
  }

  type RowItem = { type: 'header'; label: string } | { type: 'data'; req: LeaveRequest }
  const rows: RowItem[] = []

  if (groupByUser) {
    const byUser = new Map<string, LeaveRequest[]>()
    for (const req of requests) {
      const arr = byUser.get(req.userId) ?? []
      arr.push(req)
      byUser.set(req.userId, arr)
    }
    for (const [uid, userRequests] of byUser) {
      rows.push({ type: 'header', label: `${userName(uid)} · ${userRequests.length} request(s)` })
      for (const req of userRequests) rows.push({ type: 'data', req })
    }
  } else {
    for (const req of requests) rows.push({ type: 'data', req })
  }

  return (
    <TableContainer component={Paper} elevation={0} sx={{ maxHeight: '100%', borderRadius: 1.8, border: '1px solid', borderColor: 'divider' }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            {COLUMNS.map((col) => (
              <TableCell
                key={col.field}
                style={{ width: col.width }}
                sx={{
                  fontWeight: 700,
                  bgcolor: alpha('#d4a843', 0.05),
                  borderBottom: '2px solid',
                  borderColor: 'divider',
                  color: 'primary.light',
                  fontSize: '0.7rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                <TableSortLabel
                  active={sortField === col.field}
                  direction={sortField === col.field && sortAsc ? 'asc' : 'desc'}
                  onClick={() => onSortChange(col.field)}
                >
                  {col.label}
                </TableSortLabel>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((item, idx) => {
            if (item.type === 'header') {
              return (
                <TableRow key={`hdr-${idx}`}>
                  <TableCell
                    colSpan={COLUMNS.length}
                    sx={{
                      bgcolor: alpha('#d4a843', 0.08),
                      color: 'primary.main',
                      fontWeight: 700,
                      py: 0.85,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {item.label}
                  </TableCell>
                </TableRow>
              )
            }

            const { req } = item
            const isSelected = req.id === selectedId

            return (
              <TableRow
                key={req.id}
                hover
                selected={isSelected}
                onClick={() => onRowClick(req)}
                sx={{
                  cursor: 'pointer',
                  '& .MuiTableCell-root': {
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  },
                  '&.Mui-selected': {
                    bgcolor: alpha('#d4a843', 0.1),
                  },
                  '&.Mui-selected:hover': {
                    bgcolor: alpha('#d4a843', 0.16),
                  },
                }}
              >
                {COLUMNS.map((col) => (
                  <TableCell key={col.field} style={{ width: col.width }}>
                    <Box
                      sx={{
                        whiteSpace: col.field === 'reason' ? 'normal' : 'nowrap',
                        wordBreak: col.field === 'reason' ? 'break-word' : 'normal',
                      }}
                    >
                      {formatCell(req, col.field)}
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

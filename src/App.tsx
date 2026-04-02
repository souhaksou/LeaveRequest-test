import { useState, useMemo, useEffect, useCallback, type ReactNode } from 'react'
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Snackbar,
  Alert,
  Chip,
  Typography,
  Paper,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import SummarizeRoundedIcon from '@mui/icons-material/SummarizeRounded'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import { Toolbar } from './components/Toolbar'
import { Filters } from './components/Filters'
import { RequestTable } from './components/RequestTable'
import { DetailsDrawer } from './components/DetailsDrawer'
import { saveRequests } from './lib/storage'
import { seedIfEmpty } from './lib/seed'
import { validateLeaveRequest } from './lib/validation'
import { USERS, LEAVE_QUOTAS } from './lib/constants'
import { calcBusinessDays, today } from './lib/date'
import { exportToCSV, importFromCSV, downloadTemplate } from './lib/csv'
import { exportToPDF } from './lib/pdf'
import type {
  LeaveRequest,
  Role,
  FilterState,
  LeaveBalance,
  LeaveType,
  ValidationError,
} from './types'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#d4a843',
      dark: '#b58a28',
      light: '#e8c46a',
    },
    secondary: {
      main: '#47c4a4',
      dark: '#2ea886',
      light: '#7addc5',
    },
    background: {
      default: '#0c0f14',
      paper: '#131920',
    },
    text: {
      primary: '#dce8f0',
      secondary: '#7a8a9a',
    },
    success: { main: '#3ba861', dark: '#2d8a4e', light: '#5ec47e' },
    error: { main: '#e05252', dark: '#c23a3a', light: '#ea7272' },
    warning: { main: '#c9921e', dark: '#a87718', light: '#ddb045' },
    divider: '#1e2a38',
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: '"Syne", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    h4: {
      fontFamily: '"Bebas Neue", "Impact", sans-serif',
      fontWeight: 400,
      letterSpacing: '0.04em',
    },
    h6: {
      fontFamily: '"Bebas Neue", "Impact", sans-serif',
      fontWeight: 400,
      letterSpacing: '0.06em',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: '#0c0f14',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: '1px solid #1e2a38',
          boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          backgroundColor: alpha('#0c0f14', 0.5),
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderLeft: '1px solid #1e2a38',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          '&.Mui-selected': {
            backgroundColor: alpha('#d4a843', 0.14),
            color: '#d4a843',
            borderColor: alpha('#d4a843', 0.4),
            '&:hover': {
              backgroundColor: alpha('#d4a843', 0.2),
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#1e2a38',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#ffffff', 0.08),
        },
      },
    },
  },
})

const DEFAULT_FILTERS: FilterState = {
  userId: '',
  startDate: '',
  endDate: '',
  status: [],
}

function newRequest(userId: string): Partial<LeaveRequest> {
  return {
    userId,
    leaveType: 'Vacation',
    startDate: today(),
    endDate: today(),
    reason: '',
    status: 'Submitted',
    duration: 0,
  }
}

export default function App() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [role, setRole] = useState<Role>('Employee')
  const [currentUserId, setCurrentUserId] = useState<string>(USERS[0].id)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [sortField, setSortField] = useState<keyof LeaveRequest>('createdAt')
  const [sortAsc, setSortAsc] = useState(false)
  const [groupByUser, setGroupByUser] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<LeaveRequest> | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setRequests(seedIfEmpty()), 0)
    return () => clearTimeout(id)
  }, [])

  const persist = useCallback((updated: LeaveRequest[]) => {
    setRequests(updated)
    saveRequests(updated)
  }, [])

  const scopedRequests = useMemo(
    () => requests.filter((r) => role === 'Manager' || r.userId === currentUserId),
    [requests, role, currentUserId],
  )

  const filteredRequests = useMemo(() => {
    const q = search.toLowerCase()
    return scopedRequests
      .filter((r) => {
        if (filters.userId && r.userId !== filters.userId) return false
        if (filters.startDate && r.startDate < filters.startDate) return false
        if (filters.endDate && r.endDate > filters.endDate) return false
        if (filters.status.length > 0 && !filters.status.includes(r.status)) return false
        if (q) {
          const user = USERS.find((u) => u.id === r.userId)
          const haystack = [r.id, r.leaveType, r.reason, r.status, user?.name ?? '']
            .join(' ')
            .toLowerCase()
          if (!haystack.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        const av = String(a[sortField] ?? '')
        const bv = String(b[sortField] ?? '')
        const cmp = av.localeCompare(bv)
        return sortAsc ? cmp : -cmp
      })
  }, [scopedRequests, filters, search, sortField, sortAsc])

  function calcBalance(userId: string): LeaveBalance[] {
    return (['Personal', 'Sick', 'Vacation', 'Bereavement'] as LeaveType[]).map((lt) => {
      const quota = LEAVE_QUOTAS[lt]
      const used = requests
        .filter(
          (r) =>
            r.userId === userId &&
            r.leaveType === lt &&
            r.status !== 'Cancelled' &&
            r.status !== 'Rejected',
        )
        .reduce((s, r) => s + r.duration, 0)
      return { leaveType: lt, quota, used, remaining: quota - used }
    })
  }

  function handleRowClick(req: LeaveRequest) {
    setSelectedRequest(req)
    setEditDraft(null)
    setValidationErrors([])
    setDrawerOpen(true)
  }

  function handleAddRequest() {
    setSelectedRequest(null)
    setEditDraft(newRequest(currentUserId))
    setValidationErrors([])
    setDrawerOpen(true)
  }

  function handleSaveDraft(draft: Partial<LeaveRequest>) {
    const duration = calcBusinessDays(draft.startDate ?? '', draft.endDate ?? '')
    const withDuration = { ...draft, duration }
    const errors = validateLeaveRequest(withDuration, requests)
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    const now = new Date().toISOString()
    const actor = USERS.find((u) => u.id === currentUserId)?.name ?? 'User'
    if (selectedRequest) {
      // Edit
      const updated = requests.map((r) =>
        r.id === selectedRequest.id
          ? {
              ...r,
              ...withDuration,
              updatedAt: now,
              auditTrail: [
                ...r.auditTrail,
                { timestamp: now, action: 'edit' as const, actor, details: 'Request edited.' },
              ],
            }
          : r,
      )
      persist(updated)
      const refreshed = updated.find((r) => r.id === selectedRequest.id)!
      setSelectedRequest(refreshed)
    } else {
      // Create
      const req: LeaveRequest = {
        id: crypto.randomUUID(),
        userId: withDuration.userId ?? currentUserId,
        leaveType: withDuration.leaveType ?? 'Vacation',
        startDate: withDuration.startDate ?? today(),
        endDate: withDuration.endDate ?? today(),
        reason: withDuration.reason ?? '',
        status: 'Submitted',
        duration,
        createdAt: now,
        updatedAt: now,
        auditTrail: [{ timestamp: now, action: 'create', actor, details: 'Request submitted.' }],
      }
      persist([req, ...requests])
      setSelectedRequest(req)
    }
    setEditDraft(null)
    setValidationErrors([])
    setSnack({ msg: selectedRequest ? 'Request updated.' : 'Request submitted.', severity: 'success' })
  }

  function handleApprove(req: LeaveRequest) {
    const now = new Date().toISOString()
    const updated = requests.map((r) =>
      r.id === req.id
        ? {
            ...r,
            status: 'Approved' as const,
            updatedAt: now,
            auditTrail: [
              ...r.auditTrail,
              { timestamp: now, action: 'approve' as const, actor: 'Manager', details: 'Approved.' },
            ],
          }
        : r,
    )
    persist(updated)
    setSelectedRequest(updated.find((r) => r.id === req.id)!)
    setSnack({ msg: 'Request approved.', severity: 'success' })
  }

  function handleReject(req: LeaveRequest, reason: string) {
    const now = new Date().toISOString()
    const updated = requests.map((r) =>
      r.id === req.id
        ? {
            ...r,
            status: 'Rejected' as const,
            updatedAt: now,
            auditTrail: [
              ...r.auditTrail,
              { timestamp: now, action: 'reject' as const, actor: 'Manager', details: reason || 'Rejected.' },
            ],
          }
        : r,
    )
    persist(updated)
    setSelectedRequest(updated.find((r) => r.id === req.id)!)
    setSnack({ msg: 'Request rejected.', severity: 'info' })
  }

  function handleCancel(req: LeaveRequest) {
    const now = new Date().toISOString()
    const actor = USERS.find((u) => u.id === currentUserId)?.name ?? 'User'
    const updated = requests.map((r) =>
      r.id === req.id
        ? {
            ...r,
            status: 'Cancelled' as const,
            updatedAt: now,
            auditTrail: [
              ...r.auditTrail,
              { timestamp: now, action: 'cancel' as const, actor, details: 'Cancelled by employee.' },
            ],
          }
        : r,
    )
    persist(updated)
    setSelectedRequest(updated.find((r) => r.id === req.id)!)
    setSnack({ msg: 'Request cancelled.', severity: 'info' })
  }

  function handleDelete(req: LeaveRequest) {
    const updated = requests.filter((r) => r.id !== req.id)
    persist(updated)
    setDrawerOpen(false)
    setSnack({ msg: 'Request deleted.', severity: 'info' })
  }

  async function handleImportCSV(file: File) {
    try {
      const result = await importFromCSV(file, requests)
      persist(result.requests)
      const msg =
        result.errors.length > 0
          ? `Import done. ${result.errors.length} row error(s). Check the downloaded error report.`
          : 'Import successful.'
      setSnack({ msg, severity: result.errors.length > 0 ? 'error' : 'success' })
    } catch (err) {
      setSnack({ msg: String((err as Error).message), severity: 'error' })
    }
  }

  async function handleExportPDF() {
    await exportToPDF(filteredRequests, filters, role)
  }

  const currentUser = USERS.find((u) => u.id === currentUserId)
  const currentBalance = calcBalance(currentUserId)
  const summary = useMemo(() => {
    const submitted = scopedRequests.filter((r) => r.status === 'Submitted').length
    const approved = scopedRequests.filter((r) => r.status === 'Approved').length
    const filteredDays = filteredRequests.reduce((sum, req) => sum + req.duration, 0)
    const remainingDays = currentBalance.reduce((sum, b) => sum + Math.max(b.remaining, 0), 0)
    return {
      visible: filteredRequests.length,
      submitted,
      approved,
      filteredDays,
      remainingDays,
    }
  }, [scopedRequests, filteredRequests, currentBalance])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', px: { xs: 1.25, md: 2.5 }, py: { xs: 1.5, md: 2.5 } }}>
        <Box sx={{ maxWidth: 1420, mx: 'auto', display: 'grid', gap: 1.5 }}>
          <Paper sx={{ p: { xs: 1.2, md: 1.8 } }}>
            <Toolbar
              role={role}
              onRoleChange={setRole}
              currentUserId={currentUserId}
              onUserChange={setCurrentUserId}
              search={search}
              onSearchChange={setSearch}
              groupByUser={groupByUser}
              onGroupByUserChange={setGroupByUser}
              onAddRequest={handleAddRequest}
              onExportCSV={() => exportToCSV(filteredRequests)}
              onImportCSV={handleImportCSV}
              onDownloadTemplate={downloadTemplate}
              onExportPDF={handleExportPDF}
              filteredCount={filteredRequests.length}
            />
          </Paper>

          <Box
            sx={{
              display: 'grid',
              gap: 1.2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' },
            }}
          >
            <SummaryCard
              icon={<SummarizeRoundedIcon fontSize="small" />}
              label="Visible Requests"
              value={summary.visible}
              hint={`${role} scope`}
              order={0}
            />
            <SummaryCard
              icon={<HourglassTopRoundedIcon fontSize="small" />}
              label="Pending Approval"
              value={summary.submitted}
              hint="Status: Submitted"
              accent="warning"
              order={1}
            />
            <SummaryCard
              icon={<CheckCircleRoundedIcon fontSize="small" />}
              label="Approved Requests"
              value={summary.approved}
              hint="Status: Approved"
              accent="success"
              order={2}
            />
            <SummaryCard
              icon={<EventAvailableRoundedIcon fontSize="small" />}
              label={`${currentUser?.name ?? 'Current user'} Remaining Days`}
              value={summary.remainingDays}
              hint={`${summary.filteredDays} business days in current view`}
              accent="secondary"
              order={3}
            />
          </Box>

          <Paper sx={{ p: { xs: 1.2, md: 1.6 } }}>
            <Filters filters={filters} onFiltersChange={setFilters} role={role} />
          </Paper>

          <Paper sx={{ overflow: 'hidden' }}>
            <Box
              sx={{
                px: 2,
                py: 1.4,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Box>
                <Typography variant="h6">Request Dashboard</Typography>
                <Typography variant="body2" color="text.secondary">
                  Review, sort, and manage leave workflows with full audit visibility.
                </Typography>
              </Box>
              <Chip size="small" color="primary" variant="outlined" label={`${filteredRequests.length} rows`} />
            </Box>
            <Box sx={{ maxHeight: 'calc(100vh - 370px)', minHeight: 360, overflow: 'auto', p: 1.25 }}>
              <RequestTable
                requests={filteredRequests}
                groupByUser={groupByUser}
                sortField={sortField}
                sortAsc={sortAsc}
                onSortChange={(field) => {
                  if (field === sortField) setSortAsc((v) => !v)
                  else {
                    setSortField(field)
                    setSortAsc(true)
                  }
                }}
                onRowClick={handleRowClick}
                selectedId={selectedRequest?.id}
              />
            </Box>
          </Paper>
        </Box>
      </Box>

      <DetailsDrawer
        open={drawerOpen}
        request={selectedRequest}
        editDraft={editDraft}
        validationErrors={validationErrors}
        role={role}
        currentUserId={currentUserId}
        balance={selectedRequest ? calcBalance(selectedRequest.userId) : calcBalance(currentUserId)}
        onClose={() => { setDrawerOpen(false); setEditDraft(null); setValidationErrors([]) }}
        onEdit={(req) => { setEditDraft({ ...req }); setValidationErrors([]) }}
        onDraftChange={setEditDraft}
        onSave={handleSaveDraft}
        onApprove={handleApprove}
        onReject={handleReject}
        onCancel={handleCancel}
        onDelete={handleDelete}
      />

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack?.severity} onClose={() => setSnack(null)} sx={{ width: '100%' }}>
          {snack?.msg}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  )
}

type CardAccent = 'primary' | 'secondary' | 'success' | 'warning'

function SummaryCard({
  icon,
  label,
  value,
  hint,
  accent = 'primary',
  order = 0,
}: {
  icon: ReactNode
  label: string
  value: number
  hint: string
  accent?: CardAccent
  order?: number
}) {
  const accentMap: Record<CardAccent, { bg: string; fg: string; border: string }> = {
    primary: { bg: alpha('#d4a843', 0.1), fg: '#d4a843', border: '#d4a843' },
    secondary: { bg: alpha('#47c4a4', 0.1), fg: '#47c4a4', border: '#47c4a4' },
    success: { bg: alpha('#3ba861', 0.1), fg: '#3ba861', border: '#3ba861' },
    warning: { bg: alpha('#c9921e', 0.12), fg: '#c9921e', border: '#c9921e' },
  }
  const tone = accentMap[accent]

  return (
    <Paper
      sx={{
        p: 1.6,
        borderLeft: '3px solid',
        borderLeftColor: tone.border,
        animation: 'fadeInUp 0.5s ease-out both',
        animationDelay: `${order * 0.09}s`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1,
            display: 'grid',
            placeItems: 'center',
            bgcolor: tone.bg,
            color: tone.fg,
          }}
        >
          {icon}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.72rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {label}
        </Typography>
      </Box>
      <Typography variant="h4" sx={{ fontSize: { xs: '2rem', md: '2.4rem' }, lineHeight: 1, color: tone.fg }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>
    </Paper>
  )
}

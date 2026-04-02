import { useMemo, useState, type ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { USERS, LEAVE_TYPES } from '../lib/constants'
import { calcBusinessDays } from '../lib/date'
import type { LeaveBalance, LeaveRequest, LeaveType, Role, ValidationError } from '../types'

const DRAWER_WIDTH = 460

interface Props {
  open: boolean
  request: LeaveRequest | null
  editDraft: Partial<LeaveRequest> | null
  validationErrors: ValidationError[]
  role: Role
  currentUserId: string
  balance: LeaveBalance[]
  onClose: () => void
  onEdit: (req: LeaveRequest) => void
  onDraftChange: (draft: Partial<LeaveRequest>) => void
  onSave: (draft: Partial<LeaveRequest>) => void
  onApprove: (req: LeaveRequest) => void
  onReject: (req: LeaveRequest, reason: string) => void
  onCancel: (req: LeaveRequest) => void
  onDelete: (req: LeaveRequest) => void
}

export function DetailsDrawer({
  open,
  request,
  editDraft,
  validationErrors,
  role,
  currentUserId,
  balance,
  onClose,
  onEdit,
  onDraftChange,
  onSave,
  onApprove,
  onReject,
  onCancel,
  onDelete,
}: Props) {
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function handleClose() {
    document.body.setAttribute('tabindex', '-1')
    document.body.focus()
    document.body.removeAttribute('tabindex')
    onClose()
  }

  const isNew = !request && editDraft !== null
  const isEditing = editDraft !== null
  const currentUserName = USERS.find((u) => u.id === currentUserId)?.name ?? 'Current User'

  const headerText = useMemo(() => {
    if (isNew) return 'Create New Leave Request'
    if (isEditing) return 'Edit Leave Request'
    return 'Request Details'
  }, [isNew, isEditing])

  function set(partial: Partial<LeaveRequest>) {
    onDraftChange({ ...editDraft, ...partial })
  }

  function draftDuration(): number {
    if (!editDraft?.startDate || !editDraft.endDate) return 0
    return calcBusinessDays(editDraft.startDate, editDraft.endDate)
  }

  function handleRejectConfirm() {
    if (request) onReject(request, rejectReason)
    setShowRejectInput(false)
    setRejectReason('')
  }

  const canEdit = request?.status === 'Submitted' && (role === 'Manager' || request.userId === currentUserId)
  const canCancel = request?.status === 'Submitted' && request.userId === currentUserId
  const canApproveReject = role === 'Manager' && request?.status === 'Submitted'
  const canDelete = role === 'Manager'

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      disableEnforceFocus
      disableRestoreFocus
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: DRAWER_WIDTH },
          p: 0,
          bgcolor: '#0c0f14',
        },
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          color: 'text.primary',
          bgcolor: '#131920',
          borderBottom: '2px solid',
          borderColor: 'primary.main',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">{headerText}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {request ? `Request #${request.id.slice(0, 8)}` : `Prepared by ${currentUserName}`}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} sx={{ color: 'text.secondary' }} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ p: 1.5, overflowY: 'auto', flex: 1, display: 'grid', gap: 1.25 }}>
        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ '& ul': { m: 0, pl: 2.2 } }}>
            <ul>
              {validationErrors.map((err, i) => (
                <li key={i}>{err.message}</li>
              ))}
            </ul>
          </Alert>
        )}

        {isEditing ? (
          <Panel title="Request Form">
            <Stack spacing={1.35}>
              {isNew && (
                <TextField
                  select
                  label="Employee"
                  size="small"
                  value={editDraft?.userId ?? ''}
                  onChange={(e) => set({ userId: e.target.value })}
                  fullWidth
                >
                  {USERS.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              <TextField
                select
                label="Leave Type"
                size="small"
                value={editDraft?.leaveType ?? ''}
                onChange={(e) => set({ leaveType: e.target.value as LeaveType })}
                fullWidth
              >
                {LEAVE_TYPES.map((leaveType) => {
                  const bucket = balance.find((item) => item.leaveType === leaveType)
                  const caption = bucket ? `${bucket.remaining} / ${bucket.quota} days available` : ''
                  return (
                    <MenuItem key={leaveType} value={leaveType}>
                      {leaveType} {caption ? `(${caption})` : ''}
                    </MenuItem>
                  )
                })}
              </TextField>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <TextField
                  label="Start Date"
                  type="date"
                  size="small"
                  value={editDraft?.startDate ?? ''}
                  onChange={(e) => set({ startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="End Date"
                  type="date"
                  size="small"
                  value={editDraft?.endDate ?? ''}
                  onChange={(e) => set({ endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>

              <Chip
                label={`Calculated duration: ${draftDuration()} business day(s)`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ width: 'fit-content' }}
              />

              <TextField
                label="Reason"
                size="small"
                multiline
                rows={3}
                value={editDraft?.reason ?? ''}
                onChange={(e) => set({ reason: e.target.value })}
                fullWidth
              />

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={() => onSave(editDraft!)} fullWidth>
                  {isNew ? 'Submit Request' : 'Save Changes'}
                </Button>
                <Button variant="outlined" onClick={handleClose} fullWidth>
                  Cancel
                </Button>
              </Box>
            </Stack>
          </Panel>
        ) : request ? (
          <>
            <Panel title="Overview">
              <Stack spacing={1.2}>
                <DetailRow label="Request ID" value={request.id} mono />
                <DetailRow label="Employee" value={USERS.find((u) => u.id === request.userId)?.name ?? request.userId} />
                <DetailRow label="Leave Type" value={request.leaveType} />
                <DetailRow label="Period" value={`${request.startDate} to ${request.endDate}`} />
                <DetailRow label="Duration" value={`${request.duration} business day(s)`} />
                <DetailRow
                  label="Status"
                  value={
                    <Chip
                      label={request.status}
                      size="small"
                      color={
                        request.status === 'Approved'
                          ? 'success'
                          : request.status === 'Rejected'
                            ? 'error'
                            : request.status === 'Cancelled'
                              ? 'default'
                              : 'warning'
                      }
                    />
                  }
                />
                <DetailRow label="Reason" value={request.reason} />
                <DetailRow label="Created At" value={new Date(request.createdAt).toLocaleString()} />
                <DetailRow label="Updated At" value={new Date(request.updatedAt).toLocaleString()} />
              </Stack>
            </Panel>

            <Panel title="Leave Balance">
              <Stack spacing={1}>
                {balance.map((item) => (
                  <Box key={item.leaveType}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.35 }}>
                      <Typography variant="caption">{item.leaveType}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.used} used / {item.quota} total ({item.remaining} left)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((item.used / item.quota) * 100, 100)}
                      color={item.remaining <= 0 ? 'error' : item.remaining <= 2 ? 'warning' : 'primary'}
                      sx={{ height: 7, borderRadius: 999 }}
                    />
                  </Box>
                ))}
              </Stack>
            </Panel>

            <Panel title="Actions">
              <Stack spacing={1}>
                {canEdit && (
                  <Button variant="outlined" startIcon={<EditIcon />} onClick={() => onEdit(request)} fullWidth>
                    Edit Request
                  </Button>
                )}

                {canApproveReject && !showRejectInput && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => onApprove(request)}
                      fullWidth
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => setShowRejectInput(true)}
                      fullWidth
                    >
                      Reject
                    </Button>
                  </Box>
                )}

                {showRejectInput && (
                  <Stack spacing={1}>
                    <TextField
                      label="Rejection Reason"
                      size="small"
                      multiline
                      rows={2}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      fullWidth
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button variant="contained" color="error" onClick={handleRejectConfirm} fullWidth>
                        Confirm Reject
                      </Button>
                      <Button variant="outlined" onClick={() => setShowRejectInput(false)} fullWidth>
                        Back
                      </Button>
                    </Box>
                  </Stack>
                )}

                {canCancel && (
                  <Button variant="outlined" color="warning" onClick={() => onCancel(request)} fullWidth>
                    Cancel Request
                  </Button>
                )}

                {canDelete && !showDeleteConfirm && (
                  <Tooltip title="Delete this request permanently">
                    <Button
                      variant="text"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => setShowDeleteConfirm(true)}
                      size="small"
                      fullWidth
                    >
                      Delete Request
                    </Button>
                  </Tooltip>
                )}

                {showDeleteConfirm && (
                  <Box sx={{ p: 1.1, border: '1px dashed', borderColor: 'error.light', borderRadius: 1.2 }}>
                    <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                      This action is permanent. Delete this request?
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button variant="contained" color="error" onClick={() => onDelete(request)} fullWidth>
                        Delete
                      </Button>
                      <Button variant="outlined" onClick={() => setShowDeleteConfirm(false)} fullWidth>
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                )}
              </Stack>
            </Panel>

            <Panel title="Audit Trail">
              <Stack spacing={1}>
                {[...request.auditTrail].reverse().map((evt, i) => (
                  <Box
                    key={i}
                    sx={{
                      px: 1.35,
                      py: 1,
                      bgcolor: alpha('#d4a843', 0.05),
                      borderRadius: 1,
                      borderLeft: '3px solid',
                      borderColor: 'primary.main',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {new Date(evt.timestamp).toLocaleString()} - {evt.actor}
                    </Typography>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>
                      {evt.action}
                    </Typography>
                    {evt.details && (
                      <Typography variant="caption" color="text.secondary">
                        {evt.details}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            </Panel>
          </>
        ) : null}
      </Box>
    </Drawer>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ p: 1.35, bgcolor: '#131920', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 1.2 }} />
      {children}
    </Box>
  )
}

interface DetailRowProps {
  label: string
  value: ReactNode
  mono?: boolean
}

function DetailRow({ label, value, mono }: DetailRowProps) {
  return (
    <Box sx={{ display: 'flex', gap: 1.15 }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 96, fontWeight: 600, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography component="div" variant="body2" sx={{ fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  )
}

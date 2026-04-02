import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
  Typography,
  type SelectChangeEvent,
} from '@mui/material'
import { USERS, ALL_STATUSES } from '../lib/constants'
import type { FilterState, LeaveStatus, Role } from '../types'

interface Props {
  filters: FilterState
  onFiltersChange: (f: FilterState) => void
  role: Role
}

export function Filters({ filters, onFiltersChange, role }: Props) {
  function set(partial: Partial<FilterState>) {
    onFiltersChange({ ...filters, ...partial })
  }

  function handleStatusChange(e: SelectChangeEvent<LeaveStatus[]>) {
    const val = e.target.value
    set({ status: typeof val === 'string' ? (val.split(',') as LeaveStatus[]) : val })
  }

  const activeFilters: string[] = []
  if (role === 'Manager' && filters.userId) {
    activeFilters.push(`User: ${USERS.find((u) => u.id === filters.userId)?.name ?? filters.userId}`)
  }
  if (filters.startDate) activeFilters.push(`From: ${filters.startDate}`)
  if (filters.endDate) activeFilters.push(`To: ${filters.endDate}`)
  if (filters.status.length > 0) activeFilters.push(`Status: ${filters.status.join(', ')}`)

  const hasActiveFilters = activeFilters.length > 0

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Filters
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Narrow requests by employee, date range, and workflow status.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: role === 'Manager' ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)' },
        }}
      >
        {role === 'Manager' && (
          <TextField
            select
            size="small"
            label="Employee"
            value={filters.userId}
            onChange={(e) => set({ userId: e.target.value })}
            SelectProps={{ native: true }}
          >
            <option value="">All employees</option>
            {USERS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </TextField>
        )}

        <TextField
          size="small"
          label="From Date"
          type="date"
          value={filters.startDate}
          onChange={(e) => set({ startDate: e.target.value })}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          size="small"
          label="To Date"
          type="date"
          value={filters.endDate}
          onChange={(e) => set({ endDate: e.target.value })}
          InputLabelProps={{ shrink: true }}
        />

        <FormControl size="small">
          <InputLabel>Status</InputLabel>
          <Select
            multiple
            value={filters.status}
            onChange={handleStatusChange}
            input={<OutlinedInput label="Status" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {(selected as LeaveStatus[]).map((status) => (
                  <Chip key={status} label={status} size="small" />
                ))}
              </Box>
            )}
          >
            {ALL_STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box
        sx={{
          minHeight: 36,
          p: hasActiveFilters ? 1 : 0,
          border: hasActiveFilters ? '1px dashed' : 'none',
          borderColor: hasActiveFilters ? 'divider' : 'transparent',
          borderRadius: 1.25,
          display: 'flex',
          gap: 0.75,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {hasActiveFilters ? (
          <>
            {activeFilters.map((item) => (
              <Chip key={item} label={item} size="small" color="primary" variant="outlined" />
            ))}
            <Button
              size="small"
              color="inherit"
              variant="text"
              onClick={() => onFiltersChange({ userId: '', startDate: '', endDate: '', status: [] })}
            >
              Clear all
            </Button>
          </>
        ) : (
          <Typography variant="caption" color="text.secondary">
            No active filters.
          </Typography>
        )}
      </Box>
    </Box>
  )
}

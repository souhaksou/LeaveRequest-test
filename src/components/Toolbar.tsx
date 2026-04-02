import { useRef } from 'react'
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import TableViewIcon from '@mui/icons-material/TableView'
import GroupWorkIcon from '@mui/icons-material/GroupWork'
import { USERS } from '../lib/constants'
import type { Role } from '../types'

interface Props {
  role: Role
  onRoleChange: (role: Role) => void
  currentUserId: string
  onUserChange: (id: string) => void
  search: string
  onSearchChange: (v: string) => void
  groupByUser: boolean
  onGroupByUserChange: (v: boolean) => void
  onAddRequest: () => void
  onExportCSV: () => void
  onImportCSV: (file: File) => void
  onDownloadTemplate: () => void
  onExportPDF: () => void
  filteredCount: number
}

export function Toolbar({
  role,
  onRoleChange,
  currentUserId,
  onUserChange,
  search,
  onSearchChange,
  groupByUser,
  onGroupByUserChange,
  onAddRequest,
  onExportCSV,
  onImportCSV,
  onDownloadTemplate,
  onExportPDF,
  filteredCount,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onImportCSV(file)
    e.target.value = ''
  }

  return (
    <Stack spacing={1.3}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', lg: 'center' },
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 0.75,
        }}
      >
        <Box>
          <Typography variant="h6">Leave Management Center</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage approvals, balances, and employee requests from one operational workspace.
          </Typography>
        </Box>
        <Chip
          label={`${filteredCount} matching records`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ alignSelf: { xs: 'flex-start', lg: 'center' } }}
        />
      </Box>

      <Divider />

      <Box
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: '1.2fr 1fr 1.05fr' },
          alignItems: 'start',
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <ToggleButtonGroup
            value={role}
            exclusive
            size="small"
            onChange={(_, v) => {
              if (v) onRoleChange(v as Role)
            }}
          >
            <ToggleButton value="Employee">Employee</ToggleButton>
            <ToggleButton value="Manager">Manager</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            select
            size="small"
            label="Signed in as"
            value={currentUserId}
            onChange={(e) => onUserChange(e.target.value)}
            SelectProps={{ native: true }}
          >
            {USERS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </TextField>
        </Box>

        <TextField
          size="small"
          placeholder="Search by request ID, employee, status, reason..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          fullWidth
        />

        <Box
          sx={{
            display: 'flex',
            gap: 0.75,
            justifyContent: { xs: 'flex-start', xl: 'flex-end' },
            flexWrap: 'wrap',
          }}
        >
          <Tooltip title={groupByUser ? 'Disable grouped view' : 'Group rows by employee'}>
            <IconButton
              onClick={() => onGroupByUserChange(!groupByUser)}
              color={groupByUser ? 'primary' : 'default'}
              size="small"
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <GroupWorkIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAddRequest} size="small">
            New Request
          </Button>
          <Tooltip title="Export current result set to CSV">
            <IconButton size="small" onClick={onExportCSV} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <FileDownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download CSV import template">
            <IconButton size="small" onClick={onDownloadTemplate} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <TableViewIcon />
            </IconButton>
          </Tooltip>
          {role === 'Manager' && (
            <Tooltip title="Import CSV file">
              <IconButton size="small" onClick={() => fileRef.current?.click()} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <FileUploadIcon />
              </IconButton>
            </Tooltip>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <Tooltip title="Export current result set to PDF">
            <IconButton size="small" onClick={onExportPDF} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <PictureAsPdfIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Stack>
  )
}

import { useState } from 'react';
import { Chip, Menu, MenuItem } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { APPLICATION_STATUSES, type ApplicationStatus } from '@career-intelligence/shared';
import { useLocale } from '../../i18n';

const STATUS_COLORS: Record<ApplicationStatus, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
  not_started: 'default',
  in_progress: 'info',
  ready_for_review: 'warning',
  ready_to_send: 'secondary',
  sent: 'primary',
  interview: 'success',
  rejected: 'error',
  offer: 'success',
  hired: 'success',
};

interface Props {
  status: ApplicationStatus;
  onChange?: (status: ApplicationStatus) => void;
}

export default function StatusBadge({ status, onChange }: Props) {
  const { t } = useLocale();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const selectable = !!onChange;

  return (
    <>
      <Chip
        label={t(`status.${status}`)}
        color={STATUS_COLORS[status]}
        size="small"
        onClick={selectable ? (e) => setAnchorEl(e.currentTarget) : undefined}
        onDelete={selectable ? (e) => setAnchorEl(e.currentTarget) : undefined}
        deleteIcon={selectable ? <ArrowDropDownIcon /> : undefined}
        sx={{ fontWeight: 500, cursor: selectable ? 'pointer' : undefined }}
      />
      {selectable && (
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          {APPLICATION_STATUSES.map((s) => (
            <MenuItem
              key={s}
              selected={s === status}
              onClick={() => {
                setAnchorEl(null);
                if (s !== status) onChange(s);
              }}
            >
              {t(`status.${s}`)}
            </MenuItem>
          ))}
        </Menu>
      )}
    </>
  );
}

import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../i18n';

interface Props {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}

export default function MoreMenu({ anchorEl, open, onClose }: Props) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useLocale();

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  const onLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <MenuItem onClick={() => go('/companies')}>
        <ListItemIcon><BusinessIcon fontSize="small" /></ListItemIcon>
        <ListItemText>{t('nav.companies')}</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => go('/statistics')}>
        <ListItemIcon><BarChartIcon fontSize="small" /></ListItemIcon>
        <ListItemText>{t('nav.statistics')}</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => go('/settings')}>
        <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
        <ListItemText>{t('nav.settings')}</ListItemText>
      </MenuItem>
      {user?.platformRole === 'admin' && (
        <MenuItem onClick={() => go('/platform/users')}>
          <ListItemIcon><GroupIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{t('nav.users')}</ListItemText>
        </MenuItem>
      )}
      <MenuItem onClick={() => void onLogout()}>
        <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
        <ListItemText>{t('nav.logout')}</ListItemText>
      </MenuItem>
    </Menu>
  );
}

import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function MoreMenu({ open, onClose }: Props) {
  const navigate = useNavigate();

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <Menu anchorReference="anchorPosition" anchorPosition={{ top: window.innerHeight - 120, left: window.innerWidth / 2 }} open={open} onClose={onClose}>
      <MenuItem onClick={() => go('/companies')}>
        <ListItemIcon><BusinessIcon fontSize="small" /></ListItemIcon>
        <ListItemText>Virksomheder</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => go('/statistics')}>
        <ListItemIcon><BarChartIcon fontSize="small" /></ListItemIcon>
        <ListItemText>Statistik</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => go('/settings')}>
        <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
        <ListItemText>Indstillinger</ListItemText>
      </MenuItem>
    </Menu>
  );
}

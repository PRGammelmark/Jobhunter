import { IconButton } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useLocale } from '../../i18n';

interface Props {
  isWishlisted: boolean;
  onToggle?: (isWishlisted: boolean) => void;
  size?: 'small' | 'medium';
}

export default function WishlistButton({ isWishlisted, onToggle, size = 'small' }: Props) {
  const { t } = useLocale();
  const interactive = !!onToggle;

  return (
    <IconButton
      size={size}
      aria-label={isWishlisted ? t('wishlist.remove') : t('wishlist.add')}
      aria-pressed={isWishlisted}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle?.(!isWishlisted);
      }}
      disabled={!interactive}
      sx={{
        color: isWishlisted ? 'secondary.main' : 'action.active',
        '&.Mui-disabled': {
          color: isWishlisted ? 'secondary.main' : 'action.disabled',
        },
      }}
    >
      {isWishlisted ? <FavoriteIcon fontSize={size} /> : <FavoriteBorderIcon fontSize={size} />}
    </IconButton>
  );
}

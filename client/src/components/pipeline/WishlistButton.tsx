import { IconButton } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';

interface Props {
  isWishlisted: boolean;
  onToggle?: (isWishlisted: boolean) => void;
  size?: 'small' | 'medium';
}

export default function WishlistButton({ isWishlisted, onToggle, size = 'small' }: Props) {
  const interactive = !!onToggle;

  return (
    <IconButton
      size={size}
      aria-label={isWishlisted ? 'Fjern fra ønskeliste' : 'Tilføj til ønskeliste'}
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

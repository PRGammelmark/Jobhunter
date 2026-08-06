import { Star } from 'lucide-react';
import { useLocale } from '../../i18n';
import { IconButton, cn } from '../../ui';

interface Props {
  isWishlisted: boolean;
  onToggle?: (isWishlisted: boolean) => void;
  size?: 'small' | 'medium';
}

export default function WishlistButton({ isWishlisted, onToggle, size = 'small' }: Props) {
  const { t } = useLocale();
  const interactive = !!onToggle;
  const iconSize = size === 'small' ? 18 : 20;

  return (
    <IconButton
      label={isWishlisted ? t('wishlist.remove') : t('wishlist.add')}
      aria-pressed={isWishlisted}
      disabled={!interactive}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle?.(!isWishlisted);
      }}
      className={cn(isWishlisted ? 'text-brand' : 'text-ink-muted')}
    >
      <Star
        size={iconSize}
        strokeWidth={1.75}
        fill={isWishlisted ? 'currentColor' : 'none'}
      />
    </IconButton>
  );
}

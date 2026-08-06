import { cn } from './cn';

export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[16px] bg-gradient-to-r from-line via-canvas to-line bg-[length:200%_100%]',
        className
      )}
    />
  );
}

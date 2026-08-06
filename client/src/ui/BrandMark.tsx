import { Send } from 'lucide-react';
import { cn } from './cn';

export default function BrandMark({
  withText = true,
  className,
}: {
  withText?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-brand text-white shadow-[0_6px_14px_rgb(255_87_34_/_0.28)]">
        <Send size={18} strokeWidth={2.25} className="-ml-0.5 mt-0.5" />
      </span>
      {withText && (
        <span className="text-[17px] font-bold tracking-tight text-ink">ApplyPilot</span>
      )}
    </div>
  );
}

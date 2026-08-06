import type { ReactNode } from 'react';

export default function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="app-card px-5 py-10 text-center text-sm text-ink-secondary">
      {children}
    </div>
  );
}

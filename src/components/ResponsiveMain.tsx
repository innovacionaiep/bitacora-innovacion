'use client';

import { cn } from '@/lib/utils';

interface ResponsiveMainProps {
  children: React.ReactNode;
  className?: string;
}

export default function ResponsiveMain({
  children,
  className,
}: ResponsiveMainProps) {
  return (
    <main
      className={cn(
        'relative flex w-full flex-1 flex-col bg-background h-full overflow-hidden',
        className
      )}
    >
      {children}
    </main>
  );
}

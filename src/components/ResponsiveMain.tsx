'use client';

import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface ResponsiveMainProps {
  children: React.ReactNode;
  className?: string;
}

export default function ResponsiveMain({
  children,
  className,
}: ResponsiveMainProps) {
  const { state } = useSidebar();

  return (
    <main
      className={cn(
        'relative flex w-full flex-1 flex-col bg-background',
        state === 'collapsed' ? 'ml-16' : 'ml-46',
        className
      )}
    >
      {children}
    </main>
  );
}

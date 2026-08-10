'use client';

import { QueryProvider } from '@/components/providers/QueryProvider';
import { ConditionalLayout } from '@/components/ConditionalLayout';
import { DesktopScaleCompensate } from '@/components/DesktopScaleCompensate';

/** Shell for authenticated routes — dynamically loaded so /auth stays light. */
export function AuthenticatedShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <DesktopScaleCompensate>
        <ConditionalLayout>{children}</ConditionalLayout>
      </DesktopScaleCompensate>
    </QueryProvider>
  );
}

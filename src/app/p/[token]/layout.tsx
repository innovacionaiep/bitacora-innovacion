import { QueryProvider } from '@/components/providers/QueryProvider';
import { DesktopScaleCompensate } from '@/components/DesktopScaleCompensate';

export default function PublicProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <DesktopScaleCompensate>
        <div className="h-full min-h-0 overflow-hidden bg-white">{children}</div>
      </DesktopScaleCompensate>
    </QueryProvider>
  );
}

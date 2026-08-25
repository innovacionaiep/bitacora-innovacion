import { DesktopScaleCompensate } from '@/components/DesktopScaleCompensate';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bitácora',
  description:
    'Portal de proyectos de la Dirección Nacional de Emprendimiento e I+D.',
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DesktopScaleCompensate baseScale={1}>
      <div className="h-full min-h-0 overflow-x-hidden overflow-y-auto bg-white [container-type:size]">
        {children}
      </div>
    </DesktopScaleCompensate>
  );
}

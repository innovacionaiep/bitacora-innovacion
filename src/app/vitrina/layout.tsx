import { DesktopScaleCompensate } from '@/components/DesktopScaleCompensate';

export default function VitrinaLayout({
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

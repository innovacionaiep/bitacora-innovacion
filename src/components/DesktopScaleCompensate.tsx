'use client';

import { useLayoutEffect, useState } from 'react';
import { ScalePortalProvider } from '@/contexts/ScalePortalContext';

interface DesktopScaleCompensateProps {
  children: React.ReactNode;
}

/**
 * Compensa el escalado del escritorio (125%, 150%, etc.) para que la app
 * se vea con el mismo tamaño físico que a 100%. Usa zoom = 1/devicePixelRatio
 * cuando DPR > 1.
 * Proporciona el contenedor escalado al contexto para que dropdowns/sheets
 * se rendericen dentro y hereden la escala.
 */
export function DesktopScaleCompensate({ children }: DesktopScaleCompensateProps) {
  const [dpr, setDpr] = useState(1);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const ratio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    setDpr(ratio > 1 ? ratio : 1);
  }, []);

  const scale = dpr > 1 ? 1 / dpr : 1;
  const sizePercent = dpr > 1 ? 100 * dpr : 100;

  return (
    <ScalePortalProvider container={portalContainer}>
      <div
        className="fixed inset-0 overflow-hidden"
        style={{ height: '100vh' }}
      >
        <div
          ref={(el) => setPortalContainer(el)}
          className="bg-background text-foreground h-full w-full overflow-hidden"
          style={{
            width: `${sizePercent}%`,
            height: `${sizePercent}%`,
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          {children}
        </div>
      </div>
    </ScalePortalProvider>
  );
}

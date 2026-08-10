'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { FondoGestionView } from './tabs/FondoGestionView';

export type FondoTabItem = {
  id: string;
  nombre: string;
  orden: number;
  conveniosEnabled: boolean;
  projectCount: number;
};

type FondosPageProps = {
  initialFondos: FondoTabItem[];
};

export default function FondosPage({ initialFondos }: FondosPageProps) {
  const [fondos] = useState(initialFondos);
  const [currentFondoId, setCurrentFondoId] = useState<string | null>(
    initialFondos[0]?.id ?? null
  );

  const current = fondos.find((f) => f.id === currentFondoId) ?? fondos[0];

  if (fondos.length === 0) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center pt-6 pb-6">
        <div className="text-center max-w-md px-4">
          <p className="text-[13px] text-gray-700 font-medium mb-1">
            No hay fondos configurados
          </p>
          <p className="text-[13px] text-gray-500">
            Agrega fondos en Ajustes → Validación para gestionarlos desde este
            panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden pb-4">
      {/* Misma posición que tabs de proyecto: arriba, centrado */}
      <nav
        aria-label="Fondos"
        className="flex-shrink-0 mb-5 overflow-x-auto"
      >
        <div className="flex items-stretch justify-center gap-1 sm:gap-2 min-w-max mx-auto px-2">
          {fondos.map((fondo) => {
            const active = current?.id === fondo.id;
            return (
              <button
                key={fondo.id}
                type="button"
                onClick={() => setCurrentFondoId(fondo.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative px-3 py-2 text-[13px] tracking-wide whitespace-nowrap rounded-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1',
                  active
                    ? 'font-medium text-gray-900'
                    : 'font-normal text-gray-500 hover:text-gray-800'
                )}
              >
                {fondo.nombre}
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-x-2.5 bottom-0 h-0.5 rounded-full transition-colors',
                    active
                      ? 'bg-emerald-600'
                      : 'bg-transparent group-hover:bg-gray-300'
                  )}
                />
              </button>
            );
          })}
        </div>
      </nav>

      <div className="min-h-0 flex-1 overflow-hidden">
        {current ? (
          <FondoGestionView
            fondoNombre={current.nombre}
            conveniosEnabled={current.conveniosEnabled}
          />
        ) : null}
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import { Wrench } from 'lucide-react';
import {
  MAINTENANCE_MESSAGE,
  MAINTENANCE_TITLE,
} from '@/lib/maintenance';

export const metadata: Metadata = {
  title: 'Mantenimiento | Bitácora',
  description: MAINTENANCE_MESSAGE,
  robots: { index: false, follow: false },
};

export default function MantenimientoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-16">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
        <p className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Bitácora
        </p>

        <div className="mt-10 flex h-14 w-14 items-center justify-center rounded-full border border-amber-200 bg-amber-50">
          <Wrench
            className="h-6 w-6 text-amber-700"
            strokeWidth={1.75}
            aria-hidden
          />
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-gray-900">
          {MAINTENANCE_TITLE}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-gray-600">
          {MAINTENANCE_MESSAGE}
        </p>
        <p className="mt-8 text-sm text-gray-400">
          No es necesario que intentes ingresar de nuevo por ahora.
        </p>
      </div>
    </div>
  );
}

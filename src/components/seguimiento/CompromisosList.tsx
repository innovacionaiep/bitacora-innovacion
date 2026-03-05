'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { toggleCompromiso } from '@/lib/actions/seguimiento';
import { Loader2 } from 'lucide-react';

export interface CompromisoItem {
  id: string;
  descripcion: string;
  completado: boolean;
}

interface CompromisosListProps {
  compromisos: CompromisoItem[];
  onToggle?: () => void | Promise<void>;
}

export function CompromisosList({
  compromisos,
  onToggle,
}: CompromisosListProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggle = async (compromisoId: string) => {
    setTogglingId(compromisoId);
    try {
      const result = await toggleCompromiso(compromisoId);
      if (result.success && onToggle) {
        await onToggle();
      }
    } finally {
      setTogglingId(null);
    }
  };

  if (compromisos.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4">
        No hay compromisos pendientes
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {compromisos.map((compromiso) => (
        <li
          key={compromiso.id}
          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
            compromiso.completado ? 'bg-gray-50 opacity-75' : 'bg-white'
          }`}
        >
          <div className="pt-0.5">
            {togglingId === compromiso.id ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : (
              <Checkbox
                checked={compromiso.completado}
                onCheckedChange={() => handleToggle(compromiso.id)}
                disabled={togglingId !== null}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm ${
                compromiso.completado
                  ? 'line-through text-gray-500'
                  : 'text-gray-900'
              }`}
            >
              {compromiso.descripcion}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

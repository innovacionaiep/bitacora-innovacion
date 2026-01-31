'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { toggleCompromiso } from '@/lib/actions/seguimiento';
import { Calendar, Loader2 } from 'lucide-react';

export interface CompromisoItem {
  id: string;
  descripcion: string;
  fechaLimite: Date | string | null;
  completado: boolean;
  reunion?: {
    id: string;
    fecha: Date | string;
    coordinador?: { name: string | null };
  };
}

interface CompromisosListProps {
  compromisos: CompromisoItem[];
  onToggle?: () => void | Promise<void>;
  showReunionInfo?: boolean;
}

export function CompromisosList({
  compromisos,
  onToggle,
  showReunionInfo = false,
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

  const formatFecha = (fecha: Date | string | null) => {
    if (!fecha) return null;
    const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return d.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (compromisos.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4">No hay compromisos pendientes</p>
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
                compromiso.completado ? 'line-through text-gray-500' : 'text-gray-900'
              }`}
            >
              {compromiso.descripcion}
            </p>
            {(compromiso.fechaLimite || showReunionInfo) && (
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                {compromiso.fechaLimite && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    vence {formatFecha(compromiso.fechaLimite)}
                  </span>
                )}
                {showReunionInfo && compromiso.reunion?.coordinador?.name && (
                  <span>· {compromiso.reunion.coordinador.name}</span>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

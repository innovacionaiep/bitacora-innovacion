'use client';

import { Target, Plus } from 'lucide-react';
import { ObjetivoEspecificoCard } from './ObjetivoEspecificoCard';
import type { ObjetivoGeneralData } from '@/lib/actions/indicadores';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

/** Ancho fijo de la tarjeta Objetivo General */
const OBJETIVO_GENERAL_WIDTH_PX = 1000;

interface ObjetivoGeneralCardProps {
  objetivoGeneral: ObjetivoGeneralData;
  progresoGeneral: number;
  onIndicadorClick: (indicador: {
    id: string;
    nombre: string;
    descripcion: string;
    formaCalculo: string;
    resultadoEsperado: string;
    resultadoAlcanzado: string;
    formatoNumero?: string | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
  }) => void;
  /** Botones o acciones a la derecha del objetivo general (ej. Eliminar indicador) */
  actions?: ReactNode;
  /** Si está activo el modo eliminar, se muestra botón papelera en cada indicador */
  deleteMode?: boolean;
  onDeleteIndicador?: (indicadorId: string) => Promise<void>;
  /** Callback para agregar un objetivo específico (cuando no hay ninguno) */
  onAddObjetivoEspecifico?: (descripcion: string) => Promise<void>;
  onAddIndicador?: (objetivoEspecificoId: string) => void;
  onCargaMasiva?: () => void;
  canImport?: boolean;
}

export function ObjetivoGeneralCard({
  objetivoGeneral,
  progresoGeneral,
  onIndicadorClick,
  actions,
  deleteMode,
  onDeleteIndicador,
  onAddObjetivoEspecifico,
  onAddIndicador,
  onCargaMasiva,
  canImport,
}: ObjetivoGeneralCardProps) {
  const [nuevoObjetivoTexto, setNuevoObjetivoTexto] = useState('');
  const [addingObjetivo, setAddingObjetivo] = useState(false);

  const handleAddObjetivo = async () => {
    const text = nuevoObjetivoTexto?.trim();
    if (!text || !onAddObjetivoEspecifico) return;
    setAddingObjetivo(true);
    try {
      await onAddObjetivoEspecifico(text);
      setNuevoObjetivoTexto('');
    } finally {
      setAddingObjetivo(false);
    }
  };

  const objetivoGeneralHeader = (
    <div className="relative z-20 flex shrink-0 items-center gap-3">
      <div
        className="relative flex-shrink-0"
        style={{ width: `${OBJETIVO_GENERAL_WIDTH_PX}px` }}
      >
        <div className="relative flex w-full items-center justify-center rounded-xl border-2 border-emerald-600/15 bg-gradient-to-r from-emerald-100 via-emerald-50 to-white p-6 text-emerald-900 shadow-xl bg-[linear-gradient(to_right,transparent_0%,rgba(16,185,129,0.05)_50%,transparent_100%),linear-gradient(45deg,transparent_25%,rgba(16,185,129,0.02)_25%,rgba(16,185,129,0.02)_50%,transparent_50%,transparent_75%,rgba(16,185,129,0.02)_75%,rgba(16,185,129,0.02)_100%)] bg-[length:100%_100%,20px_20px]">
          <div className="absolute left-3 top-3 flex items-center space-x-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm">
            <Target className="h-3.5 w-3.5" />
            <span>Objetivo General</span>
          </div>

          <div className="absolute right-3 top-3 flex items-center space-x-2">
            <span className="text-xs font-semibold text-gray-700">Progreso</span>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-96 rounded-full bg-gray-200 shadow-inner">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-sm transition-all duration-300"
                  style={{ width: `${progresoGeneral}%` }}
                />
              </div>
              <span className="text-xl font-bold text-emerald-600">
                {progresoGeneral}%
              </span>
            </div>
          </div>

          <div className="mt-8 flex w-full items-center pl-2 pr-2">
            <h3 className="min-w-0 flex-1 text-[16px] font-bold leading-tight text-emerald-900">
              {objetivoGeneral.descripcion}
            </h3>
          </div>
        </div>
      </div>
      {actions != null && (
        <div className="flex flex-shrink-0 flex-col gap-2">{actions}</div>
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {objetivoGeneralHeader}

      {objetivoGeneral.objetivosEspecificos.length > 0 ? (
        <div className="custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div
            className="relative isolate flex min-w-max flex-col gap-16 pb-6 pt-16"
            style={{ marginLeft: '80px' }}
          >
            <div className="pointer-events-none absolute bottom-0 left-[28px] top-0 z-0 w-0.5 bg-gray-300" />
            {objetivoGeneral.objetivosEspecificos.map(
              (objetivoEspecifico, index) => (
                <div key={objetivoEspecifico.id} className="relative z-10">
                  <ObjetivoEspecificoCard
                    objetivoEspecifico={objetivoEspecifico}
                    numero={index + 1}
                    onIndicadorClick={onIndicadorClick}
                    deleteMode={deleteMode}
                    onDeleteIndicador={onDeleteIndicador}
                    onAddIndicador={
                      onAddIndicador
                        ? () => onAddIndicador(objetivoEspecifico.id)
                        : undefined
                    }
                    onCargaMasiva={onCargaMasiva}
                    canImport={canImport}
                  />
                </div>
              )
            )}
          </div>
        </div>
      ) : (
        <div className="custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div
            className="relative flex flex-col gap-16 pb-6 pt-16"
            style={{ marginLeft: '80px' }}
          >
            <div className="pointer-events-none absolute bottom-0 left-[28px] top-0 z-0 w-0.5 bg-gray-300" />
            <div className="relative z-10 flex items-stretch gap-6">
              <div
                className="relative w-[560px] flex-shrink-0 rounded-xl bg-white"
                style={{ minHeight: '110px' }}
              >
                <div className="relative flex h-full flex-col justify-center gap-3 rounded-xl border-2 border-gray-200 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-100 px-6 py-4 text-gray-900 shadow-md bg-[linear-gradient(to_right,transparent_0%,rgba(107,114,128,0.05)_50%,transparent_100%),linear-gradient(45deg,transparent_25%,rgba(107,114,128,0.02)_25%,rgba(107,114,128,0.02)_50%,transparent_50%,transparent_75%,rgba(107,114,128,0.02)_75%,rgba(107,114,128,0.02)_100%)] bg-[length:100%_100%,20px_20px]">
                  <textarea
                    placeholder="Escribe aquí el objetivo específico..."
                    value={nuevoObjetivoTexto}
                    onChange={(e) => setNuevoObjetivoTexto(e.target.value)}
                    className="min-h-[60px] w-full resize-y rounded-lg border border-gray-300 bg-white/60 px-3 py-2 text-[15px] leading-tight text-gray-900 placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    rows={2}
                  />
                  <Button
                    type="button"
                    onClick={handleAddObjetivo}
                    disabled={!nuevoObjetivoTexto?.trim() || addingObjetivo}
                    className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
                  >
                    <Plus className="h-4 w-4" />
                    {addingObjetivo
                      ? 'Guardando...'
                      : 'Agregar objetivo específico'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

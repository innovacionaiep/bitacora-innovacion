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
  /** Botones o acciones a la derecha del objetivo general (ej. Agregar / Eliminar indicador) */
  actions?: ReactNode;
  /** Si está activo el modo eliminar, se muestra botón papelera en cada indicador */
  deleteMode?: boolean;
  onDeleteIndicador?: (indicadorId: string) => Promise<void>;
  /** Callback para agregar un objetivo específico (cuando no hay ninguno) */
  onAddObjetivoEspecifico?: (descripcion: string) => Promise<void>;
}

export function ObjetivoGeneralCard({
  objetivoGeneral,
  progresoGeneral,
  onIndicadorClick,
  actions,
  deleteMode,
  onDeleteIndicador,
  onAddObjetivoEspecifico,
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

  return (
    <div className="flex flex-col gap-6">
      {objetivoGeneral.objetivosEspecificos.length > 0 ? (
        <>
          <div
            className="flex flex-col gap-16 relative"
            style={{ marginLeft: '-140px' }}
          >
            <div className="relative group z-20 flex items-center gap-3">
              <div
                className="relative flex-shrink-0"
                style={{ width: `${OBJETIVO_GENERAL_WIDTH_PX}px` }}
              >
                <div className="relative bg-gradient-to-r from-emerald-100 via-emerald-50 to-white border-2 border-emerald-600/15 text-emerald-900 p-6 rounded-xl shadow-xl flex items-center justify-center w-full bg-[linear-gradient(to_right,transparent_0%,rgba(16,185,129,0.05)_50%,transparent_100%),linear-gradient(45deg,transparent_25%,rgba(16,185,129,0.02)_25%,rgba(16,185,129,0.02)_50%,transparent_50%,transparent_75%,rgba(16,185,129,0.02)_75%,rgba(16,185,129,0.02)_100%)] bg-[length:100%_100%,20px_20px]">
                  {/* Badge en esquina superior izquierda con icono */}
                  <div className="absolute top-3 left-3 bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-sm flex items-center space-x-1.5">
                    <Target className="h-3.5 w-3.5" />
                    <span>Objetivo General</span>
                  </div>

                  {/* Barra de progreso en esquina superior derecha */}
                  <div className="absolute top-3 right-3 flex items-center space-x-2">
                    <span className="text-xs font-semibold text-gray-700">
                      Progreso
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-96 bg-gray-200 rounded-full h-2 shadow-inner">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-300 shadow-sm"
                          style={{ width: `${progresoGeneral}%` }}
                        ></div>
                      </div>
                      <span className="text-xl font-bold text-emerald-600">
                        {progresoGeneral}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center w-full mt-8 pl-2 pr-2">
                    <h3 className="font-bold text-[16px] leading-tight flex-1 min-w-0 text-emerald-900">
                      {objetivoGeneral.descripcion}
                    </h3>
                  </div>
                </div>
              </div>
              {actions != null && (
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {actions}
                </div>
              )}
            </div>

            {/* Bloque enmarcado: objetivos específicos + líneas conectoras + indicadores (80px a la derecha respecto al Objetivo General) */}
            <div
              className="flex flex-col gap-16 relative"
              style={{ marginLeft: '80px' }}
            >
              {/* Línea conectora vertical que conecta desde el objetivo general hasta el último objetivo específico */}
              <div className="absolute left-[28px] -top-16 bottom-0 w-0.5 bg-gray-300 z-0"></div>
              {objetivoGeneral.objetivosEspecificos.map(
                (objetivoEspecifico) => (
                  <div key={objetivoEspecifico.id} className="relative z-10">
                    <ObjetivoEspecificoCard
                      objetivoEspecifico={objetivoEspecifico}
                      onIndicadorClick={onIndicadorClick}
                      deleteMode={deleteMode}
                      onDeleteIndicador={onDeleteIndicador}
                    />
                  </div>
                )
              )}
            </div>
          </div>
        </>
      ) : (
        <div
          className="flex flex-col gap-16 relative"
          style={{ marginLeft: '-140px' }}
        >
          {/* Fila: Objetivo General con ancho fijo + acciones */}
          <div className="relative group flex items-center gap-3">
            <div
              className="relative flex-shrink-0"
              style={{ width: `${OBJETIVO_GENERAL_WIDTH_PX}px` }}
            >
              <div className="relative bg-gradient-to-r from-emerald-100 via-emerald-50 to-white border-2 border-emerald-600/15 text-emerald-900 p-6 rounded-xl shadow-xl flex items-center justify-center w-full bg-[linear-gradient(to_right,transparent_0%,rgba(16,185,129,0.05)_50%,transparent_100%),linear-gradient(45deg,transparent_25%,rgba(16,185,129,0.02)_25%,rgba(16,185,129,0.02)_50%,transparent_50%,transparent_75%,rgba(16,185,129,0.02)_75%,rgba(16,185,129,0.02)_100%)] bg-[length:100%_100%,20px_20px]">
                <div className="absolute top-3 left-3 bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-sm flex items-center space-x-1.5">
                  <Target className="h-3.5 w-3.5" />
                  <span>Objetivo General</span>
                </div>
                <div className="absolute top-3 right-3 flex items-center space-x-2">
                  <span className="text-xs font-semibold text-gray-700">
                    Progreso
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-96 bg-gray-200 rounded-full h-2 shadow-inner">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-300 shadow-sm"
                        style={{ width: `${progresoGeneral}%` }}
                      ></div>
                    </div>
                    <span className="text-xl font-bold text-emerald-600">
                      {progresoGeneral}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center w-full mt-8 pl-2 pr-2">
                  <h3 className="font-bold text-[16px] leading-tight flex-1 min-w-0 text-emerald-900">
                    {objetivoGeneral.descripcion}
                  </h3>
                </div>
              </div>
            </div>
            {actions != null && (
              <div className="flex flex-col gap-2 flex-shrink-0">{actions}</div>
            )}
          </div>

          {/* Bloque: tarjeta vacía "Agregar objetivo específico" con input (misma estructura que objetivos específicos) */}
          <div
            className="flex flex-col gap-16 relative"
            style={{ marginLeft: '80px' }}
          >
            <div className="absolute left-[28px] -top-16 bottom-0 w-0.5 bg-gray-300 z-0" />
            <div className="relative z-10 flex items-stretch gap-6">
              <div
                className="relative flex-shrink-0 bg-white rounded-xl w-[560px]"
                style={{
                  minHeight: '110px',
                }}
              >
                <div className="relative h-full bg-gradient-to-r from-gray-300 via-gray-200 to-gray-100 border-2 border-gray-200 text-gray-900 px-6 py-4 rounded-xl shadow-md flex flex-col justify-center gap-3 bg-[linear-gradient(to_right,transparent_0%,rgba(107,114,128,0.05)_50%,transparent_100%),linear-gradient(45deg,transparent_25%,rgba(107,114,128,0.02)_25%,rgba(107,114,128,0.02)_50%,transparent_50%,transparent_75%,rgba(107,114,128,0.02)_75%,rgba(107,114,128,0.02)_100%)] bg-[length:100%_100%,20px_20px]">
                  <textarea
                    placeholder="Escribe aquí el objetivo específico..."
                    value={nuevoObjetivoTexto}
                    onChange={(e) => setNuevoObjetivoTexto(e.target.value)}
                    className="w-full min-h-[60px] text-[15px] leading-tight text-gray-900 placeholder:text-gray-500 bg-white/60 border border-gray-300 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    rows={2}
                  />
                  <Button
                    type="button"
                    onClick={handleAddObjetivo}
                    disabled={!nuevoObjetivoTexto?.trim() || addingObjetivo}
                    className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="h-4 w-4" />
                    {addingObjetivo ? 'Guardando...' : 'Agregar objetivo específico'}
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

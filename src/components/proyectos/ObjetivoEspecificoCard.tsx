'use client';

import { ListChecks } from 'lucide-react';
import { IndicadorCard } from './IndicadorCard';
import type { ObjetivoGeneralData } from '@/lib/actions/indicadores';

interface ObjetivoEspecificoCardProps {
  objetivoEspecifico: {
    id: string;
    descripcion: string;
    orden: number;
    indicadores: Array<{
      id: string;
      nombre: string;
      descripcion: string;
      formaCalculo: string;
      resultadoEsperado: string;
      resultadoAlcanzado: string;
      porcentajeCumplimiento: number;
      porcentajeAvance: number;
    }>;
  };
  onIndicadorClick: (indicador: {
    nombre: string;
    descripcion: string;
    formaCalculo: string;
  }) => void;
}

export function ObjetivoEspecificoCard({ objetivoEspecifico, onIndicadorClick }: ObjetivoEspecificoCardProps) {
  // Calcular el progreso del objetivo específico basado en sus indicadores
  const progresoObjetivo = objetivoEspecifico.indicadores.length > 0
    ? Math.round(
        objetivoEspecifico.indicadores.reduce((sum, ind) => sum + ind.porcentajeAvance, 0) /
        objetivoEspecifico.indicadores.length
      )
    : 0;

  return (
    <div className="flex items-start gap-6 relative">
      {/* Tarjeta del Objetivo Específico */}
      <div className="relative group flex-shrink-0 bg-white rounded-xl">
        <div className="relative bg-gradient-to-r from-gray-300 via-gray-200 to-gray-100 border-2 border-gray-200 text-gray-900 px-6 py-3 rounded-xl shadow-md w-[480px] flex flex-col justify-center bg-[linear-gradient(to_right,transparent_0%,rgba(107,114,128,0.05)_50%,transparent_100%),linear-gradient(45deg,transparent_25%,rgba(107,114,128,0.02)_25%,rgba(107,114,128,0.02)_50%,transparent_50%,transparent_75%,rgba(107,114,128,0.02)_75%,rgba(107,114,128,0.02)_100%)] bg-[length:100%_100%,20px_20px]">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-gray-400 rounded-md">
                  <ListChecks className="h-4 w-4 text-white" />
                </div>
                <div className="text-xs font-semibold text-gray-700">
                  Objetivo {objetivoEspecifico.orden}
                </div>
              </div>
              {/* Porcentaje de progreso en la misma línea que el título */}
              <span className="text-xl font-bold text-gray-600">
                {progresoObjetivo}%
              </span>
            </div>
            <h4 className="font-semibold text-[15px] leading-tight text-gray-900">
              {objetivoEspecifico.descripcion}
            </h4>
          </div>
        </div>
      </div>

      {/* Indicadores - Se expanden hacia la derecha */}
      {objetivoEspecifico.indicadores.length > 0 && (
        <div className="flex flex-col gap-12 min-w-max relative ml-8">
          {/* Líneas conectoras horizontales desde el objetivo específico hacia cada indicador */}
          {objetivoEspecifico.indicadores.map((indicador, index) => (
            <div key={indicador.id} className="relative">
              {/* Línea conectora horizontal - desde el borde derecho del objetivo específico hasta el punto del indicador */}
              {/* gap-6 (24px) + ml-8 (32px) = 56px total desde el borde derecho del objetivo específico hasta el inicio del contenedor de indicadores */}
              {/* La línea debe extenderse desde el borde derecho del objetivo específico (que está a 480px + 24px = 504px del inicio) */}
              {/* hasta el punto que está en el inicio de la tarjeta del indicador (que está a 504px + 32px = 536px del inicio del contenedor padre) */}
              <div className="absolute left-[-56px] top-1/2 -translate-y-1/2 w-[56px] h-0.5 bg-gray-300 z-0"></div>
              {/* Nodo circular en el punto de conexión - al inicio de la tarjeta del indicador */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-400 rounded-full -translate-x-1/2 z-10"></div>
              
              <IndicadorCard
                indicador={indicador}
                orden={index + 1}
                onClick={() => onIndicadorClick(indicador)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

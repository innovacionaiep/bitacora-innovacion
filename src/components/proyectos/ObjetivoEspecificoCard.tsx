'use client';

import { ListChecks, Search } from 'lucide-react';
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
      formatoNumero?: string | null;
      porcentajeCumplimiento: number;
      porcentajeAvance: number;
    }>;
  };
  onIndicadorClick: (indicador: {
    id: string;
    nombre: string;
    descripcion: string;
    formaCalculo: string;
    resultadoEsperado: string;
    resultadoAlcanzado: string;
    formatoNumero?: string | null;
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

  // Calcular la altura mínima de la tarjeta basada en la cantidad de indicadores
  // Altura base de la tarjeta del indicador: ~90px (aproximado, incluyendo padding y contenido)
  // Gap entre indicadores: 16px (gap-4) cuando hay 2 indicadores, 24px (gap-6) en otros casos
  // Altura base del objetivo: ~110px (aproximado, incluyendo padding y contenido)
  const alturaIndicador = 90; // altura aproximada de cada tarjeta de indicador
  const gapIndicadores = objetivoEspecifico.indicadores.length === 2 ? 16 : 24; // gap-4 = 16px para 2 indicadores, gap-6 = 24px para otros casos
  const alturaBaseObjetivo = 110; // altura base del objetivo
  
  // Si hay indicadores, calcular la altura mínima necesaria
  // La altura total debe ser: altura del primer indicador + (cantidad de indicadores adicionales * (altura + gap))
  const alturaMinima = objetivoEspecifico.indicadores.length > 0
    ? Math.max(
        alturaBaseObjetivo,
        alturaIndicador + (objetivoEspecifico.indicadores.length - 1) * (alturaIndicador + gapIndicadores)
      )
    : alturaBaseObjetivo;

  return (
    <div className="flex items-stretch gap-6 relative">
      {/* Tarjeta del Objetivo Específico */}
      <div className="relative group flex-shrink-0 bg-white rounded-xl">
        <div 
          className="relative bg-gradient-to-r from-gray-300 via-gray-200 to-gray-100 border-2 border-gray-200 text-gray-900 px-6 py-3 rounded-xl shadow-md w-[560px] flex flex-col justify-center bg-[linear-gradient(to_right,transparent_0%,rgba(107,114,128,0.05)_50%,transparent_100%),linear-gradient(45deg,transparent_25%,rgba(107,114,128,0.02)_25%,rgba(107,114,128,0.02)_50%,transparent_50%,transparent_75%,rgba(107,114,128,0.02)_75%,rgba(107,114,128,0.02)_100%)] bg-[length:100%_100%,20px_20px] h-full"
          style={{ minHeight: `${alturaMinima}px` }}
        >
          <div className="flex flex-col space-y-2">
            <div className="flex items-center min-w-0">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <div className="p-1.5 bg-gray-400 rounded-md flex-shrink-0">
                  <ListChecks className="h-4 w-4 text-white" />
                </div>
                <div className="text-xs font-semibold text-gray-700 truncate">
                  Objetivo {objetivoEspecifico.orden}
                </div>
              </div>
              {/* Barra de progreso y porcentaje a la derecha con ancho fijo para alineación */}
              <div className="flex items-center space-x-2 flex-shrink-0 ml-2 pr-1" style={{ width: '240px' }}>
                <div className="w-44 bg-gray-200 rounded-full h-2 shadow-inner flex-shrink-0">
                  <div
                    className="bg-gray-500 h-2 rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${progresoObjetivo}%` }}
                  ></div>
                </div>
                <span className="text-xl font-bold text-gray-600 whitespace-nowrap">
                  {progresoObjetivo}%
                </span>
              </div>
            </div>
            <h4 className="font-semibold text-[15px] leading-tight text-gray-900">
              {objetivoEspecifico.descripcion}
            </h4>
          </div>
        </div>
      </div>

      {/* Indicadores - Se expanden hacia la derecha */}
      {objetivoEspecifico.indicadores.length > 0 && (
        <div 
          className={`flex flex-col min-w-max relative ml-40 ${objetivoEspecifico.indicadores.length === 1 ? 'justify-center' : objetivoEspecifico.indicadores.length === 2 ? 'gap-4 justify-center' : 'gap-6 justify-center'}`}
          style={{ height: `${alturaMinima}px`, minHeight: `${alturaMinima}px` }}
        >
          {/* Líneas conectoras horizontales desde el objetivo específico hacia cada indicador */}
          {objetivoEspecifico.indicadores.map((indicador, index) => (
            <div key={indicador.id} className="relative flex items-center gap-3">
              {/* Línea conectora horizontal - desde el borde derecho del objetivo específico hasta el punto del indicador */}
              {/* gap-6 (24px) + ml-40 (160px) = 184px total desde el borde derecho del objetivo específico hasta el inicio del contenedor de indicadores */}
              {/* La línea debe extenderse desde el borde derecho del objetivo específico hasta el inicio del contenedor de indicadores */}
              <div className="absolute left-[-184px] top-1/2 -translate-y-1/2 w-[184px] h-0.5 bg-gray-300 z-0"></div>
              {/* Nodo circular en el punto de conexión - al inicio de la tarjeta del indicador */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-400 rounded-full -translate-x-1/2 z-10"></div>
              
              <IndicadorCard
                indicador={{
                  id: indicador.id,
                  nombre: indicador.nombre,
                  resultadoEsperado: indicador.resultadoEsperado,
                  resultadoAlcanzado: indicador.resultadoAlcanzado,
                  formatoNumero: indicador.formatoNumero,
                  porcentajeAvance: indicador.porcentajeAvance,
                }}
                orden={index + 1}
              />
              
              {/* Botón Ver Detalles - fuera de la tarjeta, a la derecha */}
              <button
                onClick={() => onIndicadorClick(indicador)}
                className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer flex-shrink-0"
                title="Ver detalles"
              >
                <Search className="h-5 w-5 text-gray-700" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { Target } from 'lucide-react';
import { ObjetivoEspecificoCard } from './ObjetivoEspecificoCard';
import type { ObjetivoGeneralData } from '@/lib/actions/indicadores';
import { useMemo } from 'react';

interface ObjetivoGeneralCardProps {
  objetivoGeneral: ObjetivoGeneralData;
  progresoGeneral: number;
  onIndicadorClick: (indicador: {
    nombre: string;
    descripcion: string;
    formaCalculo: string;
  }) => void;
}

export function ObjetivoGeneralCard({ objetivoGeneral, progresoGeneral, onIndicadorClick }: ObjetivoGeneralCardProps) {
  // Calcular el ancho máximo basado en los anchos conocidos de las tarjetas
  // Para cada objetivo específico: objetivo (480px) + gap (24px) + indicadores (380px cada uno + 24px gap entre ellos)
  // El ancho máximo será el del objetivo específico con más indicadores
  const objetivoGeneralWidth = useMemo(() => {
    if (objetivoGeneral.objetivosEspecificos.length === 0) return null;
    
    const objetivoWidth = 480;
    const gap = 24;
    const indicadorWidth = 380;
    
    // Calcular el ancho para cada objetivo específico y tomar el máximo
    const widths = objetivoGeneral.objetivosEspecificos.map(oe => {
      if (oe.indicadores.length === 0) {
        return objetivoWidth; // Solo el objetivo específico
      }
      // Los indicadores están en columna (flex-col), así que el ancho es: objetivo + gap + ancho del indicador más ancho
      // Como están en columna, todos los indicadores tienen el mismo ancho (380px), así que solo necesitamos uno
      return objetivoWidth + gap + indicadorWidth;
    });
    
    return Math.max(...widths);
  }, [objetivoGeneral.objetivosEspecificos]);

  return (
    <div className="flex flex-col gap-6">
      {/* Objetivos Específicos - Se expanden horizontalmente hacia la derecha */}
      {objetivoGeneral.objetivosEspecificos.length > 0 ? (
        <>
          {/* Contenedor wrapper que agrupa todo para alinear anchos */}
          <div className="flex flex-col gap-10 relative">
            {/* Tarjeta del Objetivo General - ENCIMA de todo, con desplazamiento hacia la izquierda */}
            <div 
              className="relative group z-20"
              style={objetivoGeneralWidth ? { width: `${objetivoGeneralWidth}px`, marginLeft: '-120px' } : { marginLeft: '-120px' }}
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
            
            {/* Contenedor de objetivos específicos - este define el ancho máximo (sin barras de progreso) */}
            <div className="flex flex-col gap-8 relative">
              {/* Línea conectora vertical que conecta desde el objetivo general hasta el último objetivo específico */}
              <div className="absolute left-[28px] -top-10 bottom-0 w-0.5 bg-gray-300 z-0"></div>
              {objetivoGeneral.objetivosEspecificos.map((objetivoEspecifico) => (
                <div key={objetivoEspecifico.id} className="relative z-10">
                  <ObjetivoEspecificoCard
                    objetivoEspecifico={objetivoEspecifico}
                    onIndicadorClick={onIndicadorClick}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="relative group" style={{ marginLeft: '-120px' }}>
          <div className="relative bg-gradient-to-r from-emerald-100 via-emerald-50 to-white border-2 border-emerald-600/15 text-emerald-900 p-6 rounded-xl shadow-xl flex items-center justify-center bg-[linear-gradient(to_right,transparent_0%,rgba(16,185,129,0.05)_50%,transparent_100%),linear-gradient(45deg,transparent_25%,rgba(16,185,129,0.02)_25%,rgba(16,185,129,0.02)_50%,transparent_50%,transparent_75%,rgba(16,185,129,0.02)_75%,rgba(16,185,129,0.02)_100%)] bg-[length:100%_100%,20px_20px]">
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
              <h3 className="font-bold text-[16px] leading-tight text-emerald-900">
                {objetivoGeneral.descripcion}
              </h3>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

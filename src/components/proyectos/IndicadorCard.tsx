'use client';

import { BarChart3, Search } from 'lucide-react';
import { ProgressBarWithMarks } from './ProgressBarWithMarks';

interface IndicadorCardProps {
  indicador: {
    id: string;
    nombre: string;
    resultadoEsperado: string;
    resultadoAlcanzado: string;
  };
  orden: number;
  onClick: () => void;
}

export function IndicadorCard({ indicador, orden, onClick }: IndicadorCardProps) {
  // Parsear los valores numéricos de los resultados
  const parseValue = (value: string): number => {
    if (!value || value === '') return 0;
    // Remover símbolos de porcentaje, espacios y caracteres no numéricos excepto punto y coma
    const cleaned = value.toString().replace(/%/g, '').replace(/,/g, '.').trim();
    // Intentar parsear como número
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const resultadoEsperado = parseValue(indicador.resultadoEsperado);
  const resultadoAlcanzado = parseValue(indicador.resultadoAlcanzado);
  
  // Determinar el máximo para la escala de la barra
  // Si el alcanzado supera el esperado, usar el alcanzado como máximo
  // Agregar un margen del 20% para visualización
  const maxValue = Math.max(
    resultadoEsperado * 1.2, 
    resultadoAlcanzado * 1.2, 
    Math.max(resultadoEsperado, resultadoAlcanzado) * 1.1,
    100
  );

  return (
    <div className="flex items-center gap-4">
      {/* Tarjeta del Indicador - estilo más compacto */}
      <div 
        onClick={onClick}
        className="relative group cursor-pointer flex-shrink-0"
      >
        <div className="relative bg-white border border-gray-200 text-gray-900 px-4 py-2.5 rounded-lg shadow-sm transform transition-all duration-300 hover:shadow-md min-w-[280px] max-w-[280px]">
          {/* Contenido */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1 bg-gray-100 rounded">
                  <BarChart3 className="h-3.5 w-3.5 text-gray-600" />
                </div>
                <div className="text-xs font-semibold text-gray-700">
                  Indicador {orden}
                </div>
              </div>
              {/* Icono de lupa en esquina superior derecha */}
              <div className="p-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors cursor-pointer">
                <Search className="h-3 w-3 text-gray-700" />
              </div>
            </div>
            <h5 className="font-medium text-[13px] leading-tight break-words text-gray-800">
              {indicador.nombre}
            </h5>
          </div>
        </div>
      </div>

      {/* Barra de Progreso con Marcas */}
      <div className="flex-1 min-w-[350px] max-w-[500px]">
        <ProgressBarWithMarks
          resultadoEsperado={resultadoEsperado}
          resultadoAlcanzado={resultadoAlcanzado}
          maxValue={maxValue}
          esperadoLabel={indicador.resultadoEsperado}
          alcanzadoLabel={indicador.resultadoAlcanzado}
        />
      </div>
    </div>
  );
}

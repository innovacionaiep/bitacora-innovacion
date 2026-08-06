'use client';

import { BarChart3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface IndicadorData {
  id: string;
  nombre: string;
  resultadoEsperado: string;
  resultadoAlcanzado: string;
  formatoNumero?: string | null;
  porcentajeAvance: number;
  fechaInicio?: string | null;
  fechaFin?: string | null;
}

interface IndicadoresAgrupadosCardProps {
  indicadores: Array<IndicadorData & { orden: number }>;
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
  indicadoresCompletos: Array<{
    id: string;
    nombre: string;
    descripcion: string;
    formaCalculo: string;
    resultadoEsperado: string;
    resultadoAlcanzado: string;
    formatoNumero?: string | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
  }>;
  onDeleteIndicador?: (indicadorId: string) => Promise<void>;
}

export function IndicadoresAgrupadosCard({
  indicadores,
  onIndicadorClick,
  indicadoresCompletos,
  onDeleteIndicador,
}: IndicadoresAgrupadosCardProps) {
  // Parsear los valores numéricos de los resultados
  const parseValue = (value: string): number => {
    if (!value || value === '') return 0;
    const cleaned = value
      .toString()
      .replace(/%/g, '')
      .replace(/,/g, '.')
      .trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Formatear el resultado según el formato del número
  const formatResultado = (
    value: string,
    formato: string | null | undefined
  ): string => {
    const numValue = parseValue(value);
    if (formato === 'Porcentaje') {
      return `${Math.round(numValue)}%`;
    } else if (formato === 'Número Entero') {
      return Math.round(numValue).toString();
    } else if (formato === 'Número Decimal') {
      return numValue.toFixed(2);
    }
    if (value.includes('%')) {
      return `${Math.round(numValue)}%`;
    }
    return Math.round(numValue).toString();
  };

  // Calcular el color según el porcentaje de cumplimiento
  const getColorActual = (indicador: IndicadorData): string => {
    const resultadoEsperadoNum = parseValue(indicador.resultadoEsperado);
    const resultadoAlcanzadoNum = parseValue(indicador.resultadoAlcanzado);

    let porcentajeCumplimiento = 0;
    if (resultadoEsperadoNum > 0) {
      porcentajeCumplimiento =
        (resultadoAlcanzadoNum / resultadoEsperadoNum) * 100;
    } else if (resultadoAlcanzadoNum > 0) {
      porcentajeCumplimiento = 100;
    }

    if (porcentajeCumplimiento < 50) {
      return 'text-red-600';
    } else if (porcentajeCumplimiento >= 50 && porcentajeCumplimiento < 100) {
      return 'text-yellow-600';
    } else {
      return 'text-emerald-600';
    }
  };

  return (
    <div className="relative flex-shrink-0">
      <div className="relative bg-white border border-gray-200 text-gray-900 rounded-lg shadow-sm w-[580px]">
        {indicadores.map((indicador, index) => {
          const resultadoEsperadoFormateado = formatResultado(
            indicador.resultadoEsperado,
            indicador.formatoNumero
          );
          const resultadoAlcanzadoFormateado = formatResultado(
            indicador.resultadoAlcanzado,
            indicador.formatoNumero
          );
          const colorActual = getColorActual(indicador);

          return (
            <div key={indicador.id}>
              {/* Contenido del indicador */}
              <div className="group relative px-4 py-2.5">
                <div className="flex items-center gap-3 h-full">
                  {/* Sección izquierda: ícono y título del indicador */}
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <div className="p-1 bg-gray-100 rounded flex-shrink-0">
                      <BarChart3 className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                    <div className="flex flex-col">
                      <h5 className="font-medium text-[15px] leading-tight break-words text-gray-800">
                        {indicador.nombre}
                      </h5>
                    </div>
                  </div>

                  {/* Valores Esperado y Actual - a la derecha del texto */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Esperado */}
                    <div
                      className="flex flex-col items-end"
                      style={{ width: '80px' }}
                    >
                      <span className="text-xs font-bold text-gray-800">
                        Esperado
                      </span>
                      <span className="text-lg font-bold text-gray-800 whitespace-nowrap">
                        {resultadoEsperadoFormateado}
                      </span>
                    </div>

                    {/* Separador vertical */}
                    <div className="h-8 w-px bg-gray-300"></div>

                    {/* Actual */}
                    <div
                      className="flex flex-col items-end"
                      style={{ width: '80px' }}
                    >
                      <span className={`text-xs font-bold ${colorActual}`}>
                        Actual
                      </span>
                      <span
                        className={`text-lg font-bold ${colorActual} whitespace-nowrap`}
                      >
                        {resultadoAlcanzadoFormateado}
                      </span>
                    </div>
                  </div>
                </div>

                {onDeleteIndicador && (
                  <div className="absolute -top-10 right-0 z-20 flex items-center gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              void onDeleteIndicador(indicador.id);
                            }}
                            className="h-8 w-8 shrink-0 rounded-md border bg-white text-gray-600 border-gray-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 shadow-sm flex items-center justify-center p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Eliminar indicador</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>

              {/* Separador horizontal entre indicadores (excepto el último) */}
              {index < indicadores.length - 1 && (
                <div className="h-px bg-gray-300 mx-4"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

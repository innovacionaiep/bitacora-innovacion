'use client';

import { BarChart3 } from 'lucide-react';

interface IndicadorCardProps {
  indicador: {
    id: string;
    nombre: string;
    resultadoEsperado: string;
    resultadoAlcanzado: string;
    formatoNumero?: string | null;
    porcentajeAvance: number;
    fechaInicio?: string | null;
    fechaFin?: string | null;
  };
  orden: number;
}

export function IndicadorCard({ indicador, orden }: IndicadorCardProps) {
  // Parsear los valores numéricos de los resultados
  const parseValue = (value: string): number => {
    if (!value || value === '') return 0;
    // Remover símbolos de porcentaje, espacios y caracteres no numéricos excepto punto y coma
    const cleaned = value.toString().replace(/%/g, '').replace(/,/g, '.').trim();
    // Intentar parsear como número
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };
  
  // Formatear el resultado según el formato del número
  const formatResultado = (value: string, formato: string | null | undefined): string => {
    const numValue = parseValue(value);
    if (formato === 'Porcentaje') {
      return `${Math.round(numValue)}%`;
    } else if (formato === 'Número Entero') {
      return Math.round(numValue).toString();
    } else if (formato === 'Número Decimal') {
      return numValue.toFixed(2);
    }
    // Por defecto, si el valor contiene "%", asumir porcentaje, sino mostrar como número entero
    if (value.includes('%')) {
      return `${Math.round(numValue)}%`;
    }
    return Math.round(numValue).toString();
  };
  
  const resultadoEsperadoFormateado = formatResultado(indicador.resultadoEsperado, indicador.formatoNumero);
  const resultadoAlcanzadoFormateado = formatResultado(indicador.resultadoAlcanzado, indicador.formatoNumero);

  // Calcular el porcentaje de cumplimiento
  const resultadoEsperadoNum = parseValue(indicador.resultadoEsperado);
  const resultadoAlcanzadoNum = parseValue(indicador.resultadoAlcanzado);
  
  // Calcular porcentaje de cumplimiento
  let porcentajeCumplimiento = 0;
  if (resultadoEsperadoNum > 0) {
    porcentajeCumplimiento = (resultadoAlcanzadoNum / resultadoEsperadoNum) * 100;
  } else if (resultadoAlcanzadoNum > 0) {
    // Si el esperado es 0 pero hay un valor alcanzado, considerar como 100%
    porcentajeCumplimiento = 100;
  }

  // Determinar el color según el porcentaje de cumplimiento
  let colorActual = '';
  if (porcentajeCumplimiento < 50) {
    colorActual = 'text-red-600'; // Rojo: menos del 50%
  } else if (porcentajeCumplimiento >= 50 && porcentajeCumplimiento < 100) {
    colorActual = 'text-yellow-600'; // Amarillo: 50% o más pero menos del 100%
  } else {
    colorActual = 'text-emerald-600'; // Verde esmeralda: 100% o más
  }

  return (
    <div className="relative flex-shrink-0">
      <div className="relative bg-white border border-gray-200 text-gray-900 px-4 py-2.5 rounded-lg shadow-sm w-[580px]">
        {/* Contenido - centrado verticalmente */}
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
            <div className="flex flex-col items-end" style={{ width: '80px' }}>
              <span className="text-xs font-bold text-blue-600">Esperado</span>
              <span className="text-lg font-bold text-blue-600 whitespace-nowrap">
                {resultadoEsperadoFormateado}
              </span>
            </div>
            
            {/* Separador vertical */}
            <div className="h-8 w-px bg-gray-300"></div>
            
            {/* Actual */}
            <div className="flex flex-col items-end" style={{ width: '80px' }}>
              <span className={`text-xs font-bold ${colorActual}`}>Actual</span>
              <span className={`text-lg font-bold ${colorActual} whitespace-nowrap`}>
                {resultadoAlcanzadoFormateado}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

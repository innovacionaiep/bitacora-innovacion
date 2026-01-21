'use client';

interface ProgressBarWithMarksProps {
  resultadoEsperado: number;
  resultadoAlcanzado: number;
  maxValue: number;
  esperadoLabel: string;
  alcanzadoLabel: string;
}

export function ProgressBarWithMarks({
  resultadoEsperado,
  resultadoAlcanzado,
  maxValue,
  esperadoLabel,
  alcanzadoLabel,
}: ProgressBarWithMarksProps) {
  // Calcular porcentajes para posicionamiento
  const esperadoPercent = Math.min((resultadoEsperado / maxValue) * 100, 100);
  const alcanzadoPercent = Math.min((resultadoAlcanzado / maxValue) * 100, 100);
  
  // Si el alcanzado supera el esperado, extender la barra más allá del 100%
  const barraWidth = resultadoAlcanzado > resultadoEsperado 
    ? Math.min((resultadoAlcanzado / maxValue) * 100, 100)
    : alcanzadoPercent;

  return (
    <div className="relative w-full py-1">
      {/* Barra de fondo gris */}
      <div className="w-full h-8 bg-gray-200 rounded-lg shadow-inner relative overflow-visible">
        {/* Barra de progreso verde esmeralda */}
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg transition-all duration-500 shadow-sm"
          style={{ width: `${Math.min(barraWidth, 100)}%` }}
        />

        {/* Marca del resultado esperado */}
        {esperadoPercent > 0 && (
          <div
            className="absolute top-0 w-0.5 h-full bg-blue-600 z-10"
            style={{ left: `calc(${esperadoPercent}% - 1px)` }}
          >
            <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <div className="bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded shadow-md">
                Esperado: {esperadoLabel}
              </div>
              <div className="w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-blue-600 mx-auto"></div>
            </div>
          </div>
        )}

        {/* Marca del resultado alcanzado */}
        {alcanzadoPercent > 0 && (
          <div
            className="absolute top-0 w-0.5 h-full bg-emerald-700 z-20"
            style={{ left: `calc(${alcanzadoPercent}% - 1px)` }}
          >
            <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <div className="bg-emerald-700 text-white text-xs font-semibold px-2 py-0.5 rounded shadow-md">
                Alcanzado: {alcanzadoLabel}
              </div>
              <div className="w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-emerald-700 mx-auto"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

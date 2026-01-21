'use client';

interface ProgressBarWithMarksProps {
  resultadoEsperado: number;
  resultadoAlcanzado: number;
  valorMinimo: number;
  valorMaximo: number;
  maxValue: number;
  esperadoLabel: string;
  showAlcanzadoTag?: boolean;
}

export function ProgressBarWithMarks({
  resultadoEsperado,
  resultadoAlcanzado,
  valorMinimo,
  valorMaximo,
  maxValue,
  esperadoLabel,
  showAlcanzadoTag = true,
}: ProgressBarWithMarksProps) {
  // Calcular el rango disponible (valorMaximo - valorMinimo)
  const rango = valorMaximo - valorMinimo;

  // Calcular porcentajes para posicionamiento basado en el rango
  // Asegurar que los valores estén dentro del rango [valorMinimo, valorMaximo]
  const resultadoEsperadoClamped = Math.max(valorMinimo, Math.min(valorMaximo, resultadoEsperado));
  const resultadoAlcanzadoClamped = Math.max(valorMinimo, Math.min(valorMaximo, resultadoAlcanzado));

  const esperadoPercent = rango > 0
    ? Math.max(0, Math.min(100, ((resultadoEsperadoClamped - valorMinimo) / rango) * 100))
    : 0;
  const alcanzadoPercent = rango > 0
    ? Math.max(0, Math.min(100, ((resultadoAlcanzadoClamped - valorMinimo) / rango) * 100))
    : 0;

  // Calcular el ancho de la barra basado en el resultado alcanzado dentro del rango
  const barraWidth = rango > 0
    ? Math.max(0, Math.min(100, ((resultadoAlcanzadoClamped - valorMinimo) / rango) * 100))
    : 0;

  return (
    <div className="relative w-full">
      {/* Barra de fondo gris - más delgada como la del objetivo general */}
      <div className="w-full h-2 bg-gray-200 rounded-full shadow-inner relative overflow-visible">
        {/* Barra de progreso verde esmeralda */}
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500 shadow-sm"
          style={{ width: `${Math.min(barraWidth, 100)}%` }}
        />

        {/* Marca del resultado esperado */}
        {esperadoPercent > 0 && (
          <div
            className="absolute z-10"
            style={{ left: `calc(${esperadoPercent}% - 1px)` }}
          >
            {/* Línea vertical que conecta la barra con el badge */}
            <div
              className="absolute w-0.5 bg-blue-600"
              style={{
                top: '-32px',
                height: '32px'
              }}
            />
            {/* Badge posicionado arriba */}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <div className="bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded shadow-md">
                Esperado: {esperadoLabel}
              </div>
              <div className="w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-blue-600 mx-auto"></div>
            </div>
          </div>
        )}

        {/* Marca del resultado alcanzado - removida según solicitud del usuario */}
      </div>
    </div>
  );
}

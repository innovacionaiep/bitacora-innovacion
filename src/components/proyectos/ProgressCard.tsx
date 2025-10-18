'use client';

import { Card, CardContent } from '@/components/ui/card';

interface ProgressCardProps {
  avanceGantt: number;
  avanceIndicadores: number;
  presupuestoUsado: number;
  presupuestoTotal: number;
}

export function ProgressCard({
  avanceGantt,
  avanceIndicadores,
  presupuestoUsado,
  presupuestoTotal,
}: ProgressCardProps) {
  const presupuestoPorcentaje = presupuestoTotal > 0 
    ? Math.round((presupuestoUsado / presupuestoTotal) * 100)
    : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3 text-gray-900">
          AVANCES Y PRESUPUESTO
        </h3>
        <div className="space-y-3">
          {/* Avance Gantt */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-700">
                AVANCE GANTT
              </span>
              <span className="text-xs font-bold text-gray-900">
                {avanceGantt}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${avanceGantt}%` }}
              />
            </div>
          </div>

          {/* Avance Indicadores */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-700">
                INDICADORES
              </span>
              <span className="text-xs font-bold text-gray-900">
                {avanceIndicadores}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${avanceIndicadores}%` }}
              />
            </div>
          </div>

          {/* Presupuesto */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-700">
                PRESUPUESTO
              </span>
              <span className="text-xs font-bold text-gray-900">
                {presupuestoPorcentaje}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${presupuestoPorcentaje}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
              <span>${presupuestoUsado.toLocaleString('es-CL')}</span>
              <span>${presupuestoTotal.toLocaleString('es-CL')}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


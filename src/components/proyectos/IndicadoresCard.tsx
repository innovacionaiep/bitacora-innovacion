'use client';

import { useIndicadores } from '@/hooks/useIndicadores';
import { useState } from 'react';
import { ObjetivoGeneralCard } from './ObjetivoGeneralCard';
import { IndicadorModal } from './IndicadorModal';
import type { IndicadoresProyectoData } from '@/lib/actions/indicadores';

interface IndicadoresCardProps {
  projectId: string;
}

export function IndicadoresCard({ projectId }: IndicadoresCardProps) {
  const { data, loading, error, progresoGeneral } = useIndicadores(projectId);
  const [selectedIndicador, setSelectedIndicador] = useState<{
    nombre: string;
    descripcion: string;
    formaCalculo: string;
  } | null>(null);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando indicadores...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error al cargar indicadores: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.objetivosGenerales.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No hay indicadores configurados para este proyecto</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Main Content - Sistema de tarjetas tipo mapa mental */}
      <div className="flex-1 overflow-auto">
        <div className="py-6 pl-40 pr-6 min-w-max">
          {data.objetivosGenerales.map((objetivoGeneral, index) => (
            <div key={objetivoGeneral.id} className={index > 0 ? 'mt-12' : ''}>
              <ObjetivoGeneralCard
                objetivoGeneral={objetivoGeneral}
                progresoGeneral={progresoGeneral}
                onIndicadorClick={(indicador) => {
                  setSelectedIndicador({
                    nombre: indicador.nombre,
                    descripcion: indicador.descripcion,
                    formaCalculo: indicador.formaCalculo,
                  });
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Modal para mostrar descripción y forma de cálculo */}
      {selectedIndicador && (
        <IndicadorModal
          indicador={selectedIndicador}
          onClose={() => setSelectedIndicador(null)}
        />
      )}
    </div>
  );
}

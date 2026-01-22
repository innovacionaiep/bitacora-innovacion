'use client';

import { useIndicadores } from '@/hooks/useIndicadores';
import { useState, useEffect } from 'react';
import { ObjetivoGeneralCard } from './ObjetivoGeneralCard';
import { IndicadorModal } from './IndicadorModal';
import type { IndicadoresProyectoData } from '@/lib/actions/indicadores';

interface IndicadoresCardProps {
  projectId: string;
}

export function IndicadoresCard({ projectId }: IndicadoresCardProps) {
  const { data, loading, error, progresoGeneral, fetchIndicadores } = useIndicadores(projectId);
  const [selectedIndicador, setSelectedIndicador] = useState<{
    id: string;
    nombre: string;
    descripcion: string;
    formaCalculo: string;
    resultadoEsperado: string;
    resultadoAlcanzado: string;
    formatoNumero?: string | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
  } | null>(null);

  // Función para refrescar los datos después de guardar
  const handleIndicadorUpdated = async () => {
    // Actualizar datos sin mostrar estado de carga para evitar "refresh" visual
    await fetchIndicadores(false);
  };

  // Actualizar el indicador seleccionado cuando cambian los datos
  useEffect(() => {
    if (selectedIndicador && data) {
      // Buscar el indicador actualizado en los datos refrescados
      for (const objetivoGeneral of data.objetivosGenerales) {
        for (const objetivoEspecifico of objetivoGeneral.objetivosEspecificos) {
          const indicadorActualizado = objetivoEspecifico.indicadores.find(
            ind => ind.id === selectedIndicador.id
          );
          if (indicadorActualizado) {
            // Solo actualizar si hay cambios
            if (
              indicadorActualizado.formatoNumero !== selectedIndicador.formatoNumero ||
              indicadorActualizado.resultadoEsperado !== selectedIndicador.resultadoEsperado ||
              indicadorActualizado.resultadoAlcanzado !== selectedIndicador.resultadoAlcanzado ||
              indicadorActualizado.descripcion !== selectedIndicador.descripcion ||
              indicadorActualizado.formaCalculo !== selectedIndicador.formaCalculo ||
              indicadorActualizado.fechaInicio !== selectedIndicador.fechaInicio ||
              indicadorActualizado.fechaFin !== selectedIndicador.fechaFin
            ) {
              setSelectedIndicador({
                id: indicadorActualizado.id,
                nombre: indicadorActualizado.nombre,
                descripcion: indicadorActualizado.descripcion,
                formaCalculo: indicadorActualizado.formaCalculo,
                resultadoEsperado: indicadorActualizado.resultadoEsperado,
                resultadoAlcanzado: indicadorActualizado.resultadoAlcanzado,
                formatoNumero: indicadorActualizado.formatoNumero,
                fechaInicio: indicadorActualizado.fechaInicio,
                fechaFin: indicadorActualizado.fechaFin,
              });
            }
            break;
          }
        }
      }
    }
  }, [data, selectedIndicador?.id]);

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
        <div className="pt-3 pb-6 pl-40 pr-6 min-w-max">
          {data.objetivosGenerales.map((objetivoGeneral, index) => (
            <div key={objetivoGeneral.id} className={index > 0 ? 'mt-12' : ''}>
              <ObjetivoGeneralCard
                objetivoGeneral={objetivoGeneral}
                progresoGeneral={progresoGeneral}
                onIndicadorClick={(indicador) => {
                  setSelectedIndicador({
                    id: indicador.id,
                    nombre: indicador.nombre,
                    descripcion: indicador.descripcion,
                    formaCalculo: indicador.formaCalculo,
                    resultadoEsperado: indicador.resultadoEsperado,
                    resultadoAlcanzado: indicador.resultadoAlcanzado,
                    formatoNumero: indicador.formatoNumero,
                    fechaInicio: indicador.fechaInicio,
                    fechaFin: indicador.fechaFin,
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
          onUpdate={handleIndicadorUpdated}
        />
      )}
    </div>
  );
}

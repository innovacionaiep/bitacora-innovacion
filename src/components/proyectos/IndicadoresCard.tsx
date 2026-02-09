'use client';

import { useIndicadores } from '@/hooks/useIndicadores';
import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ObjetivoGeneralCard } from './ObjetivoGeneralCard';
import { IndicadorModal } from './IndicadorModal';
import { AgregarIndicadorModal } from './AgregarIndicadorModal';
import { deleteIndicador } from '@/lib/actions/indicadores';
import type { IndicadoresProyectoData } from '@/lib/actions/indicadores';

interface IndicadoresCardProps {
  projectId: string;
  coordinadorIds?: string[];
  currentUserId?: string;
}

export function IndicadoresCard({
  projectId,
  coordinadorIds = [],
  currentUserId,
}: IndicadoresCardProps) {
  const { data, loading, error, progresoGeneral, fetchIndicadores } =
    useIndicadores(projectId);
  const canValidateAsCoordinator =
    !!currentUserId && coordinadorIds.includes(currentUserId);
  const [deleteMode, setDeleteMode] = useState(false);
  const [showAgregarModal, setShowAgregarModal] = useState(false);
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
    validadoPorCoordinador?: boolean;
    validadoPorCoordinadorPor?: {
      id: string;
      name: string | null;
      image: string | null;
    } | null;
  } | null>(null);

  // Función para refrescar los datos después de guardar
  const handleIndicadorUpdated = async () => {
    await fetchIndicadores(false);
  };

  const handleDeleteIndicador = async (indicadorId: string) => {
    if (!confirm('¿Eliminar este indicador?')) return;
    const result = await deleteIndicador(indicadorId);
    if (result.success) {
      await fetchIndicadores(false);
    } else {
      alert(result.error || 'Error al eliminar');
    }
  };

  const objetivosEspecificosForModal = useMemo(() => {
    if (!data?.objetivosGenerales) return [];
    return data.objetivosGenerales.flatMap((og) =>
      og.objetivosEspecificos.map((oe) => ({
        id: oe.id,
        descripcion: oe.descripcion,
        orden: oe.orden,
      }))
    );
  }, [data]);

  // Actualizar el indicador seleccionado cuando cambian los datos
  useEffect(() => {
    if (selectedIndicador && data) {
      // Buscar el indicador actualizado en los datos refrescados
      for (const objetivoGeneral of data.objetivosGenerales) {
        for (const objetivoEspecifico of objetivoGeneral.objetivosEspecificos) {
          const indicadorActualizado = objetivoEspecifico.indicadores.find(
            (ind) => ind.id === selectedIndicador.id
          );
          if (indicadorActualizado) {
            // Solo actualizar si hay cambios
            if (
              indicadorActualizado.formatoNumero !==
                selectedIndicador.formatoNumero ||
              indicadorActualizado.resultadoEsperado !==
                selectedIndicador.resultadoEsperado ||
              indicadorActualizado.resultadoAlcanzado !==
                selectedIndicador.resultadoAlcanzado ||
              indicadorActualizado.descripcion !==
                selectedIndicador.descripcion ||
              indicadorActualizado.formaCalculo !==
                selectedIndicador.formaCalculo ||
              indicadorActualizado.fechaInicio !==
                selectedIndicador.fechaInicio ||
              indicadorActualizado.fechaFin !== selectedIndicador.fechaFin ||
              indicadorActualizado.validadoPorCoordinador !==
                selectedIndicador.validadoPorCoordinador
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
                validadoPorCoordinador: indicadorActualizado.validadoPorCoordinador,
                validadoPorCoordinadorPor:
                  indicadorActualizado.validadoPorCoordinadorPor,
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
          <p className="text-red-500 mb-4">
            Error al cargar indicadores: {error}
          </p>
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
          <p className="text-gray-500 mb-4">
            No hay indicadores configurados para este proyecto
          </p>
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
                canValidateAsCoordinator={canValidateAsCoordinator}
                onIndicadorValidationToggle={handleIndicadorUpdated}
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
                    validadoPorCoordinador: indicador.validadoPorCoordinador,
                    validadoPorCoordinadorPor: indicador.validadoPorCoordinadorPor,
                  });
                }}
                actions={index === 0 ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={`h-10 w-10 shrink-0 rounded-lg transition-all duration-200 flex items-center justify-center border shadow-sm ${
                            showAgregarModal
                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                          }`}
                          onClick={() => setShowAgregarModal(true)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Agregar indicador</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={`h-10 w-10 shrink-0 rounded-lg transition-all duration-200 flex items-center justify-center border shadow-sm ${
                            deleteMode
                              ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                          }`}
                          onClick={() => setDeleteMode((prev) => !prev)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{deleteMode ? 'Salir del modo eliminación' : 'Eliminar indicador'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : undefined}
                deleteMode={deleteMode}
                onDeleteIndicador={handleDeleteIndicador}
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
          projectId={projectId}
          canValidateAsCoordinator={canValidateAsCoordinator}
        />
      )}

      {/* Modal para agregar indicador */}
      <AgregarIndicadorModal
        open={showAgregarModal}
        onClose={() => setShowAgregarModal(false)}
        onSuccess={handleIndicadorUpdated}
        proyectoId={projectId}
        objetivosEspecificos={objetivosEspecificosForModal}
      />
    </div>
  );
}

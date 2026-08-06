'use client';

import { useIndicadores } from '@/hooks/useIndicadores';
import { useState, useEffect, useMemo } from 'react';
import { ObjetivoGeneralCard } from './ObjetivoGeneralCard';
import { IndicadorModal } from './IndicadorModal';
import { AgregarIndicadorModal } from './AgregarIndicadorModal';
import { deleteIndicador } from '@/lib/actions/indicadores';
import { createObjetivoEspecifico } from '@/lib/actions/proyectos';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';

interface IndicadoresCardProps {
  projectId: string;
  topLoaderEnabled?: boolean;
  canImport?: boolean;
  onCargaMasiva?: () => void;
}

export function IndicadoresCard({
  projectId,
  topLoaderEnabled = true,
  canImport = false,
  onCargaMasiva,
}: IndicadoresCardProps) {
  const {
    data,
    loading,
    error,
    progresoGeneral,
    fetchIndicadores,
    patchIndicador,
    removeIndicadorOptimistic,
    addIndicadorOptimistic,
    addObjetivoEspecificoOptimistic,
    setData,
  } = useIndicadores(projectId);
  const [showAgregarModal, setShowAgregarModal] = useState(false);
  const [objetivoEspecificoPreseleccionado, setObjetivoEspecificoPreseleccionado] =
    useState<string | null>(null);
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

  const handleIndicadorUpdated = async (optimistic?: {
    id: string;
    patch: Partial<{
      nombre: string;
      descripcion: string;
      formaCalculo: string;
      formatoNumero: string | null;
      resultadoEsperado: string;
      resultadoAlcanzado: string;
      fechaInicio: string | null;
      fechaFin: string | null;
    }>;
  }) => {
    if (optimistic) {
      patchIndicador(optimistic.id, optimistic.patch);
      setSelectedIndicador((prev) =>
        prev && prev.id === optimistic.id
          ? {
              ...prev,
              ...optimistic.patch,
              formatoNumero:
                optimistic.patch.formatoNumero !== undefined
                  ? optimistic.patch.formatoNumero
                  : prev.formatoNumero,
              fechaInicio:
                optimistic.patch.fechaInicio !== undefined
                  ? optimistic.patch.fechaInicio
                  : prev.fechaInicio,
              fechaFin:
                optimistic.patch.fechaFin !== undefined
                  ? optimistic.patch.fechaFin
                  : prev.fechaFin,
            }
          : prev
      );
    }
    void fetchIndicadores(false);
  };

  const handleDeleteIndicador = async (indicadorId: string) => {
    if (!confirm('¿Eliminar este indicador?')) return;
    const previous = data;
    removeIndicadorOptimistic(indicadorId);
    if (selectedIndicador?.id === indicadorId) setSelectedIndicador(null);

    const result = await deleteIndicador(indicadorId);
    if (result.success) {
      void fetchIndicadores(false);
    } else {
      if (previous) setData(previous);
      alert(result.error || 'Error al eliminar');
    }
  };

  const handleAddObjetivoEspecifico = async (descripcion: string) => {
    const previous = data;
    const tempId = `temp-oe-${Date.now()}`;
    addObjetivoEspecificoOptimistic({
      id: tempId,
      descripcion: descripcion.trim(),
      orden: (data?.objetivosGenerales[0]?.objetivosEspecificos.length ?? 0) + 1,
    });

    const result = await createObjetivoEspecifico(projectId, descripcion);
    if (result.success) {
      void fetchIndicadores(false);
    } else {
      if (previous) setData(previous);
      alert(result.error || 'Error al agregar objetivo específico');
    }
  };

  const handleAgregarIndicadorSuccess = async (created?: {
    objetivoEspecificoId: string;
    indicador: {
      id: string;
      nombre: string;
      descripcion: string;
      formaCalculo: string;
      resultadoEsperado: string;
      formatoNumero?: string | null;
      fechaInicio?: string | null;
      fechaFin?: string | null;
    };
  }) => {
    if (created) {
      const oe = data?.objetivosGenerales
        .flatMap((og) => og.objetivosEspecificos)
        .find((o) => o.id === created.objetivoEspecificoId);
      addIndicadorOptimistic(created.objetivoEspecificoId, {
        id: created.indicador.id,
        nombre: created.indicador.nombre,
        descripcion: created.indicador.descripcion,
        formaCalculo: created.indicador.formaCalculo,
        resultadoEsperado: created.indicador.resultadoEsperado,
        resultadoAlcanzado: '',
        formatoNumero: created.indicador.formatoNumero,
        porcentajeCumplimiento: 0,
        porcentajeAvance: 0,
        fechaInicio: created.indicador.fechaInicio,
        fechaFin: created.indicador.fechaFin,
        comentariosCount: 0,
        objetivoEspecifico: {
          id: created.objetivoEspecificoId,
          descripcion: oe?.descripcion ?? '',
          orden: oe?.orden ?? 0,
        },
      });
    }
    void fetchIndicadores(false);
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

  const tieneAlMenosUnObjetivoEspecifico = objetivosEspecificosForModal.length > 0;

  const handleOpenAgregarIndicador = (objetivoEspecificoId: string) => {
    setObjetivoEspecificoPreseleccionado(objetivoEspecificoId);
    setShowAgregarModal(true);
  };

  const handleCloseAgregarModal = () => {
    setShowAgregarModal(false);
    setObjetivoEspecificoPreseleccionado(null);
  };

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

  usePageTopLoader(loading, {
    completeOnReady: true,
    enabled: topLoaderEnabled,
  });

  if (loading) {
    return <div className="h-full min-h-[120px]" />;
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-3 pl-5 pr-6">
        {data.objetivosGenerales.map((objetivoGeneral, index) => (
          <div
            key={objetivoGeneral.id}
            className={
              index === 0
                ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
                : 'mt-12 shrink-0'
            }
          >
            <ObjetivoGeneralCard
              objetivoGeneral={objetivoGeneral}
              progresoGeneral={progresoGeneral}
              onAddObjetivoEspecifico={
                objetivoGeneral.objetivosEspecificos.length === 0
                  ? handleAddObjetivoEspecifico
                  : undefined
              }
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
              onAddIndicador={
                tieneAlMenosUnObjetivoEspecifico
                  ? handleOpenAgregarIndicador
                  : undefined
              }
              onCargaMasiva={onCargaMasiva}
              canImport={canImport}
              onDeleteIndicador={handleDeleteIndicador}
            />
          </div>
        ))}
      </div>

      {/* Modal para mostrar descripción y forma de cálculo */}
      {selectedIndicador && (
        <IndicadorModal
          indicador={selectedIndicador}
          onClose={() => setSelectedIndicador(null)}
          onUpdate={handleIndicadorUpdated}
          projectId={projectId}
        />
      )}

      {/* Modal para agregar indicador */}
      <AgregarIndicadorModal
        open={showAgregarModal}
        onClose={handleCloseAgregarModal}
        onSuccess={handleAgregarIndicadorSuccess}
        proyectoId={projectId}
        objetivosEspecificos={objetivosEspecificosForModal}
        initialObjetivoEspecificoId={objetivoEspecificoPreseleccionado}
      />
    </div>
  );
}

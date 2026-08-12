'use client';

import { useIndicadores } from '@/hooks/useIndicadores';
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useLayoutEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { Maximize, Minimize } from 'lucide-react';
import { ObjetivoGeneralCard } from './ObjetivoGeneralCard';
import { IndicadorModal } from './IndicadorModal';
import { AgregarIndicadorModal } from './AgregarIndicadorModal';
import { IndicadoresTabLoading } from './IndicadoresTabLoading';
import { deleteIndicador } from '@/lib/actions/indicadores';
import { createObjetivoEspecifico } from '@/lib/actions/proyectos';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FullscreenRecommendHint,
  useFullscreenRecommendHint,
} from '@/components/proyectos/FullscreenRecommendHint';
import { useSidebar } from '@/components/ui/sidebar';

const FS_BTN_SIZE = 40;
const FS_BTN_GAP = 8;
/** Debe cubrir la transición de ancho del sidebar (~200ms). */
const SIDEBAR_LAYOUT_SYNC_MS = 250;

interface IndicadoresFullscreenOverlayProps {
  active: boolean;
  showHint: boolean;
  onToggle: () => void;
}

/** Botón FS en portal fixed: flota encima de la tarjeta OG sin afectar el layout. */
function IndicadoresFullscreenOverlay({
  active,
  showHint,
  onToggle,
}: IndicadoresFullscreenOverlayProps) {
  const { state: sidebarState } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!active || !mounted) {
      setPos(null);
      return;
    }

    const update = () => {
      const og = document.getElementById('tour-indicadores-og');
      if (!og) {
        setPos(null);
        return;
      }
      const rect = og.getBoundingClientRect();
      setPos({
        top: rect.top - FS_BTN_GAP - FS_BTN_SIZE,
        left: rect.left,
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    const og = document.getElementById('tour-indicadores-og');
    const sidebarEl = document.querySelector<HTMLElement>('.peer[data-state]');
    const ro = new ResizeObserver(update);
    if (og) ro.observe(og);
    if (sidebarEl) ro.observe(sidebarEl);

    // El sidebar anima width sin window.resize: seguir el layout unos frames.
    let raf = 0;
    const endAt = performance.now() + SIDEBAR_LAYOUT_SYNC_MS;
    const tick = () => {
      update();
      if (performance.now() < endAt) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [active, mounted, sidebarState]);

  if (!mounted || !active || !pos) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[200] flex items-center gap-2"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="pointer-events-auto">
        <TooltipProvider>
          <FullscreenRecommendHint show={showHint} side="right">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  id="tour-indicadores-fullscreen"
                  onClick={onToggle}
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 shrink-0 rounded-lg transition-all duration-200 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 shadow-sm"
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver en pantalla completa</p>
              </TooltipContent>
            </Tooltip>
          </FullscreenRecommendHint>
        </TooltipProvider>
      </div>
    </div>,
    document.body
  );
}

interface IndicadoresCardProps {
  projectId: string;
  projectName?: string;
  topLoaderEnabled?: boolean;
  canImport?: boolean;
  onCargaMasiva?: () => void;
}

export function IndicadoresCard({
  projectId,
  projectName,
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wantNativeFullscreenRef = useRef(false);
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
      // Solo patch: no refetch aquí. Si se refetch antes de que el server
      // termine el update, la caché vuelve al valor anterior (rebote).
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
      return;
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

  useEffect(() => {
    const onFsChange = () => {
      if (document.fullscreenElement && wantNativeFullscreenRef.current) {
        setIsFullscreen(true);
      } else if (!document.fullscreenElement) {
        wantNativeFullscreenRef.current = false;
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      if (wantNativeFullscreenRef.current && document.fullscreenElement) {
        wantNativeFullscreenRef.current = false;
        void document.exitFullscreen();
      }
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen || document.fullscreenElement) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      wantNativeFullscreenRef.current = false;
      void document.exitFullscreen();
      return;
    }
    if (isFullscreen) {
      setIsFullscreen(false);
      return;
    }
    wantNativeFullscreenRef.current = true;
    void document.documentElement.requestFullscreen().catch(() => {
      wantNativeFullscreenRef.current = false;
      setIsFullscreen(true);
    });
  }, [isFullscreen]);

  const showFullscreenHint = useFullscreenRecommendHint(!loading, {
    active: topLoaderEnabled,
    enabled: !isFullscreen,
  });

  if (loading) {
    return <IndicadoresTabLoading />;
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
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 flex h-full min-h-0 flex-col overflow-hidden bg-white px-10 pb-8 pt-6'
          : 'relative flex h-full min-h-0 flex-col overflow-hidden'
      }
    >
      {!isFullscreen ? (
        <IndicadoresFullscreenOverlay
          active={topLoaderEnabled}
          showHint={showFullscreenHint}
          onToggle={toggleFullscreen}
        />
      ) : (
        <div className="mb-6 flex shrink-0 items-start gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  id="tour-indicadores-fullscreen"
                  onClick={toggleFullscreen}
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 shrink-0 rounded-lg transition-all duration-200 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 shadow-sm"
                >
                  <Minimize className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Salir de pantalla completa</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {projectName ? (
            <h1 className="min-w-0 flex-1 text-2xl font-bold leading-snug text-gray-900">
              {projectName}
            </h1>
          ) : null}
        </div>
      )}

      <div
        className={
          isFullscreen
            ? 'flex min-h-0 flex-1 flex-col overflow-hidden pl-5 pr-6'
            : 'flex min-h-0 flex-1 flex-col overflow-hidden pt-3 pl-5 pr-6'
        }
      >
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

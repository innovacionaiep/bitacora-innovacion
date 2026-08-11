'use client';

import { useState } from 'react';
import { FileSpreadsheet, ListChecks, Plus, Search } from 'lucide-react';
import { IndicadorCard } from './IndicadorCard';
import { IndicadoresAgrupadosCard } from './IndicadoresAgrupadosCard';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
interface ObjetivoEspecificoCardProps {
  objetivoEspecifico: {
    id: string;
    descripcion: string;
    orden: number;
    indicadores: Array<{
      id: string;
      nombre: string;
      descripcion: string;
      formaCalculo: string;
      resultadoEsperado: string;
      resultadoAlcanzado: string;
      formatoNumero?: string | null;
      porcentajeCumplimiento: number;
      porcentajeAvance: number;
      fechaInicio?: string | null;
      fechaFin?: string | null;
      comentariosCount: number;
    }>;
  };
  /** Número de visualización 1-based (Objetivo 1, 2, …) */
  numero: number;
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
  onDeleteIndicador?: (indicadorId: string) => Promise<void>;
  onAddIndicador?: () => void;
  onCargaMasiva?: () => void;
  canImport?: boolean;
  /** Si true, expone anclas del tour (solo el primer OE). */
  tourAnchors?: boolean;
}

export function ObjetivoEspecificoCard({
  objetivoEspecifico,
  numero,
  onIndicadorClick,
  onDeleteIndicador,
  onAddIndicador,
  onCargaMasiva,
  canImport,
  tourAnchors = false,
}: ObjetivoEspecificoCardProps) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  // Calcular el progreso del objetivo específico basado en sus indicadores
  const progresoObjetivo =
    objetivoEspecifico.indicadores.length > 0
      ? Math.round(
          objetivoEspecifico.indicadores.reduce(
            (sum, ind) => sum + ind.porcentajeAvance,
            0
          ) / objetivoEspecifico.indicadores.length
        )
      : 0;

  // Calcular dimensiones para indicadores agrupados
  // Altura aproximada de cada sección de indicador: py-2.5 (20px) + contenido (~50px) + separador (1px) = ~71px
  const alturaPorIndicador = 71;
  const alturaTotalTarjetaAgrupada =
    objetivoEspecifico.indicadores.length > 0
      ? objetivoEspecifico.indicadores.length * alturaPorIndicador - 1 // -1 porque el último no tiene separador
      : 0;

  // Calcular la altura mínima de la tarjeta basada en la cantidad de indicadores
  const alturaBaseObjetivo = 110; // altura base del objetivo

  // Si hay indicadores, calcular la altura mínima necesaria
  // Para un solo indicador: usar altura de tarjeta individual (~90px)
  // Para múltiples indicadores: usar altura de tarjeta agrupada
  const alturaMinima =
    objetivoEspecifico.indicadores.length === 0
      ? alturaBaseObjetivo
      : objetivoEspecifico.indicadores.length === 1
        ? Math.max(alturaBaseObjetivo, 90) // altura aproximada de tarjeta individual
        : Math.max(alturaBaseObjetivo, alturaTotalTarjetaAgrupada);

  // Altura de la línea vertical para múltiples indicadores
  const alturaVertical =
    objetivoEspecifico.indicadores.length > 1
      ? Math.max(
          alturaTotalTarjetaAgrupada - alturaPorIndicador,
          alturaPorIndicador
        )
      : 0;

  return (
    <div className="flex items-stretch gap-6 relative">
      {/* Tarjeta del Objetivo Específico (+ zona hover arriba para acciones externas) */}
      <div className="relative group z-10 flex-shrink-0 rounded-xl pt-10 -mt-10">
        <div
          className="relative z-10 w-[560px] rounded-xl bg-white shadow-md h-full"
          style={{ minHeight: `${alturaMinima}px` }}
        >
          <div className="relative h-full rounded-xl border-2 border-gray-200 text-gray-900 px-6 py-3 flex flex-col justify-center bg-gradient-to-r from-gray-300 via-gray-200 to-gray-100 bg-[linear-gradient(to_right,transparent_0%,rgba(107,114,128,0.05)_50%,transparent_100%),linear-gradient(45deg,transparent_25%,rgba(107,114,128,0.02)_25%,rgba(107,114,128,0.02)_50%,transparent_50%,transparent_75%,rgba(107,114,128,0.02)_75%,rgba(107,114,128,0.02)_100%)] bg-[length:100%_100%,20px_20px]">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center min-w-0">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className="p-1.5 bg-gray-400 rounded-md flex-shrink-0">
                    <ListChecks className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-xs font-semibold text-gray-700 truncate">
                    Objetivo {numero}
                  </div>
                </div>
                {/* Barra de progreso y porcentaje a la derecha con ancho fijo para alineación */}
                <div
                  className="flex items-center space-x-2 flex-shrink-0 ml-2 pr-1"
                  style={{ width: '240px' }}
                >
                  <div className="w-44 bg-gray-200 rounded-full h-2 shadow-inner flex-shrink-0">
                    <div
                      className="bg-gray-500 h-2 rounded-full transition-all duration-300 shadow-sm"
                      style={{ width: `${progresoObjetivo}%` }}
                    ></div>
                  </div>
                  <span className="text-xl font-bold text-gray-600 whitespace-nowrap">
                    {progresoObjetivo}%
                  </span>
                </div>
              </div>
              <h4 className="font-semibold text-[15px] leading-tight text-gray-900">
                {objetivoEspecifico.descripcion}
              </h4>
            </div>
          </div>
        </div>

        {/* Acciones fuera de la tarjeta, arriba a la derecha.
            Visibles en hover; el tour fuerza opacidad vía .driver-active-element. */}
        {(onAddIndicador || (canImport && onCargaMasiva)) && (
          <div
            id={tourAnchors ? 'tour-indicadores-agregar-ind' : undefined}
            className={cn(
              'absolute top-0 right-0 z-20 flex items-center gap-1.5 transition-opacity duration-150',
              addMenuOpen
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100 [&.driver-active-element]:opacity-100 [&:has(.driver-active-element)]:opacity-100'
            )}
          >
            {canImport && onCargaMasiva && onAddIndicador ? (
              <DropdownMenu open={addMenuOpen} onOpenChange={setAddMenuOpen}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 shrink-0 rounded-md border bg-white text-gray-600 border-gray-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200 shadow-sm flex items-center justify-center p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Agregar indicador</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    onClick={() => onAddIndicador()}
                    className="gap-2 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Indicador individual
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    id={tourAnchors ? 'tour-indicadores-carga' : undefined}
                    onClick={() => onCargaMasiva()}
                    className="gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Carga masiva
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : onAddIndicador ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddIndicador();
                      }}
                      className="h-8 w-8 shrink-0 rounded-md border bg-white text-gray-600 border-gray-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200 shadow-sm flex items-center justify-center p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Agregar indicador</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : canImport && onCargaMasiva ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      id={tourAnchors ? 'tour-indicadores-carga' : undefined}
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCargaMasiva();
                      }}
                      className="h-8 rounded-md border bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-blue-700 gap-1.5 px-2.5 shadow-sm"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      <span className="text-[12px] font-medium tracking-wide">
                        Carga masiva
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Carga masiva de indicadores</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
        )}
      </div>

      {/* Indicadores - Se expanden hacia la derecha */}
      {objetivoEspecifico.indicadores.length > 0 && (
        <div
          className="flex flex-col min-w-max relative ml-40 justify-center"
          style={{
            height: `${alturaMinima}px`,
            minHeight: `${alturaMinima}px`,
          }}
        >
          {objetivoEspecifico.indicadores.length === 1 ? (
            // Un solo indicador: conexión simple
            <div className="relative flex items-center gap-3">
              {/* Línea conectora horizontal - desde el borde derecho del objetivo específico hasta la tarjeta del indicador */}
              <div className="absolute left-[-184px] top-1/2 -translate-y-1/2 w-[184px] h-0.5 bg-gray-300 z-0"></div>

              <IndicadorCard
                indicador={{
                  id: objetivoEspecifico.indicadores[0].id,
                  nombre: objetivoEspecifico.indicadores[0].nombre,
                  resultadoEsperado:
                    objetivoEspecifico.indicadores[0].resultadoEsperado,
                  resultadoAlcanzado:
                    objetivoEspecifico.indicadores[0].resultadoAlcanzado,
                  formatoNumero:
                    objetivoEspecifico.indicadores[0].formatoNumero,
                  porcentajeAvance:
                    objetivoEspecifico.indicadores[0].porcentajeAvance,
                  fechaInicio: objetivoEspecifico.indicadores[0].fechaInicio,
                  fechaFin: objetivoEspecifico.indicadores[0].fechaFin,
                }}
                orden={1}
                onDeleteIndicador={onDeleteIndicador}
              />

              {/* Botón Ver Detalles */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() =>
                      onIndicadorClick(objetivoEspecifico.indicadores[0])
                    }
                    className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                    title="Ver detalles"
                  >
                    <Search className="h-5 w-5 text-gray-700" />
                  </button>
                  {objetivoEspecifico.indicadores[0].comentariosCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-semibold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                      {objetivoEspecifico.indicadores[0].comentariosCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Múltiples indicadores: conexión simple centrada
            <div className="relative flex items-center gap-3">
              {/* Línea conectora horizontal - desde el borde derecho del objetivo específico hasta la tarjeta agrupada */}
              <div className="absolute left-[-184px] top-1/2 -translate-y-1/2 w-[184px] h-0.5 bg-gray-300 z-0"></div>

              {/* Tarjeta agrupada de indicadores */}
              <div className="relative z-10">
                <IndicadoresAgrupadosCard
                  indicadores={objetivoEspecifico.indicadores.map(
                    (ind, idx) => ({
                      ...ind,
                      orden: idx + 1,
                    })
                  )}
                  indicadoresCompletos={objetivoEspecifico.indicadores}
                  onIndicadorClick={onIndicadorClick}
                  onDeleteIndicador={onDeleteIndicador}
                />
              </div>

              {/* Botones Ver Detalles - uno por cada indicador */}
              <div className="flex flex-col gap-3 justify-center">
                {objetivoEspecifico.indicadores.map((indicador) => (
                  <div
                    key={indicador.id}
                    className="flex-shrink-0 flex items-center gap-2"
                  >
                    <div className="relative">
                      <button
                        onClick={() => onIndicadorClick(indicador)}
                        className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                        title="Ver detalles"
                      >
                        <Search className="h-5 w-5 text-gray-700" />
                      </button>
                      {indicador.comentariosCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-semibold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                          {indicador.comentariosCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

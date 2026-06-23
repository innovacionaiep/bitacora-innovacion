'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MultiSelectNombres } from '@/components/ui/multi-select-nombres';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  X,
  Pencil,
  Video,
  MapPin,
  GraduationCap,
  BookOpen,
  Building2,
  UsersRound,
  Crosshair,
  ListChecks,
  History,
  AlertCircle,
  Lightbulb,
  Heart,
  Zap,
  TrendingUp,
  Globe,
  Target,
  BarChart3,
  Users,
} from 'lucide-react';
import type { ProyectoWithRelations } from '@/types/proyecto';
import {
  extractYouTubeVideoId,
  type GeneralDraft,
} from './general-tab-utils';
import { GeneralTabTextarea } from './GeneralTabTextarea';
import type { UseGeneralTabReturn } from './useGeneralTab';

type ProyectoTabName =
  | 'Resumen'
  | 'General'
  | 'Participantes'
  | 'Gantt'
  | 'Indicadores'
  | 'Presupuesto'
  | 'Historial'
  | 'Seguimiento';

export function GeneralTabHeader({
  project,
  selectedTab,
  truncateTitle,
  isGeneralEditMode,
  generalDraft,
  setGeneralDraft,
  isGeneralSaving,
  handleToggleGeneralEditMode,
  handleSaveGeneralTab,
  handleCancelGeneralEdit,
}: {
  project: ProyectoWithRelations;
  selectedTab: ProyectoTabName;
  truncateTitle: (title: string, maxLength?: number) => string;
} & Pick<
  UseGeneralTabReturn,
  | 'isGeneralEditMode'
  | 'generalDraft'
  | 'setGeneralDraft'
  | 'isGeneralSaving'
  | 'handleToggleGeneralEditMode'
  | 'handleSaveGeneralTab'
  | 'handleCancelGeneralEdit'
>) {
  return (
    <>
      {isGeneralEditMode ? (
        <Input
          value={generalDraft?.proyecto ?? ''}
          onChange={(e) =>
            setGeneralDraft((prev) =>
              prev ? { ...prev, proyecto: e.target.value } : prev
            )
          }
          className="h-10 text-4xl font-bold text-gray-900 px-3 py-2 border-2 border-gray-300 rounded-lg w-fit min-w-[720px]"
        />
      ) : (
        <h1 className="text-4xl font-bold text-gray-900 truncate">
          {truncateTitle(project.proyecto)}
        </h1>
      )}
      {selectedTab === 'General' && !isGeneralEditMode && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={handleToggleGeneralEditMode}
                variant="ghost"
                size="sm"
                className="h-10 w-10 shrink-0 rounded-lg transition-all duration-200 flex items-center justify-center border shadow-sm ml-1 bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Editar información general</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {selectedTab === 'General' && isGeneralEditMode && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={handleSaveGeneralTab}
                variant="ghost"
                size="sm"
                disabled={isGeneralSaving}
                className="h-10 w-10 shrink-0 rounded-lg transition-all duration-200 flex items-center justify-center border shadow-sm bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Guardar cambios</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={handleCancelGeneralEdit}
                variant="ghost"
                size="sm"
                className="h-10 w-10 shrink-0 rounded-lg transition-all duration-200 flex items-center justify-center border shadow-sm bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cancelar edición</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </>
  );
}

export function GeneralTab({
  project,
  projectVideos,
  isGeneralEditMode,
  generalDraft,
  setGeneralDraft,
  catalogosGeneral,
  tempVideoUrl,
  setTempVideoUrl,
  activeDesarrolloTecnicoTab,
  setActiveDesarrolloTecnicoTab,
}: {
  project: ProyectoWithRelations;
  projectVideos: Record<string, string>;
} & Pick<
  UseGeneralTabReturn,
  | 'isGeneralEditMode'
  | 'generalDraft'
  | 'setGeneralDraft'
  | 'catalogosGeneral'
  | 'tempVideoUrl'
  | 'setTempVideoUrl'
  | 'activeDesarrolloTecnicoTab'
  | 'setActiveDesarrolloTecnicoTab'
>) {
  return (
                <div className="h-full overflow-hidden pt-4">
                  <div className="grid grid-cols-1 xl:grid-cols-[0.85fr_0.80fr_1.00fr] h-full">
                    {/* Columna izquierda: Objetivos + Video */}
                    <div className="h-full flex flex-col pr-6 xl:pr-8 xl:border-r xl:border-gray-200 overflow-hidden">
                      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                        <div className="space-y-6">
                          {/* Objetivos */}
                          {(() => {
                            const objetivos =
                              project.objetivos_rel || [];
                            const objetivoGeneral = objetivos.find(
                              (obj) => obj.tipo === 'General'
                            );
                            const objetivosEspecificos = objetivos
                              .filter((obj) => obj.tipo === 'Especifico')
                              .sort((a, b) => a.orden - b.orden);

                            return (
                              <div className="space-y-8">
                                {/* Objetivo General */}
                                {objetivoGeneral && (
                                  <div className="space-y-3">
                                    <div className="bg-gradient-to-r from-gray-200 to-white px-3 py-2 rounded-lg flex items-center space-x-2.5">
                                      <Crosshair className="h-5 w-5 text-emerald-600" />
                                      <h4 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                                        Objetivo General
                                      </h4>
                                    </div>
                                    <div className="border-l-4 border-emerald-600 bg-gradient-to-r from-emerald-50 via-white to-gray-50 rounded-r-lg shadow-md hover:shadow-lg transition-shadow duration-200">
                                      <div className="py-4 px-6">
                                        {isGeneralEditMode ? (
                                          <GeneralTabTextarea
                                            value={
                                              generalDraft?.objetivoGeneral ??
                                              ''
                                            }
                                            onChange={(e) =>
                                              setGeneralDraft((prev) =>
                                                prev
                                                  ? {
                                                      ...prev,
                                                      objetivoGeneral:
                                                        e.target.value,
                                                    }
                                                  : prev
                                              )
                                            }
                                            className="text-base border-2 border-emerald-200 focus:border-emerald-400 bg-white"
                                          />
                                        ) : (
                                          <p className="text-gray-800 leading-loose text-base">
                                            {objetivoGeneral.descripcion}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Objetivos Específicos: mostrar si hay alguno o si estamos en modo edición (para poder agregar) */}
                                {(objetivosEspecificos.length > 0 || isGeneralEditMode) && (
                                  <div className="space-y-6">
                                    <div className="sticky top-0 z-10 bg-gradient-to-r from-gray-200 to-white px-3 py-2 rounded-lg flex items-center justify-between">
                                      <div className="flex items-center space-x-2.5">
                                        <ListChecks className="h-5 w-5 text-emerald-600" />
                                        <h4 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                                          Objetivos Específicos
                                        </h4>
                                      </div>
                                      {isGeneralEditMode && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                          onClick={() =>
                                            setGeneralDraft((prev) => {
                                              if (!prev) return prev;
                                              const nextOrden = prev.objetivosEspecificos.length;
                                              return {
                                                ...prev,
                                                objetivosEspecificos: [
                                                  ...prev.objetivosEspecificos,
                                                  {
                                                    id: `temp-${Date.now()}-${nextOrden}`,
                                                    descripcion: '',
                                                    orden: nextOrden,
                                                  },
                                                ],
                                              };
                                            })
                                          }
                                        >
                                          <Plus className="h-4 w-4 mr-1.5" />
                                          Agregar objetivo específico
                                        </Button>
                                      )}
                                    </div>
                                    <div className="ml-8 space-y-6">
                                      {(isGeneralEditMode
                                        ? generalDraft?.objetivosEspecificos ?? []
                                        : objetivosEspecificos
                                      ).map((objetivo, index) => (
                                        <div
                                          key={objetivo.id}
                                          className="flex items-start space-x-4 gap-2"
                                        >
                                          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                                            {index + 1}
                                          </div>
                                          {isGeneralEditMode ? (
                                            <>
                                              <GeneralTabTextarea
                                                value={
                                                  generalDraft
                                                    ?.objetivosEspecificos?.[
                                                    index
                                                  ]?.descripcion ?? ''
                                                }
                                                onChange={(e) =>
                                                  setGeneralDraft((prev) =>
                                                    prev
                                                      ? {
                                                          ...prev,
                                                          objetivosEspecificos:
                                                            prev.objetivosEspecificos.map(
                                                              (item, idx) =>
                                                                idx === index
                                                                  ? {
                                                                      ...item,
                                                                      descripcion:
                                                                        e.target
                                                                          .value,
                                                                    }
                                                                  : item
                                                            ),
                                                        }
                                                      : prev
                                                  )
                                                }
                                                className="text-[15px] border-2 border-emerald-200 focus:border-emerald-400 bg-white flex-1 min-w-0"
                                              />
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="shrink-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() =>
                                                  setGeneralDraft((prev) => {
                                                    if (!prev) return prev;
                                                    const next = prev.objetivosEspecificos.filter(
                                                      (_, i) => i !== index
                                                    );
                                                    return {
                                                      ...prev,
                                                      objetivosEspecificos: next.map(
                                                        (o, i) => ({
                                                          ...o,
                                                          orden: i,
                                                        })
                                                      ),
                                                    };
                                                  })
                                                }
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </>
                                          ) : (
                                            <p className="text-gray-800 leading-relaxed flex-1 text-[15px] pt-0.5">
                                              {objetivo.descripcion}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {objetivos.length === 0 && (
                                  <div className="text-center py-12 text-gray-500">
                                    <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                                    <p className="text-base">
                                      No hay objetivos definidos para este
                                      proyecto
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Video del Proyecto */}
                          <div className="space-y-4 pt-8">
                            {isGeneralEditMode && (
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700">
                                  URL del video (YouTube)
                                </Label>
                                <Input
                                  value={tempVideoUrl}
                                  onChange={(e) =>
                                    setTempVideoUrl(e.target.value)
                                  }
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  className="border-2 border-gray-300 rounded-lg focus:border-blue-500"
                                />
                              </div>
                            )}
                            {(() => {
                              const projVideo = (project as ProyectoWithRelations & { youtubeUrl?: string | null }).youtubeUrl ?? projectVideos[project.id] ?? '';
                              const activeVideoUrl = isGeneralEditMode ? tempVideoUrl : projVideo;
                              const videoId = activeVideoUrl
                                ? extractYouTubeVideoId(activeVideoUrl)
                                : null;
                              if (!videoId) {
                                return (
                                  <div className="text-center py-10 text-gray-500">
                                    <Video className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                                    <p>Sin video asignado</p>
                                  </div>
                                );
                              }
                              return (
                                <div
                                  className="relative w-full max-w-[60%] mx-auto"
                                  style={{ paddingBottom: '35%' }}
                                >
                                  <iframe
                                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                                    src={`https://www.youtube.com/embed/${videoId}`}
                                    title="Video del Proyecto"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Columna central: Información Básica */}
                    <div className="h-full flex flex-col px-6 xl:px-8 xl:border-r xl:border-gray-200 overflow-hidden">
                      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                        <div className="space-y-2">
                          <div className="sticky top-0 z-10 bg-white pb-2">
                            {/* Título: Información Básica */}
                            <div className="bg-gradient-to-r from-gray-200 to-white px-3 py-2 rounded-lg flex items-center space-x-2.5 mb-2">
                              <FileText className="h-5 w-5 text-emerald-600" />
                              <h4 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                                Información Básica
                              </h4>
                            </div>
                          </div>

                          {/* Contenido completo */}
                          <div className="space-y-4">
                            {/* Sección 1: Contribución Local */}
                            <div className="mb-4">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-xs font-semibold text-gray-400 tracking-wider pr-4">
                                  Contribución Local
                                </span>
                                <div className="h-px bg-gray-200 flex-1"></div>
                              </div>
                              <div className="grid grid-cols-1 gap-4">
                                {/* Sedes */}
                                <div className="border-l-4 border-emerald-500 pl-4 py-2">
                                  <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="h-4 w-4 text-emerald-600" />
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                      Sedes
                                    </h3>
                                  </div>
                                  <div className="flex flex-wrap gap-3">
                                    {isGeneralEditMode ? (
                                      <MultiSelectNombres
                                        options={catalogosGeneral.sedes.map(
                                          (s) => ({
                                            id: s.id,
                                            nombre: s.nombre,
                                          })
                                        )}
                                        value={generalDraft?.sede ?? ''}
                                        onChange={(v) =>
                                          setGeneralDraft((prev) =>
                                            prev ? { ...prev, sede: v } : prev
                                          )
                                        }
                                        placeholder="Seleccionar sedes"
                                      />
                                    ) : (
                                      <>
                                        {(project.sede ?? '')
                                          .split(/\s*\|\s*|\s*,\s*/)
                                          .map((s) => s.trim())
                                          .filter(Boolean)
                                          .map((sedeNombre, idx) => (
                                            <Badge
                                              key={idx}
                                              variant="secondary"
                                              className="text-base font-normal bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                                            >
                                              {sedeNombre}
                                            </Badge>
                                          ))}
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Comunas */}
                                {(isGeneralEditMode ||
                                  (project.comunas &&
                                    project.comunas.length > 0)) && (
                                  <div className="border-l-4 border-emerald-500 pl-4 py-2">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Building2 className="h-4 w-4 text-emerald-600" />
                                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Comunas
                                      </h3>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                      {isGeneralEditMode ? (
                                        <MultiSelectNombres
                                          options={catalogosGeneral.comunas}
                                          value={
                                            generalDraft?.comunasTexto ?? ''
                                          }
                                          onChange={(v) =>
                                            setGeneralDraft((prev) =>
                                              prev
                                                ? { ...prev, comunasTexto: v }
                                                : prev
                                            )
                                          }
                                          placeholder="Seleccionar comunas"
                                        />
                                      ) : (
                                        project.comunas.map(
                                          (comunaRel, idx) => (
                                            <Badge
                                              key={idx}
                                              variant="outline"
                                              className="text-base font-normal bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300"
                                            >
                                              {comunaRel.comuna.nombre}
                                            </Badge>
                                          )
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Sección 2: Contribución Disciplinar */}
                            <div className="mb-4">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-xs font-semibold text-gray-400 tracking-wider pr-4">
                                  Contribución Disciplinar
                                </span>
                                <div className="h-px bg-gray-200 flex-1"></div>
                              </div>
                              <div className="grid grid-cols-1 gap-4">
                                {/* Escuelas */}
                                {(isGeneralEditMode ||
                                  (project.escuelas &&
                                    project.escuelas.length > 0)) && (
                                  <div className="border-l-4 border-emerald-500 pl-4 py-2">
                                    <div className="flex items-center gap-2 mb-2">
                                      <GraduationCap className="h-4 w-4 text-emerald-600" />
                                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Escuelas
                                      </h3>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                      {isGeneralEditMode ? (
                                        <MultiSelectNombres
                                          options={catalogosGeneral.escuelas}
                                          value={
                                            generalDraft?.escuelasTexto ?? ''
                                          }
                                          onChange={(v) =>
                                            setGeneralDraft((prev) =>
                                              prev
                                                ? { ...prev, escuelasTexto: v }
                                                : prev
                                            )
                                          }
                                          placeholder="Seleccionar escuelas"
                                        />
                                      ) : (
                                        project.escuelas.map(
                                          (escuelaRel, idx) => (
                                            <Badge
                                              key={idx}
                                              variant="secondary"
                                              className="text-base font-normal bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                                            >
                                              {escuelaRel.escuela.nombre}
                                            </Badge>
                                          )
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Carreras */}
                                {(isGeneralEditMode ||
                                  (project.carreras &&
                                    project.carreras.length > 0)) && (
                                  <div className="border-l-4 border-emerald-500 pl-4 py-2">
                                    <div className="flex items-center gap-2 mb-2">
                                      <BookOpen className="h-4 w-4 text-emerald-600" />
                                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Carreras
                                      </h3>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                      {isGeneralEditMode ? (
                                        <MultiSelectNombres
                                          options={catalogosGeneral.carreras}
                                          value={
                                            generalDraft?.carrerasTexto ?? ''
                                          }
                                          onChange={(v) =>
                                            setGeneralDraft((prev) =>
                                              prev
                                                ? { ...prev, carrerasTexto: v }
                                                : prev
                                            )
                                          }
                                          placeholder="Seleccionar carreras"
                                        />
                                      ) : (
                                        project.carreras.map(
                                          (carreraRel, idx) => (
                                            <Badge
                                              key={idx}
                                              variant="outline"
                                              className="text-base font-normal bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300"
                                            >
                                              {carreraRel.carrera.nombre}
                                            </Badge>
                                          )
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Sección 3: Contribución Comunitaria */}
                            <div className="mb-4">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-xs font-semibold text-gray-400 tracking-wider pr-4">
                                  Contribución Comunitaria
                                </span>
                                <div className="h-px bg-gray-200 flex-1"></div>
                              </div>
                              <div className="grid grid-cols-1 gap-4">
                                {/* Grupos de Interés */}
                                {(isGeneralEditMode ||
                                  (project.gruposInteres &&
                                    project.gruposInteres.length >
                                      0)) && (
                                  <div className="border-l-4 border-emerald-500 pl-4 py-2">
                                    <div className="flex items-center gap-2 mb-2">
                                      <UsersRound className="h-4 w-4 text-emerald-600" />
                                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Grupos de Interés
                                      </h3>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                      {isGeneralEditMode ? (
                                        <MultiSelectNombres
                                          options={
                                            catalogosGeneral.gruposInteres
                                          }
                                          value={
                                            generalDraft?.gruposInteresTexto ??
                                            ''
                                          }
                                          onChange={(v) =>
                                            setGeneralDraft((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    gruposInteresTexto: v,
                                                  }
                                                : prev
                                            )
                                          }
                                          placeholder="Seleccionar grupos de interés"
                                        />
                                      ) : (
                                        project.gruposInteres.map(
                                          (grupoRel, idx) => (
                                            <Badge
                                              key={idx}
                                              variant="outline"
                                              className="text-base font-normal bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300"
                                            >
                                              {grupoRel.grupoInteres.nombre}
                                            </Badge>
                                          )
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Columna derecha: Desarrollo Técnico */}
                    <div className="h-full flex flex-col pl-6 xl:pl-8 overflow-hidden">
                      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                        {(() => {
                          const desarrolloTecnico = isGeneralEditMode
                            ? generalDraft?.desarrolloTecnico
                            : project.desarrolloTecnico;

                          if (!desarrolloTecnico && !isGeneralEditMode) {
                            return (
                              <div className="text-center py-8 text-gray-500">
                                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p>
                                  Información de desarrollo técnico no
                                  disponible
                                </p>
                              </div>
                            );
                          }

                          const sections = [
                            {
                              key: 'continuidad',
                              title: 'Continuidad de Fases Anteriores',
                              content:
                                desarrolloTecnico?.continuidadFasesAnteriores ??
                                '',
                              icon: <History className="h-4 w-4" />,
                              group: 'fases-anteriores',
                              field: 'continuidadFasesAnteriores',
                            },
                            {
                              key: 'pertinenciaLocal',
                              title: 'Pertinencia Local',
                              content:
                                desarrolloTecnico?.pertinenciaLocal ?? '',
                              icon: <MapPin className="h-4 w-4" />,
                              group: 'impacto',
                              field: 'pertinenciaLocal',
                            },
                            {
                              key: 'pertinenciaDisciplinar',
                              title: 'Pertinencia Disciplinar',
                              content:
                                desarrolloTecnico?.pertinenciaDisciplinar ?? '',
                              icon: <GraduationCap className="h-4 w-4" />,
                              group: 'impacto',
                              field: 'pertinenciaDisciplinar',
                            },
                            {
                              key: 'ejesImpacto',
                              title: 'Ejes de Impacto',
                              content: desarrolloTecnico?.ejesImpacto ?? '',
                              icon: <Zap className="h-4 w-4" />,
                              group: 'impacto',
                              field: 'ejesImpacto',
                            },
                            {
                              key: 'publicoObjetivo',
                              title: 'Público Objetivo',
                              content: desarrolloTecnico?.publicoObjetivo ?? '',
                              icon: <Users className="h-4 w-4" />,
                              group: 'publico-objetivo',
                              field: 'publicoObjetivo',
                            },
                            {
                              key: 'genero',
                              title: 'Perspectiva de Género',
                              content:
                                desarrolloTecnico?.perspectiveGenero ?? '',
                              icon: <Heart className="h-4 w-4" />,
                              group: 'publico-objetivo',
                              field: 'perspectiveGenero',
                            },
                            {
                              key: 'necesidad',
                              title: 'Necesidad, Problema u Oportunidad',
                              content:
                                desarrolloTecnico?.necesidadProblema ?? '',
                              icon: <AlertCircle className="h-4 w-4" />,
                              group: 'innovacion-escalabilidad',
                              field: 'necesidadProblema',
                            },
                            {
                              key: 'solucion',
                              title: 'Solución y Nivel de Avance',
                              content: desarrolloTecnico?.solucionAvance ?? '',
                              icon: <Lightbulb className="h-4 w-4" />,
                              group: 'innovacion-escalabilidad',
                              field: 'solucionAvance',
                            },
                            {
                              key: 'factorInnovador',
                              title: 'Factor Innovador',
                              content: desarrolloTecnico?.factorInnovador ?? '',
                              icon: <TrendingUp className="h-4 w-4" />,
                              group: 'innovacion-escalabilidad',
                              field: 'factorInnovador',
                            },
                            {
                              key: 'escalabilidad',
                              title: 'Escalabilidad',
                              content: desarrolloTecnico?.escalabilidad ?? '',
                              icon: <Globe className="h-4 w-4" />,
                              group: 'escalabilidad',
                              field: 'escalabilidad',
                            },
                            {
                              key: 'resultados',
                              title: 'Resultados y Contribución Esperada',
                              content:
                                desarrolloTecnico?.resultadosContribucion ?? '',
                              icon: <Target className="h-4 w-4" />,
                              group: 'resultados',
                              field: 'resultadosContribucion',
                            },
                            {
                              key: 'metodologia',
                              title: 'Metodología de Medición',
                              content:
                                desarrolloTecnico?.metodologiaMedicion ?? '',
                              icon: <BarChart3 className="h-4 w-4" />,
                              group: 'resultados',
                              field: 'metodologiaMedicion',
                            },
                          ];

                          const tabs = [
                            {
                              id: 'fases-anteriores',
                              label: 'Fases anteriores',
                            },
                            { id: 'impacto', label: 'Impacto' },
                            {
                              id: 'publico-objetivo',
                              label: 'Público Objetivo',
                            },
                            {
                              id: 'innovacion-escalabilidad',
                              label: 'Innovación',
                            },
                            { id: 'escalabilidad', label: 'Escalabilidad' },
                            { id: 'resultados', label: 'Resultados' },
                          ];

                          const activeSections = sections.filter(
                            (section) =>
                              section.group === activeDesarrolloTecnicoTab &&
                              (isGeneralEditMode
                                ? true
                                : section.content &&
                                  section.content.trim() !== '')
                          );

                          return (
                            <div className="space-y-4">
                              <div className="sticky top-0 z-10 bg-white pb-2">
                                <div className="bg-gradient-to-r from-gray-200 to-white px-3 py-2 rounded-lg flex items-center space-x-2.5 mb-4">
                                  <FileText className="h-5 w-5 text-emerald-600" />
                                  <h4 className="text-base font-semibold text-gray-600 uppercase tracking-wide">
                                    Desarrollo Técnico
                                  </h4>
                                </div>

                                {/* Tabs */}
                                <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
                                  {tabs.map((tab) => {
                                    if (!isGeneralEditMode) {
                                      const tabSections = sections.filter(
                                        (s) =>
                                          s.group === tab.id &&
                                          s.content &&
                                          s.content.trim() !== ''
                                      );
                                      if (tabSections.length === 0) return null;
                                    }

                                    return (
                                      <button
                                        key={tab.id}
                                        onClick={() =>
                                          setActiveDesarrolloTecnicoTab(tab.id)
                                        }
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                          activeDesarrolloTecnicoTab === tab.id
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                      >
                                        {tab.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Contenido del tab activo */}
                              <div className="space-y-3">
                                {activeSections.length > 0 ? (
                                  activeSections.map((section) => (
                                    <div key={section.key}>
                                      <div className="px-2 py-2 flex items-center gap-2">
                                        <div className="text-emerald-600">
                                          {section.icon}
                                        </div>
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                          {section.title}
                                        </h4>
                                      </div>
                                      <div className="px-2 pb-3">
                                        {isGeneralEditMode ? (
                                          <GeneralTabTextarea
                                            value={section.content}
                                            onChange={(e) =>
                                              setGeneralDraft((prev) =>
                                                prev
                                                  ? {
                                                      ...prev,
                                                      desarrolloTecnico: {
                                                        ...prev.desarrolloTecnico,
                                                        [section.field as keyof GeneralDraft['desarrolloTecnico']]:
                                                          e.target.value,
                                                      },
                                                    }
                                                  : prev
                                              )
                                            }
                                            className="text-[15px] border-2 border-gray-200 focus:border-emerald-400 bg-white"
                                          />
                                        ) : (
                                          <div className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                                            {section.content}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-8 text-gray-500">
                                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                    <p>
                                      No hay información disponible en esta
                                      categoría
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
  );
}

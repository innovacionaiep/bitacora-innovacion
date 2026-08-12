'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MultiSelectNombres } from '@/components/ui/multi-select-nombres';
import {
  Plus,
  Trash2,
  Save,
  X,
  Pencil,
  Crosshair,
  Target,
  Video,
  ExternalLink,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { ProyectoWithRelations } from '@/types/proyecto';
import { detectVimeoIsVertical } from '@/lib/video-url';
import {
  isLegacyDtFieldKey,
  parseProjectVideoUrl,
  type DesarrolloTecnicoFieldKey,
  type GeneralFieldId,
} from './general-tab-utils';
import { GeneralTabTextarea } from './GeneralTabTextarea';
import type { UseGeneralTabReturn } from './useGeneralTab';
import { IconByName } from '@/components/config/IconByName';
import { useDesarrolloTecnicoConfigQuery } from '@/hooks/useDesarrolloTecnicoConfig';
import { useEditarSociosComunitarios } from './useEditarSociosComunitarios';
import { EditarSociosComunitariosDialog } from '@/components/proyectos/EditarSociosComunitariosDialog';

/** Iconos por defecto (alineados al seed / ajustes) si aún no carga la config. */
const DEFAULT_DT_ICONS: Record<DesarrolloTecnicoFieldKey, string> = {
  continuidadFasesAnteriores: 'History',
  pertinenciaLocal: 'MapPin',
  pertinenciaDisciplinar: 'GraduationCap',
  ejesImpacto: 'Zap',
  publicoObjetivo: 'Users',
  perspectiveGenero: 'Heart',
  necesidadProblema: 'AlertCircle',
  solucionAvance: 'Lightbulb',
  factorInnovador: 'TrendingUp',
  escalabilidad: 'Globe',
  resultadosContribucion: 'Target',
  metodologiaMedicion: 'BarChart3',
};

/** Nombres por defecto; se reemplazan con los de Configuración → Desarrollo técnico. */
const DEFAULT_DT_LABELS: Record<DesarrolloTecnicoFieldKey, string> = {
  continuidadFasesAnteriores: 'Continuidad de Fases Anteriores',
  pertinenciaLocal: 'Pertinencia Local',
  pertinenciaDisciplinar: 'Pertinencia Disciplinar',
  ejesImpacto: 'Ejes de Impacto',
  publicoObjetivo: 'Público Objetivo',
  perspectiveGenero: 'Perspectiva de Género',
  necesidadProblema: 'Necesidad, Problema u Oportunidad',
  solucionAvance: 'Solución y Nivel de Avance',
  factorInnovador: 'Factor Innovador',
  escalabilidad: 'Escalabilidad',
  resultadosContribucion: 'Resultados y Contribución Esperada',
  metodologiaMedicion: 'Metodología de Medición',
};

const DT_FIELD_SECTION_IDS: Record<DesarrolloTecnicoFieldKey, string> = {
  continuidadFasesAnteriores: 'dt-continuidad',
  pertinenciaLocal: 'dt-pertinencia-local',
  pertinenciaDisciplinar: 'dt-pertinencia-disciplinar',
  ejesImpacto: 'dt-ejes-impacto',
  publicoObjetivo: 'dt-publico-objetivo',
  perspectiveGenero: 'dt-genero',
  necesidadProblema: 'dt-necesidad',
  solucionAvance: 'dt-solucion',
  factorInnovador: 'dt-factor-innovador',
  escalabilidad: 'dt-escalabilidad',
  resultadosContribucion: 'dt-resultados',
  metodologiaMedicion: 'dt-metodologia',
};

type DtConfigSection = {
  subcategoriaId: string;
  sectionId: string;
  title: string;
  icono: string;
  campoKey: DesarrolloTecnicoFieldKey | null;
  fieldId: GeneralFieldId;
};

const FALLBACK_DT_SECTIONS: DtConfigSection[] = (
  Object.keys(DEFAULT_DT_LABELS) as DesarrolloTecnicoFieldKey[]
).map((field) => ({
  subcategoriaId: `legacy-${field}`,
  sectionId: DT_FIELD_SECTION_IDS[field],
  title: DEFAULT_DT_LABELS[field],
  icono: DEFAULT_DT_ICONS[field],
  campoKey: field,
  fieldId: `dt.${field}`,
}));

type TocItem = {
  id: string;
  label: string;
};

const TOC_PREFIX: TocItem[] = [
  { id: 'objetivo-general', label: 'Objetivo General' },
  { id: 'objetivos-especificos', label: 'Objetivos Específicos' },
  { id: 'video', label: 'Video' },
];

type ProyectoTabName =
  | 'Convenio'
  | 'Resumen'
  | 'General'
  | 'Participantes'
  | 'Gantt'
  | 'Indicadores'
  | 'Presupuesto'
  | 'Historial'
  | 'Seguimiento'
  | 'Escalamiento';

function FieldSaveCancel({
  isSaving,
  onSave,
  onCancel,
}: {
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-4 mt-2">
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="inline-flex items-center gap-1 text-[13px] font-normal text-gray-900 hover:text-emerald-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
      >
        <Save className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        Guardar
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-1 text-[13px] font-normal text-gray-500 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
      >
        <X className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        Cancelar
      </button>
    </div>
  );
}

function HoverEditButton({
  onClick,
  tooltip = 'Editar',
  className = 'right-0 top-0',
}: {
  onClick: () => void;
  tooltip?: string;
  /** Posición absoluta del wrapper (el botón no reserva espacio en el layout). */
  className?: string;
}) {
  return (
    <div className={`absolute z-10 ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onClick}
              className="h-7 w-7 shrink-0 rounded-sm opacity-0 group-hover/field:opacity-100 focus-visible:opacity-100 transition-opacity duration-150 flex items-center justify-center text-gray-400 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
              aria-label={tooltip}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function ProjectVideoExternalLink({
  url,
  title,
  providerLabel,
}: {
  url: string;
  title?: string;
  providerLabel: string;
}) {
  return (
    <div className="w-full max-w-[80%] mx-auto rounded-md border border-gray-200 bg-gray-50/80 px-5 py-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-gray-800">
            <Video className="h-4 w-4 shrink-0 text-gray-500" strokeWidth={1.75} />
            <p className="text-[14px] font-medium truncate">
              {title?.trim() || `Video en ${providerLabel}`}
            </p>
          </div>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            {providerLabel} no permite reproducir este video dentro de la app
            (requiere inicio de sesión de Microsoft). Ábrelo en una pestaña
            nueva.
          </p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-gray-900 px-3 py-2 text-[13px] font-medium text-white hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        >
          Abrir video
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
        </a>
      </div>
    </div>
  );
}

function ProjectVideoEmbed({ url }: { url: string }) {
  const parsed = parseProjectVideoUrl(url);
  const [isVertical, setIsVertical] = useState(Boolean(parsed?.isShort));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!parsed) {
      setIsVertical(false);
      return;
    }
    if (parsed.isShort) {
      setIsVertical(true);
      return;
    }
    if (
      parsed.provider !== 'vimeo' &&
      parsed.provider !== 'google-drive'
    ) {
      setIsVertical(false);
      return;
    }

    let cancelled = false;
    setIsVertical(false);

    // Vimeo: oEmbed directo en cliente (CORS *). Evita depender de
    // /api/video-orientation (auth middleware / fallos cacheados en servidor).
    if (parsed.provider === 'vimeo' && parsed.pageUrl) {
      void detectVimeoIsVertical(parsed.pageUrl)
        .then((vertical) => {
          if (!cancelled && vertical) setIsVertical(true);
        })
        .catch(() => {
          /* landscape por defecto */
        });
    }

    // Drive: API (sharp + letterbox) + fallback Image() si la thumb ya es portrait.
    if (parsed.provider === 'google-drive') {
      const params = new URLSearchParams({ url });
      void fetch(`/api/video-orientation?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { vertical?: boolean } | null) => {
          if (!cancelled && data?.vertical) setIsVertical(true);
        })
        .catch(() => {
          /* landscape por defecto */
        });

      if (parsed.videoId) {
        const img = new Image();
        img.onload = () => {
          if (
            !cancelled &&
            img.naturalHeight > img.naturalWidth &&
            img.naturalWidth > 0
          ) {
            setIsVertical(true);
          }
        };
        img.src = `https://drive.google.com/thumbnail?id=${encodeURIComponent(parsed.videoId)}&sz=w1000`;
      }
    }

    return () => {
      cancelled = true;
    };
  }, [url, parsed?.provider, parsed?.isShort, parsed?.videoId, parsed?.pageUrl]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(document.fullscreenElement === stageRef.current);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen().catch(() => {
        /* navegador puede bloquear fullscreen */
      });
    }
  }, []);

  if (!parsed) return null;

  if (parsed.externalOnly) {
    const openUrl = parsed.pageUrl || parsed.embedUrl || url;
    const providerLabel =
      parsed.provider === 'sharepoint' ? 'SharePoint / Stream' : 'el proveedor';
    return (
      <ProjectVideoExternalLink
        url={openUrl}
        title={parsed.title}
        providerLabel={providerLabel}
      />
    );
  }

  const isDriveVertical =
    isVertical && parsed.provider === 'google-drive';
  const openUrl = parsed.pageUrl || parsed.embedUrl || url;

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden">
      <div
        ref={stageRef}
        className={
          isVertical
            ? 'relative w-full max-w-[240px] mx-auto aspect-[9/16] bg-black rounded-md overflow-hidden isolate'
            : 'relative w-full max-w-full sm:max-w-[min(100%,36rem)] mx-auto aspect-video bg-black rounded-md overflow-hidden isolate'
        }
      >
        <iframe
          className={
            isDriveVertical
              ? // Preview Drive 16:9 con vertical al centro: ensanchar y subir un poco
                // para llenar 9:16 y ocultar la barra nativa (queda cortada al recortar).
                'absolute -top-[2%] left-1/2 h-[108%] w-[320%] max-w-none -translate-x-1/2 border-0'
              : 'absolute inset-0 h-full w-full max-w-full border-0'
          }
          src={parsed.embedUrl}
          title="Video del Proyecto"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />

        {isDriveVertical ? (
          <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-end gap-1 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-2 pb-2 pt-8 pointer-events-none">
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir en Google Drive"
              className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-white/90 hover:bg-white/15 hover:text-white transition-colors"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={2} />
            </a>
            <button
              type="button"
              title={
                isFullscreen
                  ? 'Salir de pantalla completa'
                  : 'Pantalla completa'
              }
              onClick={toggleFullscreen}
              className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-white/90 hover:bg-white/15 hover:text-white transition-colors"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" strokeWidth={2} />
              ) : (
                <Maximize2 className="h-4 w-4" strokeWidth={2} />
              )}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AddInfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[13px] font-normal text-gray-500 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
    >
      <Plus className="h-4 w-4 shrink-0" strokeWidth={2} />
      <span>Añadir</span>
    </button>
  );
}

/** Sección de lectura: bloque tipográfico alineado al índice. */
function ReadingSection({
  id,
  tourId,
  title,
  icon,
  action,
  children,
  className = '',
}: {
  id?: string;
  tourId?: string;
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`min-w-0 scroll-mt-3 ${className}`}>
      <div
        id={tourId}
        className="rounded-lg border border-gray-200 bg-white"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/90 rounded-t-lg">
          <div className="flex items-center gap-2 min-w-0">
            {icon ? (
              <span className="shrink-0 text-gray-500 [&_svg]:h-3.5 [&_svg]:w-3.5">
                {icon}
              </span>
            ) : null}
            <h2 className="text-[13px] font-medium tracking-wide text-gray-800 truncate">
              {title}
            </h2>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        <div className="px-5 py-4 min-w-0">{children}</div>
      </div>
    </section>
  );
}

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full text-[13px] font-normal text-gray-400 leading-snug break-words [overflow-wrap:anywhere]">
      {children}
    </span>
  );
}

function MetaChipList({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-1.5 min-w-0">{children}</div>;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
      {children}
    </h3>
  );
}

function BodyText({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-[15px] text-gray-800 leading-[1.75] break-words [overflow-wrap:anywhere] ${className}`}
    >
      {children}
    </p>
  );
}

function BookIndex({
  activeId,
  onNavigate,
  items,
}: {
  activeId: string;
  onNavigate: (id: string) => void;
  items: TocItem[];
}) {
  return (
    <nav
      aria-label="Índice del proyecto"
      className="sticky top-0 pr-2"
    >
      <ol className="relative space-y-0.5 border-l border-gray-200 ml-1.5">
        {items.map((item) => {
          const isActive = activeId === item.id;

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'true' : undefined}
                title={item.label}
                className={`group relative w-full min-w-0 text-left pl-4 pr-2 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-r-sm ${
                  isActive
                    ? 'text-gray-900'
                    : 'text-gray-400 hover:text-gray-800'
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full transition-colors ${
                    isActive
                      ? 'bg-emerald-600'
                      : 'bg-gray-300 group-hover:bg-gray-400'
                  }`}
                />
                <span
                  className={`text-[13px] leading-snug block truncate ${
                    isActive ? 'font-medium' : 'font-normal'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function parseSedeNames(sede: string | null | undefined) {
  return (sede ?? '')
    .split(/\s*\|\s*|\s*,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type ProjectMetaRailProps = {
  project: ProyectoWithRelations;
  sedeNames: string[];
  hasSocios: boolean;
  hasSede: boolean;
  hasComunas: boolean;
  hasEscuelas: boolean;
  hasCarreras: boolean;
  hasAsignaturas: boolean;
  hasGrupos: boolean;
} & Pick<
  UseGeneralTabReturn,
  | 'editingField'
  | 'generalDraft'
  | 'setGeneralDraft'
  | 'catalogosGeneral'
  | 'catalogosLoading'
  | 'isGeneralSaving'
  | 'handleStartEditField'
  | 'handleSaveGeneralTab'
  | 'handleCancelGeneralEdit'
>;

function ProjectMetaRail({
  project,
  sedeNames,
  hasSocios,
  hasSede,
  hasComunas,
  hasEscuelas,
  hasCarreras,
  hasAsignaturas,
  hasGrupos,
  editingField,
  generalDraft,
  setGeneralDraft,
  catalogosGeneral,
  catalogosLoading,
  isGeneralSaving,
  handleStartEditField,
  handleSaveGeneralTab,
  handleCancelGeneralEdit,
  openEditarSociosDialog,
}: ProjectMetaRailProps & {
  openEditarSociosDialog: () => void;
}) {
  const isEditing = (field: GeneralFieldId) => editingField === field;

  return (
    <div className="space-y-7">
      <div className="group/field">
        <FieldLabel>Socios Comunitarios</FieldLabel>
        {hasSocios ? (
          <div className="relative">
            <MetaChipList>
              {project.sociosComunitarios?.map((socioRel, idx) => (
                <MetaChip key={idx}>
                  {socioRel.socioComunitario.nombre}
                </MetaChip>
              ))}
            </MetaChipList>
            <HoverEditButton
              onClick={openEditarSociosDialog}
              tooltip="Editar socios comunitarios"
            />
          </div>
        ) : (
          <AddInfoButton onClick={openEditarSociosDialog} />
        )}
      </div>

      <div className="group/field">
        <FieldLabel>Sedes</FieldLabel>
        {isEditing('sede') ? (
          <div>
            <MultiSelectNombres
              options={catalogosGeneral.sedes.map((s) => ({
                id: s.id,
                nombre: s.nombre,
              }))}
              value={generalDraft?.sede ?? ''}
              onChange={(v) =>
                setGeneralDraft((prev) =>
                  prev ? { ...prev, sede: v } : prev
                )
              }
              placeholder="Seleccionar sedes"
              loading={catalogosLoading}
            />
            <FieldSaveCancel
              isSaving={isGeneralSaving}
              onSave={handleSaveGeneralTab}
              onCancel={handleCancelGeneralEdit}
            />
          </div>
        ) : hasSede ? (
          <div className="relative">
            <MetaChipList>
              {sedeNames.map((sedeNombre, idx) => (
                <MetaChip key={idx}>{sedeNombre}</MetaChip>
              ))}
            </MetaChipList>
            <HoverEditButton
              onClick={() => handleStartEditField('sede')}
              tooltip="Editar sedes"
            />
          </div>
        ) : (
          <AddInfoButton onClick={() => handleStartEditField('sede')} />
        )}
      </div>

      <div className="group/field">
        <FieldLabel>Comunas</FieldLabel>
        {isEditing('comunas') ? (
          <div>
            <MultiSelectNombres
              options={catalogosGeneral.comunas}
              value={generalDraft?.comunasTexto ?? ''}
              onChange={(v) =>
                setGeneralDraft((prev) =>
                  prev ? { ...prev, comunasTexto: v } : prev
                )
              }
              placeholder="Seleccionar comunas"
              loading={catalogosLoading}
            />
            <FieldSaveCancel
              isSaving={isGeneralSaving}
              onSave={handleSaveGeneralTab}
              onCancel={handleCancelGeneralEdit}
            />
          </div>
        ) : hasComunas ? (
          <div className="relative">
            <MetaChipList>
              {project.comunas.map((comunaRel, idx) => (
                <MetaChip key={idx}>{comunaRel.comuna.nombre}</MetaChip>
              ))}
            </MetaChipList>
            <HoverEditButton
              onClick={() => handleStartEditField('comunas')}
              tooltip="Editar comunas"
            />
          </div>
        ) : (
          <AddInfoButton onClick={() => handleStartEditField('comunas')} />
        )}
      </div>

      <div className="group/field">
        <FieldLabel>Escuelas</FieldLabel>
        {isEditing('escuelas') ? (
          <div>
            <MultiSelectNombres
              options={catalogosGeneral.escuelas}
              value={generalDraft?.escuelasTexto ?? ''}
              onChange={(v) =>
                setGeneralDraft((prev) =>
                  prev ? { ...prev, escuelasTexto: v } : prev
                )
              }
              placeholder="Seleccionar escuelas"
              loading={catalogosLoading}
            />
            <FieldSaveCancel
              isSaving={isGeneralSaving}
              onSave={handleSaveGeneralTab}
              onCancel={handleCancelGeneralEdit}
            />
          </div>
        ) : hasEscuelas ? (
          <div className="relative">
            <MetaChipList>
              {project.escuelas.map((escuelaRel, idx) => (
                <MetaChip key={idx}>{escuelaRel.escuela.nombre}</MetaChip>
              ))}
            </MetaChipList>
            <HoverEditButton
              onClick={() => handleStartEditField('escuelas')}
              tooltip="Editar escuelas"
            />
          </div>
        ) : (
          <AddInfoButton onClick={() => handleStartEditField('escuelas')} />
        )}
      </div>

      <div className="group/field">
        <FieldLabel>Carreras</FieldLabel>
        {isEditing('carreras') ? (
          <div>
            <MultiSelectNombres
              options={catalogosGeneral.carreras}
              value={generalDraft?.carrerasTexto ?? ''}
              onChange={(v) =>
                setGeneralDraft((prev) =>
                  prev ? { ...prev, carrerasTexto: v } : prev
                )
              }
              placeholder="Seleccionar carreras"
              loading={catalogosLoading}
            />
            <FieldSaveCancel
              isSaving={isGeneralSaving}
              onSave={handleSaveGeneralTab}
              onCancel={handleCancelGeneralEdit}
            />
          </div>
        ) : hasCarreras ? (
          <div className="relative">
            <MetaChipList>
              {project.carreras.map((carreraRel, idx) => (
                <MetaChip key={idx}>{carreraRel.carrera.nombre}</MetaChip>
              ))}
            </MetaChipList>
            <HoverEditButton
              onClick={() => handleStartEditField('carreras')}
              tooltip="Editar carreras"
            />
          </div>
        ) : (
          <AddInfoButton onClick={() => handleStartEditField('carreras')} />
        )}
      </div>

      <div className="group/field">
        <FieldLabel>Asignaturas</FieldLabel>
        {isEditing('asignaturas') ? (
          <div>
            <MultiSelectNombres
              options={catalogosGeneral.asignaturas}
              value={generalDraft?.asignaturasTexto ?? ''}
              onChange={(v) =>
                setGeneralDraft((prev) =>
                  prev ? { ...prev, asignaturasTexto: v } : prev
                )
              }
              placeholder="Seleccionar asignaturas"
              loading={catalogosLoading}
            />
            <FieldSaveCancel
              isSaving={isGeneralSaving}
              onSave={handleSaveGeneralTab}
              onCancel={handleCancelGeneralEdit}
            />
          </div>
        ) : hasAsignaturas ? (
          <div className="relative">
            <MetaChipList>
              {project.asignaturas?.map((asignaturaRel, idx) => (
                <MetaChip key={idx}>{asignaturaRel.asignatura.nombre}</MetaChip>
              ))}
            </MetaChipList>
            <HoverEditButton
              onClick={() => handleStartEditField('asignaturas')}
              tooltip="Editar asignaturas"
            />
          </div>
        ) : (
          <AddInfoButton onClick={() => handleStartEditField('asignaturas')} />
        )}
      </div>

      <div className="group/field">
        <FieldLabel>Grupos de Interés</FieldLabel>
        {isEditing('gruposInteres') ? (
          <div>
            <MultiSelectNombres
              options={catalogosGeneral.gruposInteres}
              value={generalDraft?.gruposInteresTexto ?? ''}
              onChange={(v) =>
                setGeneralDraft((prev) =>
                  prev ? { ...prev, gruposInteresTexto: v } : prev
                )
              }
              placeholder="Seleccionar grupos de interés"
              loading={catalogosLoading}
            />
            <FieldSaveCancel
              isSaving={isGeneralSaving}
              onSave={handleSaveGeneralTab}
              onCancel={handleCancelGeneralEdit}
            />
          </div>
        ) : hasGrupos ? (
          <div className="relative">
            <MetaChipList>
              {project.gruposInteres.map((grupoRel, idx) => (
                <MetaChip key={idx}>{grupoRel.grupoInteres.nombre}</MetaChip>
              ))}
            </MetaChipList>
            <HoverEditButton
              onClick={() => handleStartEditField('gruposInteres')}
              tooltip="Editar grupos de interés"
            />
          </div>
        ) : (
          <AddInfoButton
            onClick={() => handleStartEditField('gruposInteres')}
          />
        )}
      </div>
    </div>
  );
}

export function GeneralTabHeader({
  project,
  selectedTab,
  editingField,
  generalDraft,
  setGeneralDraft,
  isGeneralSaving,
  handleStartEditField,
  handleSaveGeneralTab,
  handleCancelGeneralEdit,
}: {
  project: ProyectoWithRelations;
  selectedTab: ProyectoTabName;
} & Pick<
  UseGeneralTabReturn,
  | 'editingField'
  | 'generalDraft'
  | 'setGeneralDraft'
  | 'isGeneralSaving'
  | 'handleStartEditField'
  | 'handleSaveGeneralTab'
  | 'handleCancelGeneralEdit'
>) {
  const isEditingTitle = editingField === 'proyecto';

  return (
    <>
      {isEditingTitle ? (
        <div className="flex flex-col items-center gap-2 min-w-0 px-14">
          <Input
            value={generalDraft?.proyecto ?? ''}
            onChange={(e) =>
              setGeneralDraft((prev) =>
                prev ? { ...prev, proyecto: e.target.value } : prev
              )
            }
            className="h-10 text-2xl font-bold text-gray-900 text-center px-3 py-2 border border-gray-200 rounded-md focus:border-gray-400 focus-visible:ring-0 w-fit max-w-full min-w-[320px] sm:min-w-[480px] bg-transparent shadow-none"
          />
          <FieldSaveCancel
            isSaving={isGeneralSaving}
            onSave={handleSaveGeneralTab}
            onCancel={handleCancelGeneralEdit}
          />
        </div>
      ) : (
        /* Contenedor shrink-to-fit centrado: el lápiz (absolute left-full) queda
           junto al texto sin reservar espacio ni desviar el centrado. */
        <div className="flex justify-center w-full min-w-0 max-w-[min(100%,75rem)] mx-auto overflow-visible">
          <div className="group/title relative inline-flex max-w-full min-w-0 items-center overflow-visible">
            <h1
              className="truncate text-center text-2xl font-bold leading-tight text-gray-900 py-0"
              title={project.proyecto}
            >
              {project.proyecto}
            </h1>
            {selectedTab === 'General' && (
              <div className="absolute left-full top-1/2 z-10 -translate-y-1/2 ml-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        onClick={() => handleStartEditField('proyecto')}
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 shrink-0 rounded-sm opacity-0 group-hover/title:opacity-100 focus-visible:opacity-100 transition-opacity duration-150 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-transparent"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Editar título del proyecto</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function GeneralTab({
  project,
  setProject,
  onSaveSuccess,
  projectVideos,
  editingField,
  generalDraft,
  setGeneralDraft,
  catalogosGeneral,
  catalogosLoading,
  tempVideoUrl,
  setTempVideoUrl,
  isGeneralSaving,
  handleStartEditField,
  handleSaveGeneralTab,
  handleCancelGeneralEdit,
}: {
  project: ProyectoWithRelations;
  setProject: React.Dispatch<React.SetStateAction<ProyectoWithRelations | null>>;
  onSaveSuccess: () => void;
  projectVideos: Record<string, string>;
} & Pick<
  UseGeneralTabReturn,
  | 'editingField'
  | 'generalDraft'
  | 'setGeneralDraft'
  | 'catalogosGeneral'
  | 'catalogosLoading'
  | 'tempVideoUrl'
  | 'setTempVideoUrl'
  | 'isGeneralSaving'
  | 'handleStartEditField'
  | 'handleSaveGeneralTab'
  | 'handleCancelGeneralEdit'
>) {
  const isEditing = (field: GeneralFieldId) => editingField === field;
  const scrollRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const cancelWheelAnimRef = useRef<(() => void) | null>(null);
  const ignoreSpyUntilRef = useRef(0);
  const [activeSectionId, setActiveSectionId] = useState(TOC_PREFIX[0].id);
  const {
    data: dtCategorias,
    isPending: isDtConfigPending,
    isError: isDtConfigError,
  } = useDesarrolloTecnicoConfigQuery();

  const {
    isEditarSociosOpen,
    setIsEditarSociosOpen,
    editarSociosIds,
    setEditarSociosIds,
    editarSociosCatalog,
    nuevoSocioNombre,
    setNuevoSocioNombre,
    nuevoSocioDescripcion,
    setNuevoSocioDescripcion,
    nuevoSocioSaving,
    editarSociosSaving,
    openEditarSociosDialog,
    handleCreateNuevoSocio,
    handleSaveEditarSocios,
  } = useEditarSociosComunitarios({
    project,
    setProject,
    onSaveSuccess,
  });

  /** Si el proyecto no tiene línea (o no matchea catálogo), se muestran todos los elementos. */
  const proyectoLineaId = useMemo(() => {
    const lineaNombre = project.linea?.trim();
    if (!lineaNombre) return null;
    const match = catalogosGeneral.lineas.find(
      (l) =>
        l.nombre === lineaNombre &&
        (!project.fondo?.trim() || l.fondoNombre === project.fondo.trim())
    );
    return match?.id ?? null;
  }, [project.linea, project.fondo, catalogosGeneral.lineas]);

  const dtConfigSections = useMemo<DtConfigSection[]>(() => {
    if (!dtCategorias?.length) {
      return isDtConfigError ? FALLBACK_DT_SECTIONS : [];
    }
    const next: DtConfigSection[] = [];
    let totalSubs = 0;
    for (const cat of dtCategorias) {
      for (const sub of cat.subcategorias) {
        totalSubs += 1;
        if (
          proyectoLineaId &&
          sub.lineasExcluidas?.some((e) => e.lineaId === proyectoLineaId)
        ) {
          continue;
        }
        const campoKey = isLegacyDtFieldKey(sub.campoKey)
          ? sub.campoKey
          : null;
        const sectionId = campoKey
          ? DT_FIELD_SECTION_IDS[campoKey]
          : `dt-sub-${sub.id}`;
        const fieldId: GeneralFieldId = campoKey
          ? `dt.${campoKey}`
          : `dt.sub.${sub.id}`;
        next.push({
          subcategoriaId: sub.id,
          sectionId,
          title:
            sub.nombre?.trim() ||
            (campoKey ? DEFAULT_DT_LABELS[campoKey] : 'Sin nombre'),
          icono:
            sub.icono ||
            (campoKey ? DEFAULT_DT_ICONS[campoKey] : 'FileText'),
          campoKey,
          fieldId,
        });
      }
    }
    if (next.length > 0) return next;
    // Config cargada pero todo filtrado por línea → no usar fallback legacy
    if (totalSubs > 0) return [];
    return FALLBACK_DT_SECTIONS;
  }, [dtCategorias, isDtConfigError, proyectoLineaId]);

  const tocItems = useMemo<TocItem[]>(
    () => [
      ...TOC_PREFIX,
      ...dtConfigSections.map((section) => ({
        id: section.sectionId,
        label: section.title,
      })),
    ],
    [dtConfigSections]
  );
  const sedeNames = parseSedeNames(project.sede);
  const hasSocios = (project.sociosComunitarios?.length ?? 0) > 0;
  const hasSede = sedeNames.length > 0;
  const hasComunas = (project.comunas?.length ?? 0) > 0;
  const hasEscuelas = (project.escuelas?.length ?? 0) > 0;
  const hasCarreras = (project.carreras?.length ?? 0) > 0;
  const hasAsignaturas = (project.asignaturas?.length ?? 0) > 0;
  const hasGrupos = (project.gruposInteres?.length ?? 0) > 0;

  const objetivos = project.objetivos_rel || [];
  const objetivoGeneral = objetivos.find((obj) => obj.tipo === 'General');
  const objetivosEspecificos = objetivos
    .filter((obj) => obj.tipo === 'Especifico')
    .sort((a, b) => a.orden - b.orden);
  const hasObjetivoGeneral = Boolean(objetivoGeneral?.descripcion?.trim());
  const hasObjetivosEspecificos = objetivosEspecificos.length > 0;

  const projVideo =
    (project as ProyectoWithRelations & { youtubeUrl?: string | null })
      .youtubeUrl ??
    projectVideos[project.id] ??
    '';
  const hasVideo = Boolean(parseProjectVideoUrl(projVideo));

  const desarrolloTecnico =
    editingField?.startsWith('dt.') && generalDraft
      ? generalDraft.desarrolloTecnico
      : project.desarrolloTecnico;

  const valoresBySubId = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of project.desarrolloTecnicoValores ?? []) {
      map.set(v.subcategoriaId, v.valor ?? '');
    }
    if (editingField?.startsWith('dt.') && generalDraft) {
      for (const [id, valor] of Object.entries(
        generalDraft.desarrolloTecnicoExtra
      )) {
        map.set(id, valor);
      }
    }
    return map;
  }, [
    project.desarrolloTecnicoValores,
    editingField,
    generalDraft,
  ]);

  const desarrolloSections = dtConfigSections.map((section) => {
    let content = '';
    if (section.campoKey) {
      if (editingField?.startsWith('dt.') && generalDraft) {
        content = generalDraft.desarrolloTecnico[section.campoKey] ?? '';
      } else {
        content =
          (desarrolloTecnico?.[section.campoKey] as string | null | undefined) ??
          valoresBySubId.get(section.subcategoriaId) ??
          '';
      }
    } else {
      content = valoresBySubId.get(section.subcategoriaId) ?? '';
    }

    return {
      id: section.sectionId,
      title: section.title,
      icono: section.icono,
      content,
      campoKey: section.campoKey,
      subcategoriaId: section.subcategoriaId,
      fieldId: section.fieldId,
    };
  });

  const navigateToSection = useCallback((id: string) => {
    const container = scrollRef.current;
    const target = container?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (!container || !target) return;

    cancelWheelAnimRef.current?.();
    setActiveSectionId(id);
    // Pausar spy un momento para que no pise el ítem clickeado
    ignoreSpyUntilRef.current = Date.now() + 400;

    const top =
      id === tocItems[0]?.id
        ? 0
        : Math.max(
            0,
            target.getBoundingClientRect().top -
              container.getBoundingClientRect().top +
              container.scrollTop -
              12
          );

    container.scrollTop = top;
    cancelWheelAnimRef.current?.();
  }, [tocItems]);

  // Scroll-spy simple: sección cuya cabecera pasó el marcador
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const updateActiveSection = () => {
      if (Date.now() < ignoreSpyUntilRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const maxScroll = Math.max(0, scrollHeight - clientHeight);

      if (maxScroll > 0 && maxScroll - scrollTop <= 4) {
        const lastId = tocItems[tocItems.length - 1]?.id;
        if (lastId) {
          setActiveSectionId((prev) => (prev === lastId ? prev : lastId));
        }
        return;
      }

      const marker = container.getBoundingClientRect().top + 56;
      let currentId = tocItems[0].id;

      for (const item of tocItems) {
        const el = container.querySelector<HTMLElement>(
          `#${CSS.escape(item.id)}`
        );
        if (!el) continue;
        if (el.getBoundingClientRect().top <= marker) {
          currentId = item.id;
        } else {
          break;
        }
      }

      setActiveSectionId((prev) => (prev === currentId ? prev : currentId));
    };

    updateActiveSection();
    container.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);
    return () => {
      container.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, [tocItems]);

  // Rueda del mouse → scroll suave (lerp) de la columna de lectura
  useEffect(() => {
    const root = rootRef.current;
    const container = scrollRef.current;
    if (!root || !container) return;

    let targetScroll = container.scrollTop;
    let rafId = 0;
    let animating = false;
    let applyingScroll = false;
    const EASE = 0.22;
    const WHEEL_GAIN = 1.85;

    const getMaxScroll = () =>
      Math.max(0, container.scrollHeight - container.clientHeight);

    const stopAnimation = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      animating = false;
      targetScroll = container.scrollTop;
    };

    cancelWheelAnimRef.current = stopAnimation;

    const setScrollTop = (value: number) => {
      applyingScroll = true;
      container.scrollTop = value;
      applyingScroll = false;
    };

    const animate = () => {
      const current = container.scrollTop;
      const diff = targetScroll - current;

      if (targetScroll <= 0.5 && current < 1.5) {
        setScrollTop(0);
        animating = false;
        rafId = 0;
        return;
      }

      if (Math.abs(diff) < 0.4) {
        setScrollTop(targetScroll);
        animating = false;
        rafId = 0;
        return;
      }

      setScrollTop(current + diff * EASE);
      rafId = requestAnimationFrame(animate);
    };

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest('textarea, select, input')) {
        const scrollable = target.closest('textarea');
        if (
          scrollable &&
          scrollable.scrollHeight > scrollable.clientHeight + 1
        ) {
          return;
        }
      }

      let delta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
      if (delta === 0) return;

      if (event.deltaMode === 1) delta *= 18;
      if (event.deltaMode === 2) delta *= container.clientHeight;
      delta *= WHEEL_GAIN;

      event.preventDefault();

      if (!animating) {
        targetScroll = container.scrollTop;
      }

      targetScroll = Math.min(
        getMaxScroll(),
        Math.max(0, targetScroll + delta)
      );

      if (!animating) {
        animating = true;
        rafId = requestAnimationFrame(animate);
      }
    };

    // Si el usuario arrastra la barra (u otro scroll nativo), soltar el lerp
    const onScroll = () => {
      if (applyingScroll) return;
      stopAnimation();
    };

    const onPointerDown = () => {
      stopAnimation();
    };

    root.addEventListener('wheel', onWheel, { passive: false, capture: true });
    container.addEventListener('scroll', onScroll, { passive: true });
    container.addEventListener('pointerdown', onPointerDown, { passive: true });

    return () => {
      root.removeEventListener('wheel', onWheel, true);
      container.removeEventListener('scroll', onScroll);
      container.removeEventListener('pointerdown', onPointerDown);
      stopAnimation();
      cancelWheelAnimRef.current = null;
    };
  }, []);

  // Evitar paint parcial: fallback DT y luego campos custom (p.ej. Marco teórico).
  if (isDtConfigPending && dtConfigSections.length === 0) {
    return null;
  }

  return (
    <div ref={rootRef} className="h-full min-w-0 overflow-hidden overflow-x-hidden pt-4">
      {/* Índice | Lectura centrada | Metadatos de contexto */}
      <div className="grid h-full w-full min-w-0 max-w-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,48rem)_minmax(0,1fr)]">
        <aside className="hidden lg:flex justify-end pr-6 xl:pr-8 pl-2 h-full min-h-0 min-w-0 overflow-hidden">
          <div id="tour-general-indice" className="w-[15.5rem] max-w-full shrink-0">
            <BookIndex
              activeId={activeSectionId}
              onNavigate={navigateToSection}
              items={tocItems}
            />
          </div>
        </aside>

        <div
          ref={scrollRef}
          className="h-full overflow-y-auto overflow-x-hidden min-h-0 min-w-0 custom-scrollbar px-2 sm:px-4"
        >
          {/* Índice compacto en pantallas pequeñas */}
          <div
            id="tour-general-indice"
            className="lg:hidden sticky top-0 z-10 -mx-1 mb-6 bg-white/95 backdrop-blur-sm border-b border-gray-100 pb-2"
          >
            <div className="flex gap-1 overflow-x-auto custom-scrollbar py-1 px-1">
              {tocItems.map((item) => {
                const isActive = activeSectionId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateToSection(item.id)}
                    className={`shrink-0 px-2.5 py-1 text-[12px] whitespace-nowrap transition-colors ${
                      isActive
                        ? 'text-gray-900 font-medium border-b-2 border-emerald-600'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-8 min-w-0 pt-3 pb-[min(100vh,44rem)]">
            <ReadingSection
              id="objetivo-general"
              tourId="tour-general-objetivo"
              title="Objetivo General"
              icon={<Crosshair />}
            >
              {isEditing('objetivoGeneral') ? (
                <div className="min-w-0">
                  <GeneralTabTextarea
                    value={generalDraft?.objetivoGeneral ?? ''}
                    onChange={(e) =>
                      setGeneralDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              objetivoGeneral: e.target.value,
                            }
                          : prev
                      )
                    }
                    className="text-[15px] leading-[1.75] border-0 border-b border-gray-200 rounded-none focus:border-gray-400 bg-transparent shadow-none px-0 break-words max-w-full"
                  />
                  <FieldSaveCancel
                    isSaving={isGeneralSaving}
                    onSave={handleSaveGeneralTab}
                    onCancel={handleCancelGeneralEdit}
                  />
                </div>
              ) : hasObjetivoGeneral ? (
                <div className="group/field relative min-w-0">
                  <BodyText className="min-w-0">
                    {objetivoGeneral!.descripcion}
                  </BodyText>
                  <HoverEditButton
                    onClick={() => handleStartEditField('objetivoGeneral')}
                    tooltip="Editar objetivo general"
                  />
                </div>
              ) : (
                <AddInfoButton
                  onClick={() => handleStartEditField('objetivoGeneral')}
                />
              )}
            </ReadingSection>

            <ReadingSection
              id="objetivos-especificos"
              tourId="tour-general-oes"
              title="Objetivos Específicos"
              icon={<Target />}
              action={
                isEditing('objetivosEspecificos') ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 shrink-0 text-[13px] font-normal text-gray-500 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
                    onClick={() =>
                      setGeneralDraft((prev) => {
                        if (!prev) return prev;
                        const nextOrden =
                          prev.objetivosEspecificos.length + 1;
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
                    <Plus className="h-4 w-4 shrink-0" strokeWidth={2} />
                    <span>Agregar objetivo</span>
                  </button>
                ) : undefined
              }
            >
              {isEditing('objetivosEspecificos') ? (
                <div className="space-y-6">
                  {(generalDraft?.objetivosEspecificos ?? []).map(
                    (objetivo, index) => (
                      <div
                        key={objetivo.id}
                        className="flex items-start space-x-4 gap-2"
                      >
                        <div className="flex-shrink-0 w-6 pt-0.5 text-[11px] font-medium text-gray-400 tabular-nums tracking-wide">
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <GeneralTabTextarea
                          value={
                            generalDraft?.objetivosEspecificos?.[index]
                              ?.descripcion ?? ''
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
                                                descripcion: e.target.value,
                                              }
                                            : item
                                      ),
                                  }
                                : prev
                            )
                          }
                          className="text-[15px] leading-[1.75] border-0 border-b border-gray-200 rounded-none focus:border-gray-400 bg-transparent shadow-none px-0 flex-1 min-w-0 break-words"
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
                                objetivosEspecificos: next.map((o, i) => ({
                                  ...o,
                                  orden: i + 1,
                                })),
                              };
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  )}
                  <FieldSaveCancel
                    isSaving={isGeneralSaving}
                    onSave={handleSaveGeneralTab}
                    onCancel={handleCancelGeneralEdit}
                  />
                </div>
              ) : hasObjetivosEspecificos ? (
                <div className="group/field relative">
                  <div className="space-y-5">
                    {objetivosEspecificos.map((objetivo, index) => (
                      <div
                        key={objetivo.id}
                        className="flex items-center gap-3"
                      >
                        <span className="flex-shrink-0 w-6 text-[11px] font-medium text-gray-400 tabular-nums tracking-wide">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <BodyText className="flex-1 min-w-0 pt-0">
                          {objetivo.descripcion}
                        </BodyText>
                      </div>
                    ))}
                  </div>
                  <HoverEditButton
                    onClick={() =>
                      handleStartEditField('objetivosEspecificos')
                    }
                    tooltip="Editar objetivos específicos"
                  />
                </div>
              ) : (
                <AddInfoButton
                  onClick={() => handleStartEditField('objetivosEspecificos')}
                />
              )}
            </ReadingSection>

            <ReadingSection
              id="video"
              tourId="tour-general-video"
              title="Video"
              icon={<Video />}
            >
                {isEditing('video') ? (
                  <div className="space-y-3">
                    <Label className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
                      URL del video (YouTube, Vimeo, Drive o SharePoint)
                    </Label>
                    <Input
                      value={tempVideoUrl}
                      onChange={(e) => setTempVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/... · vimeo.com/... · drive.google.com/... · sharepoint.com/..."
                      className="border-0 border-b border-gray-200 rounded-none focus:border-gray-400 shadow-none bg-transparent px-0 focus-visible:ring-0"
                    />
                  {tempVideoUrl && parseProjectVideoUrl(tempVideoUrl) ? (
                    <ProjectVideoEmbed url={tempVideoUrl} />
                  ) : null}
                  <FieldSaveCancel
                    isSaving={isGeneralSaving}
                    onSave={handleSaveGeneralTab}
                    onCancel={handleCancelGeneralEdit}
                  />
                </div>
              ) : hasVideo ? (
                <div className="group/field relative">
                  <HoverEditButton
                    onClick={() => handleStartEditField('video')}
                    tooltip="Editar video"
                  />
                  <ProjectVideoEmbed url={projVideo} />
                </div>
              ) : (
                <div className="py-1">
                  <p className="text-[13px] text-gray-400 mb-2">
                    Sin video asignado
                  </p>
                  <AddInfoButton
                    onClick={() => handleStartEditField('video')}
                  />
                </div>
              )}
            </ReadingSection>

            {desarrolloSections.map((section) => {
              const hasContent = Boolean(section.content?.trim());
              const editingThis = isEditing(section.fieldId);
              const draftValue = section.campoKey
                ? (generalDraft?.desarrolloTecnico[section.campoKey] ?? '')
                : (generalDraft?.desarrolloTecnicoExtra[
                    section.subcategoriaId
                  ] ?? '');

              return (
                <ReadingSection
                  key={section.id}
                  id={section.id}
                  title={section.title}
                  icon={<IconByName name={section.icono} />}
                >
                  {editingThis ? (
                    <div>
                      <GeneralTabTextarea
                        value={draftValue}
                        onChange={(e) =>
                          setGeneralDraft((prev) => {
                            if (!prev) return prev;
                            if (section.campoKey) {
                              return {
                                ...prev,
                                desarrolloTecnico: {
                                  ...prev.desarrolloTecnico,
                                  [section.campoKey]: e.target.value,
                                },
                              };
                            }
                            return {
                              ...prev,
                              desarrolloTecnicoExtra: {
                                ...prev.desarrolloTecnicoExtra,
                                [section.subcategoriaId]: e.target.value,
                              },
                            };
                          })
                        }
                        className="text-[15px] leading-[1.75] border-0 border-b border-gray-200 rounded-none focus:border-gray-400 bg-transparent shadow-none px-0 break-words max-w-full"
                      />
                      <FieldSaveCancel
                        isSaving={isGeneralSaving}
                        onSave={handleSaveGeneralTab}
                        onCancel={handleCancelGeneralEdit}
                      />
                    </div>
                  ) : hasContent ? (
                    <div className="group/field relative">
                      <div className="text-[15px] text-gray-800 leading-[1.75] whitespace-pre-wrap break-words [overflow-wrap:anywhere] min-w-0">
                        {section.content}
                      </div>
                      <HoverEditButton
                        onClick={() => handleStartEditField(section.fieldId)}
                        tooltip={`Editar ${section.title.toLowerCase()}`}
                      />
                    </div>
                  ) : (
                    <AddInfoButton
                      onClick={() => handleStartEditField(section.fieldId)}
                    />
                  )}
                </ReadingSection>
              );
            })}

            {/* Metadatos en móvil (en desktop van a la columna derecha) */}
            <div
              id="tour-general-meta-rail"
              className="lg:hidden pt-4 border-t border-gray-100"
            >
              <ProjectMetaRail
                project={project}
                sedeNames={sedeNames}
                hasSocios={hasSocios}
                hasSede={hasSede}
                hasComunas={hasComunas}
                hasEscuelas={hasEscuelas}
                hasCarreras={hasCarreras}
                hasAsignaturas={hasAsignaturas}
                hasGrupos={hasGrupos}
                editingField={editingField}
                generalDraft={generalDraft}
                setGeneralDraft={setGeneralDraft}
                catalogosGeneral={catalogosGeneral}
                catalogosLoading={catalogosLoading}
                isGeneralSaving={isGeneralSaving}
                handleStartEditField={handleStartEditField}
                handleSaveGeneralTab={handleSaveGeneralTab}
                handleCancelGeneralEdit={handleCancelGeneralEdit}
                openEditarSociosDialog={openEditarSociosDialog}
              />
            </div>
          </div>
        </div>

        <aside className="hidden lg:flex justify-start pl-8 xl:pl-12 pr-3 h-full min-h-0 min-w-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div
            id="tour-general-meta-rail"
            className="w-[13.5rem] max-w-full shrink-0 sticky top-0 pt-3"
          >
            <ProjectMetaRail
              project={project}
              sedeNames={sedeNames}
              hasSocios={hasSocios}
              hasSede={hasSede}
              hasComunas={hasComunas}
              hasEscuelas={hasEscuelas}
              hasCarreras={hasCarreras}
              hasAsignaturas={hasAsignaturas}
              hasGrupos={hasGrupos}
              editingField={editingField}
              generalDraft={generalDraft}
              setGeneralDraft={setGeneralDraft}
              catalogosGeneral={catalogosGeneral}
              catalogosLoading={catalogosLoading}
              isGeneralSaving={isGeneralSaving}
              handleStartEditField={handleStartEditField}
              handleSaveGeneralTab={handleSaveGeneralTab}
              handleCancelGeneralEdit={handleCancelGeneralEdit}
              openEditarSociosDialog={openEditarSociosDialog}
            />
          </div>
        </aside>
      </div>

      <EditarSociosComunitariosDialog
        isEditarSociosOpen={isEditarSociosOpen}
        setIsEditarSociosOpen={setIsEditarSociosOpen}
        editarSociosIds={editarSociosIds}
        setEditarSociosIds={setEditarSociosIds}
        editarSociosCatalog={editarSociosCatalog}
        nuevoSocioNombre={nuevoSocioNombre}
        setNuevoSocioNombre={setNuevoSocioNombre}
        nuevoSocioDescripcion={nuevoSocioDescripcion}
        setNuevoSocioDescripcion={setNuevoSocioDescripcion}
        nuevoSocioSaving={nuevoSocioSaving}
        editarSociosSaving={editarSociosSaving}
        handleCreateNuevoSocio={handleCreateNuevoSocio}
        handleSaveEditarSocios={handleSaveEditarSocios}
      />
    </div>
  );
}

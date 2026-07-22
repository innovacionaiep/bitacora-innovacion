'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getCatalogosGeneral,
  updateProyectoGeneralTab,
} from '@/lib/actions/proyectos';
import type { ProyectoWithRelations } from '@/types/proyecto';
import { catalogosGeneralKey } from '@/lib/query-keys';
import {
  buildGeneralDraft,
  buildOptimisticRelationRows,
  extractYouTubeVideoId,
  type CatalogosGeneral,
  type GeneralDraft,
  type GeneralFieldId,
  mapNamesToIds,
  parseNameList,
} from './general-tab-utils';

type ProyectoTabName =
  | 'Resumen'
  | 'General'
  | 'Participantes'
  | 'Gantt'
  | 'Indicadores'
  | 'Presupuesto'
  | 'Historial'
  | 'Seguimiento';

const EMPTY_CATALOGOS: CatalogosGeneral = {
  escuelas: [],
  carreras: [],
  asignaturas: [],
  comunas: [],
  gruposInteres: [],
  sociosComunitarios: [],
  sedes: [],
  fondos: [],
  lineas: [],
};

function mapCatalogosResult(
  data: NonNullable<Awaited<ReturnType<typeof getCatalogosGeneral>>['data']>
): CatalogosGeneral {
  return {
    escuelas: data.escuelas,
    carreras: data.carreras,
    asignaturas: data.asignaturas,
    comunas: data.comunas,
    gruposInteres: data.gruposInteres.map((g) => ({
      ...g,
      descripcion: g.descripcion ?? undefined,
    })),
    sociosComunitarios: data.sociosComunitarios.map((s) => ({
      ...s,
      descripcion: s.descripcion ?? undefined,
    })),
    sedes: data.sedes,
    fondos: data.fondos,
    lineas: data.lineas ?? [],
  };
}

export function useGeneralTab({
  project,
  setProject,
  fetchProyectos,
  selectedTab,
  projectVideos,
  setProjectVideos,
  onSaveSuccess,
  onSaveRevert,
  showAddForm = false,
}: {
  project: ProyectoWithRelations | null;
  setProject: React.Dispatch<React.SetStateAction<ProyectoWithRelations | null>>;
  fetchProyectos: (opts?: { silent?: boolean; activeRole?: string }) => void;
  selectedTab: ProyectoTabName;
  projectVideos: Record<string, string>;
  setProjectVideos: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSaveSuccess: () => void;
  onSaveRevert?: () => void;
  showAddForm?: boolean;
}) {
  const queryClient = useQueryClient();
  const [editingField, setEditingField] = useState<GeneralFieldId | null>(null);
  const [isGeneralSaving, setIsGeneralSaving] = useState(false);
  const [generalDraft, setGeneralDraft] = useState<GeneralDraft | null>(null);
  const [catalogosGeneral, setCatalogosGeneral] =
    useState<CatalogosGeneral>(EMPTY_CATALOGOS);
  const [catalogosLoading, setCatalogosLoading] = useState(false);
  const catalogosLoadingRef = useRef(false);
  const catalogosPromiseRef = useRef<Promise<CatalogosGeneral> | null>(null);
  const catalogosRef = useRef<CatalogosGeneral>(EMPTY_CATALOGOS);

  const [tempVideoUrl, setTempVideoUrl] = useState('');
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [activeDesarrolloTecnicoTab, setActiveDesarrolloTecnicoTab] =
    useState<string>('fases-anteriores');
  const [activeInfoBasicaTab, setActiveInfoBasicaTab] =
    useState<string>('local-disciplinar');

  const getProjectVideoUrl = (proj: ProyectoWithRelations) =>
    (proj as ProyectoWithRelations & { youtubeUrl?: string | null }).youtubeUrl ??
    projectVideos[proj.id] ??
    '';

  const loadCatalogosGeneral = async (
    force = false
  ): Promise<CatalogosGeneral> => {
    if (!force) {
      const cached = queryClient.getQueryData<CatalogosGeneral>(
        catalogosGeneralKey
      );
      if (cached) {
        catalogosRef.current = cached;
        setCatalogosGeneral(cached);
        return cached;
      }
    }
    if (catalogosLoadingRef.current && catalogosPromiseRef.current) {
      return catalogosPromiseRef.current;
    }

    catalogosLoadingRef.current = true;
    setCatalogosLoading(true);

    const promise = (async () => {
      if (force) {
        await queryClient.invalidateQueries({ queryKey: catalogosGeneralKey });
      }
      const next = await queryClient.fetchQuery({
        queryKey: catalogosGeneralKey,
        queryFn: async () => {
          const result = await getCatalogosGeneral();
          if (!result.success || !result.data) {
            throw new Error(result.error ?? 'Error al obtener catálogos');
          }
          return mapCatalogosResult(result.data);
        },
        staleTime: 10 * 60_000,
      });

      catalogosRef.current = next;
      setCatalogosGeneral(next);
      return next;
    })();

    catalogosPromiseRef.current = promise;

    try {
      return await promise;
    } catch {
      return EMPTY_CATALOGOS;
    } finally {
      catalogosLoadingRef.current = false;
      catalogosPromiseRef.current = null;
      setCatalogosLoading(false);
    }
  };

  const handleStartEditField = (field: GeneralFieldId) => {
    if (!project) return;
    const draft = buildGeneralDraft(project);
    if (
      field === 'objetivosEspecificos' &&
      draft.objetivosEspecificos.length === 0
    ) {
      draft.objetivosEspecificos = [
        {
          id: `temp-${Date.now()}`,
          descripcion: '',
          orden: 0,
        },
      ];
    }
    setGeneralDraft(draft);
    setTempVideoUrl(getProjectVideoUrl(project));
    setEditingField(field);
    // Asegurar catálogos si el prefetch aún no terminó o falló
    void loadCatalogosGeneral();
  };

  const handleCancelGeneralEdit = () => {
    if (!project) return;
    setGeneralDraft(buildGeneralDraft(project));
    setTempVideoUrl(getProjectVideoUrl(project));
    setEditingField(null);
  };

  const handleSaveGeneralTab = async () => {
    if (!project || !generalDraft || isGeneralSaving) return;
    const fieldBeingEdited = editingField;
    const previousProject = project;
    const previousVideoUrl = tempVideoUrl;

    try {
      setIsGeneralSaving(true);
      const catalogs = await loadCatalogosGeneral();

      const escuelasNames = parseNameList(generalDraft.escuelasTexto);
      const carrerasNames = parseNameList(generalDraft.carrerasTexto);
      const asignaturasNames = parseNameList(generalDraft.asignaturasTexto);
      const comunasNames = parseNameList(generalDraft.comunasTexto);
      const gruposNames = parseNameList(generalDraft.gruposInteresTexto);
      const sociosNames = parseNameList(generalDraft.sociosComunitariosTexto);

      const escuelasMapped = mapNamesToIds(escuelasNames, catalogs.escuelas);
      const carrerasMapped = mapNamesToIds(carrerasNames, catalogs.carreras);
      const asignaturasMapped = mapNamesToIds(
        asignaturasNames,
        catalogs.asignaturas
      );
      const comunasMapped = mapNamesToIds(comunasNames, catalogs.comunas);
      const gruposMapped = mapNamesToIds(gruposNames, catalogs.gruposInteres);
      const sociosMapped = mapNamesToIds(
        sociosNames,
        catalogs.sociosComunitarios
      );

      const missing: string[] = [
        ...escuelasMapped.missing,
        ...carrerasMapped.missing,
        ...asignaturasMapped.missing,
        ...comunasMapped.missing,
        ...gruposMapped.missing,
        ...sociosMapped.missing,
      ];

      if (missing.length > 0) {
        alert(
          `No se encontraron estos valores en el catálogo: ${missing.join(', ')}`
        );
        setIsGeneralSaving(false);
        return;
      }

      const initialDraft = buildGeneralDraft(project);
      const idsEqual = (a: string[], b: string[]) => {
        if (a.length !== b.length) return false;
        const sa = [...a].sort();
        const sb = [...b].sort();
        return sa.every((id, i) => id === sb[i]);
      };

      const payload: Parameters<typeof updateProyectoGeneralTab>[0] = {
        proyectoId: project.id,
      };

      if (generalDraft.proyecto.trim() !== initialDraft.proyecto.trim()) {
        payload.proyecto = generalDraft.proyecto.trim();
      }
      if (generalDraft.fondo.trim() !== initialDraft.fondo.trim()) {
        payload.fondo = generalDraft.fondo.trim();
      }
      if (generalDraft.linea.trim() !== initialDraft.linea.trim()) {
        payload.linea = generalDraft.linea.trim() || null;
      }
      if (generalDraft.sede.trim() !== initialDraft.sede.trim()) {
        payload.sede = generalDraft.sede.trim();
      }
      const currentVideoUrl =
        (project as ProyectoWithRelations & { youtubeUrl?: string | null })
          .youtubeUrl ?? '';
      if (tempVideoUrl.trim() !== currentVideoUrl.trim()) {
        const videoTrimmed = tempVideoUrl.trim();
        if (videoTrimmed && !extractYouTubeVideoId(videoTrimmed)) {
          alert('Por favor ingresa una URL válida de YouTube');
          setIsGeneralSaving(false);
          return;
        }
        payload.youtubeUrl = videoTrimmed || null;
      }
      if (
        generalDraft.objetivoGeneralId !== initialDraft.objetivoGeneralId ||
        generalDraft.objetivoGeneral.trim() !==
          initialDraft.objetivoGeneral.trim()
      ) {
        payload.objetivoGeneral = {
          id: generalDraft.objetivoGeneralId,
          descripcion: generalDraft.objetivoGeneral.trim(),
        };
      }
      const obsEq =
        generalDraft.objetivosEspecificos.length ===
          initialDraft.objetivosEspecificos.length &&
        generalDraft.objetivosEspecificos.every(
          (o, i) =>
            o.id === initialDraft.objetivosEspecificos[i]?.id &&
            o.descripcion.trim() ===
              initialDraft.objetivosEspecificos[i]?.descripcion?.trim() &&
            o.orden === initialDraft.objetivosEspecificos[i]?.orden
        );
      if (!obsEq) {
        payload.objetivosEspecificos = generalDraft.objetivosEspecificos.map(
          (obj) => ({
            ...obj,
            descripcion: obj.descripcion.trim(),
          })
        );
      }
      const initialEscuelasIds = mapNamesToIds(
        parseNameList(initialDraft.escuelasTexto),
        catalogs.escuelas
      ).ids;
      if (!idsEqual(escuelasMapped.ids, initialEscuelasIds)) {
        payload.escuelasIds = escuelasMapped.ids;
      }
      const initialCarrerasIds = mapNamesToIds(
        parseNameList(initialDraft.carrerasTexto),
        catalogs.carreras
      ).ids;
      if (!idsEqual(carrerasMapped.ids, initialCarrerasIds)) {
        payload.carrerasIds = carrerasMapped.ids;
      }
      const initialAsignaturasIds = mapNamesToIds(
        parseNameList(initialDraft.asignaturasTexto),
        catalogs.asignaturas
      ).ids;
      if (!idsEqual(asignaturasMapped.ids, initialAsignaturasIds)) {
        payload.asignaturasIds = asignaturasMapped.ids;
      }
      const initialComunasIds = mapNamesToIds(
        parseNameList(initialDraft.comunasTexto),
        catalogs.comunas
      ).ids;
      if (!idsEqual(comunasMapped.ids, initialComunasIds)) {
        payload.comunasIds = comunasMapped.ids;
      }
      const initialGruposIds = mapNamesToIds(
        parseNameList(initialDraft.gruposInteresTexto),
        catalogs.gruposInteres
      ).ids;
      if (!idsEqual(gruposMapped.ids, initialGruposIds)) {
        payload.gruposInteresIds = gruposMapped.ids;
      }
      const initialSociosIds = mapNamesToIds(
        parseNameList(initialDraft.sociosComunitariosTexto),
        catalogs.sociosComunitarios
      ).ids;
      if (!idsEqual(sociosMapped.ids, initialSociosIds)) {
        payload.sociosComunitariosIds = sociosMapped.ids;
      }
      const dtKeys: (keyof GeneralDraft['desarrolloTecnico'])[] = [
        'continuidadFasesAnteriores',
        'pertinenciaLocal',
        'pertinenciaDisciplinar',
        'necesidadProblema',
        'publicoObjetivo',
        'solucionAvance',
        'perspectiveGenero',
        'resultadosContribucion',
        'metodologiaMedicion',
        'ejesImpacto',
        'factorInnovador',
        'escalabilidad',
      ];
      const dtChanged = dtKeys.some(
        (k) =>
          generalDraft.desarrolloTecnico[k].trim() !==
          initialDraft.desarrolloTecnico[k].trim()
      );
      if (dtChanged) {
        payload.desarrolloTecnico = {
          continuidadFasesAnteriores:
            generalDraft.desarrolloTecnico.continuidadFasesAnteriores.trim(),
          pertinenciaLocal:
            generalDraft.desarrolloTecnico.pertinenciaLocal.trim(),
          pertinenciaDisciplinar:
            generalDraft.desarrolloTecnico.pertinenciaDisciplinar.trim(),
          necesidadProblema:
            generalDraft.desarrolloTecnico.necesidadProblema.trim(),
          publicoObjetivo:
            generalDraft.desarrolloTecnico.publicoObjetivo.trim(),
          solucionAvance: generalDraft.desarrolloTecnico.solucionAvance.trim(),
          perspectiveGenero:
            generalDraft.desarrolloTecnico.perspectiveGenero.trim(),
          resultadosContribucion:
            generalDraft.desarrolloTecnico.resultadosContribucion.trim(),
          metodologiaMedicion:
            generalDraft.desarrolloTecnico.metodologiaMedicion.trim(),
          ejesImpacto: generalDraft.desarrolloTecnico.ejesImpacto.trim(),
          factorInnovador:
            generalDraft.desarrolloTecnico.factorInnovador.trim(),
          escalabilidad: generalDraft.desarrolloTecnico.escalabilidad.trim(),
        };
      }

      const extraKeys = new Set([
        ...Object.keys(generalDraft.desarrolloTecnicoExtra),
        ...Object.keys(initialDraft.desarrolloTecnicoExtra),
      ]);
      const extraChanged = [...extraKeys].some(
        (id) =>
          (generalDraft.desarrolloTecnicoExtra[id] ?? '').trim() !==
          (initialDraft.desarrolloTecnicoExtra[id] ?? '').trim()
      );
      if (extraChanged) {
        payload.desarrolloTecnicoValores = [...extraKeys].map((subcategoriaId) => ({
          subcategoriaId,
          valor: (generalDraft.desarrolloTecnicoExtra[subcategoriaId] ?? '').trim(),
        }));
      }

      const optimisticObjetivosRel = [
        ...(generalDraft.objetivoGeneral.trim()
          ? [
              {
                id: generalDraft.objetivoGeneralId ?? `temp-og-${Date.now()}`,
                descripcion: generalDraft.objetivoGeneral.trim(),
                orden: 0,
                tipo: 'General' as const,
                proyectoId: project.id,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]
          : []),
        ...generalDraft.objetivosEspecificos
          .filter((o) => o.descripcion.trim())
          .map((o) => ({
            id: o.id,
            descripcion: o.descripcion.trim(),
            orden: o.orden,
            tipo: 'Especifico' as const,
            proyectoId: project.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
      ];
      const optimisticDesarrolloTecnico = {
        ...(project.desarrolloTecnico ?? {
          id: `temp-dt-${project.id}`,
          proyectoId: project.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        continuidadFasesAnteriores:
          generalDraft.desarrolloTecnico.continuidadFasesAnteriores.trim(),
        pertinenciaLocal:
          generalDraft.desarrolloTecnico.pertinenciaLocal.trim(),
        pertinenciaDisciplinar:
          generalDraft.desarrolloTecnico.pertinenciaDisciplinar.trim(),
        necesidadProblema:
          generalDraft.desarrolloTecnico.necesidadProblema.trim(),
        publicoObjetivo: generalDraft.desarrolloTecnico.publicoObjetivo.trim(),
        solucionAvance: generalDraft.desarrolloTecnico.solucionAvance.trim(),
        perspectiveGenero:
          generalDraft.desarrolloTecnico.perspectiveGenero.trim(),
        resultadosContribucion:
          generalDraft.desarrolloTecnico.resultadosContribucion.trim(),
        metodologiaMedicion:
          generalDraft.desarrolloTecnico.metodologiaMedicion.trim(),
        ejesImpacto: generalDraft.desarrolloTecnico.ejesImpacto.trim(),
        factorInnovador:
          generalDraft.desarrolloTecnico.factorInnovador.trim(),
        escalabilidad: generalDraft.desarrolloTecnico.escalabilidad.trim(),
      };

      const optimisticValoresBySub = new Map(
        (project.desarrolloTecnicoValores ?? []).map((v) => [
          v.subcategoriaId,
          v,
        ])
      );
      for (const [subcategoriaId, valor] of Object.entries(
        generalDraft.desarrolloTecnicoExtra
      )) {
        const existing = optimisticValoresBySub.get(subcategoriaId);
        optimisticValoresBySub.set(subcategoriaId, {
          id: existing?.id ?? `temp-dtv-${subcategoriaId}`,
          proyectoId: project.id,
          subcategoriaId,
          valor: valor.trim(),
          subcategoria: existing?.subcategoria,
        });
      }

      // Incluir relaciones en el optimista: la vista lee project.escuelas/etc., no el draft
      const optimisticProject = {
        ...project,
        proyecto: generalDraft.proyecto.trim(),
        fondo: generalDraft.fondo.trim(),
        linea: generalDraft.linea.trim() || null,
        sede: generalDraft.sede.trim(),
        youtubeUrl: tempVideoUrl.trim() || null,
        objetivos_rel: optimisticObjetivosRel,
        desarrolloTecnico: optimisticDesarrolloTecnico,
        desarrolloTecnicoValores: [...optimisticValoresBySub.values()],
        escuelas: buildOptimisticRelationRows(
          project.id,
          escuelasMapped.ids,
          catalogs.escuelas,
          'escuelaId',
          'escuela'
        ),
        carreras: buildOptimisticRelationRows(
          project.id,
          carrerasMapped.ids,
          catalogs.carreras,
          'carreraId',
          'carrera'
        ),
        asignaturas: buildOptimisticRelationRows(
          project.id,
          asignaturasMapped.ids,
          catalogs.asignaturas,
          'asignaturaId',
          'asignatura'
        ),
        comunas: buildOptimisticRelationRows(
          project.id,
          comunasMapped.ids,
          catalogs.comunas,
          'comunaId',
          'comuna'
        ),
        gruposInteres: buildOptimisticRelationRows(
          project.id,
          gruposMapped.ids,
          catalogs.gruposInteres,
          'grupoInteresId',
          'grupoInteres'
        ),
        sociosComunitarios: buildOptimisticRelationRows(
          project.id,
          sociosMapped.ids,
          catalogs.sociosComunitarios,
          'socioComunitarioId',
          'socioComunitario'
        ),
      } as unknown as ProyectoWithRelations & { youtubeUrl?: string | null };

      setProject(optimisticProject);
      setGeneralDraft(buildGeneralDraft(optimisticProject));
      setTempVideoUrl(tempVideoUrl.trim());
      setProjectVideos((prev) => ({
        ...prev,
        [project.id]: tempVideoUrl.trim() || '',
      }));
      setEditingField(null);
      onSaveSuccess();
      setIsGeneralSaving(false);

      const result = await updateProyectoGeneralTab(payload);

      if (!result.success || !result.data) {
        setProject(previousProject);
        setGeneralDraft(buildGeneralDraft(previousProject));
        setTempVideoUrl(previousVideoUrl);
        setProjectVideos((prev) => ({
          ...prev,
          [previousProject.id]:
            (previousProject as ProyectoWithRelations & {
              youtubeUrl?: string | null;
            }).youtubeUrl ??
            previousVideoUrl ??
            '',
        }));
        setEditingField(fieldBeingEdited);
        onSaveRevert?.();
        alert(result.error || 'Error al actualizar el proyecto');
        return;
      }

      const updated = result.data as ProyectoWithRelations & {
        youtubeUrl?: string | null;
      };
      setProject((prev) =>
        ({
          ...updated,
          activities: prev?.activities ?? updated.activities,
        }) as ProyectoWithRelations
      );
      setGeneralDraft(buildGeneralDraft(updated));
      setTempVideoUrl(updated.youtubeUrl ?? '');
      setProjectVideos((prev) => ({
        ...prev,
        [updated.id]: updated.youtubeUrl ?? '',
      }));
      fetchProyectos({ silent: true });
    } catch {
      setProject(previousProject);
      setGeneralDraft(buildGeneralDraft(previousProject));
      setTempVideoUrl(previousVideoUrl);
      setEditingField(fieldBeingEdited);
      onSaveRevert?.();
      setIsGeneralSaving(false);
      alert('Error inesperado al guardar los cambios');
    }
  };

  useEffect(() => {
    if (!project) {
      setGeneralDraft(null);
      return;
    }
    setGeneralDraft(buildGeneralDraft(project));
    setTempVideoUrl(getProjectVideoUrl(project));
    setEditingField(null);
  }, [project]);

  useEffect(() => {
    if (
      selectedTab !== 'General' &&
      editingField &&
      editingField !== 'fondo'
    ) {
      setEditingField(null);
    }
  }, [selectedTab, editingField]);

  // Catálogos solo al abrir formulario de alta (edición dispara load en handleStartEditField)
  useEffect(() => {
    if (showAddForm) {
      void loadCatalogosGeneral();
    }
  }, [showAddForm]);

  return {
    editingField,
    isGeneralSaving,
    generalDraft,
    setGeneralDraft,
    catalogosGeneral,
    catalogosLoading,
    tempVideoUrl,
    setTempVideoUrl,
    expandedSections,
    setExpandedSections,
    activeDesarrolloTecnicoTab,
    setActiveDesarrolloTecnicoTab,
    activeInfoBasicaTab,
    setActiveInfoBasicaTab,
    loadCatalogosGeneral,
    handleStartEditField,
    handleCancelGeneralEdit,
    handleSaveGeneralTab,
  };
}

export type UseGeneralTabReturn = ReturnType<typeof useGeneralTab>;

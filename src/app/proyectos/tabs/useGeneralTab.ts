'use client';

import { useEffect, useState } from 'react';
import {
  getCarreras,
  getComunas,
  getEscuelas,
  getGruposInteres,
  getSociosComunitarios,
  updateProyectoGeneralTab,
} from '@/lib/actions/proyectos';
import { getSedes } from '@/lib/actions/configuracion';
import type { ProyectoWithRelations } from '@/types/proyecto';
import {
  buildGeneralDraft,
  extractYouTubeVideoId,
  mapNamesToIds,
  parseNameList,
  type CatalogosGeneral,
  type GeneralDraft,
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
  const [isGeneralEditMode, setIsGeneralEditMode] = useState(false);
  const [isGeneralSaving, setIsGeneralSaving] = useState(false);
  const [generalDraft, setGeneralDraft] = useState<GeneralDraft | null>(null);
  const [catalogosGeneral, setCatalogosGeneral] = useState<CatalogosGeneral>({
    escuelas: [],
    carreras: [],
    comunas: [],
    gruposInteres: [],
    sociosComunitarios: [],
    sedes: [],
  });
  const [catalogosLoading, setCatalogosLoading] = useState(false);
  const [tempVideoUrl, setTempVideoUrl] = useState('');
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [activeDesarrolloTecnicoTab, setActiveDesarrolloTecnicoTab] =
    useState<string>('fases-anteriores');
  const [activeInfoBasicaTab, setActiveInfoBasicaTab] =
    useState<string>('local-disciplinar');

  const loadCatalogosGeneral = async () => {
    if (catalogosLoading) return;
    setCatalogosLoading(true);

    const [
      escuelasResult,
      carrerasResult,
      comunasResult,
      gruposResult,
      sociosResult,
      sedesList,
    ] = await Promise.all([
      getEscuelas(),
      getCarreras(),
      getComunas(),
      getGruposInteres(),
      getSociosComunitarios(),
      getSedes(),
    ]);

    setCatalogosGeneral({
      escuelas: escuelasResult.success ? (escuelasResult.data ?? []) : [],
      carreras: carrerasResult.success ? (carrerasResult.data ?? []) : [],
      comunas: comunasResult.success ? (comunasResult.data ?? []) : [],
      gruposInteres: gruposResult.success
        ? (gruposResult.data ?? []).map((g) => ({
            ...g,
            descripcion: g.descripcion ?? undefined,
          }))
        : [],
      sociosComunitarios: sociosResult.success
        ? (sociosResult.data ?? []).map((s) => ({
            ...s,
            descripcion: s.descripcion ?? undefined,
          }))
        : [],
      sedes: sedesList ?? [],
    });

    setCatalogosLoading(false);
  };

  const handleToggleGeneralEditMode = () => {
    if (!project) return;
    if (!isGeneralEditMode) {
      setGeneralDraft(buildGeneralDraft(project));
    }
    setIsGeneralEditMode((prev) => !prev);
  };

  const handleCancelGeneralEdit = () => {
    if (!project) return;
    setGeneralDraft(buildGeneralDraft(project));
    const videoUrl =
      (project as ProyectoWithRelations & { youtubeUrl?: string | null })
        .youtubeUrl ??
      projectVideos[project.id] ??
      '';
    setTempVideoUrl(videoUrl);
    setIsGeneralEditMode(false);
  };

  const handleSaveGeneralTab = async () => {
    if (!project || !generalDraft || isGeneralSaving) return;

    try {
      if (
        catalogosGeneral.escuelas.length === 0 &&
        catalogosGeneral.carreras.length === 0 &&
        catalogosGeneral.comunas.length === 0 &&
        catalogosGeneral.gruposInteres.length === 0 &&
        catalogosGeneral.sociosComunitarios.length === 0
      ) {
        await loadCatalogosGeneral();
      }

      const escuelasNames = parseNameList(generalDraft.escuelasTexto);
      const carrerasNames = parseNameList(generalDraft.carrerasTexto);
      const comunasNames = parseNameList(generalDraft.comunasTexto);
      const gruposNames = parseNameList(generalDraft.gruposInteresTexto);
      const sociosNames = parseNameList(generalDraft.sociosComunitariosTexto);

      const escuelasMapped = mapNamesToIds(
        escuelasNames,
        catalogosGeneral.escuelas
      );
      const carrerasMapped = mapNamesToIds(
        carrerasNames,
        catalogosGeneral.carreras
      );
      const comunasMapped = mapNamesToIds(
        comunasNames,
        catalogosGeneral.comunas
      );
      const gruposMapped = mapNamesToIds(
        gruposNames,
        catalogosGeneral.gruposInteres
      );
      const sociosMapped = mapNamesToIds(
        sociosNames,
        catalogosGeneral.sociosComunitarios
      );

      const missing: string[] = [
        ...escuelasMapped.missing,
        ...carrerasMapped.missing,
        ...comunasMapped.missing,
        ...gruposMapped.missing,
        ...sociosMapped.missing,
      ];

      if (missing.length > 0) {
        alert(
          `No se encontraron estos valores en el catálogo: ${missing.join(', ')}`
        );
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
        catalogosGeneral.escuelas
      ).ids;
      if (!idsEqual(escuelasMapped.ids, initialEscuelasIds)) {
        payload.escuelasIds = escuelasMapped.ids;
      }
      const initialCarrerasIds = mapNamesToIds(
        parseNameList(initialDraft.carrerasTexto),
        catalogosGeneral.carreras
      ).ids;
      if (!idsEqual(carrerasMapped.ids, initialCarrerasIds)) {
        payload.carrerasIds = carrerasMapped.ids;
      }
      const initialComunasIds = mapNamesToIds(
        parseNameList(initialDraft.comunasTexto),
        catalogosGeneral.comunas
      ).ids;
      if (!idsEqual(comunasMapped.ids, initialComunasIds)) {
        payload.comunasIds = comunasMapped.ids;
      }
      const initialGruposIds = mapNamesToIds(
        parseNameList(initialDraft.gruposInteresTexto),
        catalogosGeneral.gruposInteres
      ).ids;
      if (!idsEqual(gruposMapped.ids, initialGruposIds)) {
        payload.gruposInteresIds = gruposMapped.ids;
      }
      const initialSociosIds = mapNamesToIds(
        parseNameList(initialDraft.sociosComunitariosTexto),
        catalogosGeneral.sociosComunitarios
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

      const optimisticObjetivosRel = [
        ...(generalDraft.objetivoGeneral.trim()
          ? [
              {
                id: generalDraft.objetivoGeneralId ?? '',
                descripcion: generalDraft.objetivoGeneral.trim(),
                orden: 0,
                tipo: 'General' as const,
              },
            ]
          : []),
        ...generalDraft.objetivosEspecificos.map((o) => ({
          id: o.id,
          descripcion: o.descripcion.trim(),
          orden: o.orden,
          tipo: 'Especifico' as const,
        })),
      ];
      const optimisticDesarrolloTecnico = {
        ...project.desarrolloTecnico,
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
        solucionAvance:
          generalDraft.desarrolloTecnico.solucionAvance.trim(),
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
      const optimisticProject = {
        ...project,
        proyecto: generalDraft.proyecto.trim(),
        sede: generalDraft.sede.trim(),
        youtubeUrl: tempVideoUrl.trim() || null,
        objetivos_rel: optimisticObjetivosRel,
        desarrolloTecnico: optimisticDesarrolloTecnico,
      } as ProyectoWithRelations & { youtubeUrl?: string | null };

      setProject(optimisticProject);
      setGeneralDraft(buildGeneralDraft(optimisticProject));
      setTempVideoUrl(tempVideoUrl.trim());
      setProjectVideos((prev) => ({
        ...prev,
        [project.id]: tempVideoUrl.trim() || '',
      }));
      setIsGeneralEditMode(false);
      onSaveSuccess();
      setIsGeneralSaving(false);

      const result = await updateProyectoGeneralTab(payload);

      if (!result.success || !result.data) {
        setIsGeneralEditMode(true);
        onSaveRevert?.();
        alert(result.error || 'Error al actualizar el proyecto');
        return;
      }

      const updated = result.data as ProyectoWithRelations & {
        youtubeUrl?: string | null;
      };
      setProject(result.data);
      setGeneralDraft(buildGeneralDraft(result.data));
      setTempVideoUrl(updated.youtubeUrl ?? '');
      setProjectVideos((prev) => ({
        ...prev,
        [updated.id]: updated.youtubeUrl ?? '',
      }));
      fetchProyectos({ silent: true });
    } catch {
      setIsGeneralEditMode(true);
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
    const videoUrl =
      (project as ProyectoWithRelations & { youtubeUrl?: string | null })
        .youtubeUrl ??
      projectVideos[project.id] ??
      '';
    setTempVideoUrl(videoUrl);
    setIsGeneralEditMode(false);
  }, [project]);

  useEffect(() => {
    if (selectedTab !== 'General' && isGeneralEditMode) {
      setIsGeneralEditMode(false);
    }
  }, [selectedTab, isGeneralEditMode]);

  useEffect(() => {
    if (isGeneralEditMode) {
      loadCatalogosGeneral();
    }
  }, [isGeneralEditMode]);

  useEffect(() => {
    if (showAddForm && catalogosGeneral.sedes.length === 0) {
      loadCatalogosGeneral();
    }
  }, [showAddForm]);

  return {
    isGeneralEditMode,
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
    handleToggleGeneralEditMode,
    handleCancelGeneralEdit,
    handleSaveGeneralTab,
  };
}

export type UseGeneralTabReturn = ReturnType<typeof useGeneralTab>;

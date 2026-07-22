'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search,
  FolderKanban,
  Plus,
  Save,
  X,
  ChevronLeft,
  Users,
  HandCoins,
  Target,
  Check,
  Pencil,
  GitBranch,
  MapPin,
  GraduationCap,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useProyectosParaUsuario } from '@/hooks/useProyectosParaUsuario';
import { ProyectoWithRelations } from '@/types/proyecto';
import type { ProyectoListadoItem } from '@/lib/actions/proyectos';
import {
  ResumenTab,
  GanttTab,
  IndicadoresTab,
  PresupuestoTab,
  HistorialTab,
  SeguimientoTab,
} from '@/app/proyectos/tabs/ProyectoTabs';
import { GeneralTab, GeneralTabHeader } from '@/app/proyectos/tabs/GeneralTab';
import { ParticipantesTab } from '@/app/proyectos/tabs/ParticipantesTab';
import { useGeneralTab } from '@/app/proyectos/tabs/useGeneralTab';
import {
  usePrefetchProyecto,
  useFetchProyectoBase,
  setProyectoBaseCache,
} from '@/hooks/useProyectoQuery';
import { useQueryClient } from '@tanstack/react-query';
import { proyectoBaseKey } from '@/lib/query-keys';
import { getProyectoBorradores } from '@/lib/actions/borradores';
import type { BorradorListItem } from '@/lib/actions/borradores';

type ProyectoTab =
  | 'Resumen'
  | 'General'
  | 'Participantes'
  | 'Gantt'
  | 'Indicadores'
  | 'Presupuesto'
  | 'Historial'
  | 'Seguimiento';

const PROJECT_NAV_TABS: { id: ProyectoTab; label: string }[] = [
  { id: 'Resumen', label: 'Resumen' },
  { id: 'General', label: 'General' },
  { id: 'Participantes', label: 'Participantes' },
  { id: 'Gantt', label: 'Actividades' },
  { id: 'Indicadores', label: 'Indicadores' },
  { id: 'Presupuesto', label: 'Presupuesto' },
  { id: 'Seguimiento', label: 'Seguimiento' },
  { id: 'Historial', label: 'Historial' },
];

export function ProyectosContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const {
    proyectos: proyectosIniciales,
    loading,
    error,
    fetchProyectos,
    createProyecto,
    updateProyecto,
    deleteProyecto,
  } = useProyectosParaUsuario();
  const hasAppliedIdFromUrlRef = useRef(false);
  const borradoresLoadedRef = useRef(false);
  const queryClient = useQueryClient();
  const prefetchProyecto = usePrefetchProyecto();
  const fetchProyectoBase = useFetchProyectoBase();

  const [mountedTabs, setMountedTabs] = useState<Set<ProyectoTab>>(
    () => new Set(['General'])
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] =
    useState<ProyectoWithRelations | null>(null);
  const [selectingProjectId, setSelectingProjectId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [borradores, setBorradores] = useState<BorradorListItem[]>([]);
  const [selectedTab, setSelectedTab] = useState<ProyectoTab>('General');

  // Estado para videos de YouTube por proyecto
  const [projectVideos, setProjectVideos] = useState<Record<string, string>>(
    {}
  );

  const [showGeneralSaveToast, setShowGeneralSaveToast] = useState(false);

  const setSelectedProjectAndCache = useCallback(
    (update: React.SetStateAction<ProyectoWithRelations | null>) => {
      setSelectedProject((prev) => {
        const next = typeof update === 'function' ? update(prev) : update;
        if (next) {
          setProyectoBaseCache(queryClient, next);
        }
        return next;
      });
    },
    [queryClient]
  );

  const {
    catalogosGeneral,
    catalogosLoading,
    editingField,
    generalDraft,
    setGeneralDraft,
    isGeneralSaving,
    handleStartEditField,
    handleSaveGeneralTab,
    handleCancelGeneralEdit,
    tempVideoUrl,
    setTempVideoUrl,
  } = useGeneralTab({
    project: selectedProject,
    setProject: setSelectedProjectAndCache,
    fetchProyectos,
    selectedTab,
    projectVideos,
    setProjectVideos,
    onSaveSuccess: () => setShowGeneralSaveToast(true),
    onSaveRevert: () => setShowGeneralSaveToast(false),
    showAddForm,
  });

  const [formData, setFormData] = useState({
    proyecto: '',
    fondo: '',
    linea: '',
    sede: '',
    escuela: '',
    avanceGantt: 0,
    objetivos: 0,
    presupuestoUsado: 0,
    presupuestoTotal: 0,
    participantes: 0,
  });

  const lineasForSelectedFondo = useMemo(() => {
    const fondoNombre = showAddForm
      ? formData.fondo
      : editingField === 'fondo' || editingField === 'linea'
        ? generalDraft?.fondo || selectedProject?.fondo || ''
        : selectedProject?.fondo || formData.fondo || '';
    if (!fondoNombre) return [];
    return catalogosGeneral.lineas.filter((l) => l.fondoNombre === fondoNombre);
  }, [
    catalogosGeneral.lineas,
    editingField,
    formData.fondo,
    generalDraft?.fondo,
    selectedProject?.fondo,
    showAddForm,
  ]);

  const selectedProjectSedeNames = useMemo(() => {
    return (selectedProject?.sede ?? '')
      .split(/\s*\|\s*|\s*,\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [selectedProject?.sede]);

  const selectedProjectEscuelaNames = useMemo(() => {
    return (
      selectedProject?.escuelas?.map((e) => e.escuela.nombre).filter(Boolean) ??
      []
    );
  }, [selectedProject?.escuelas]);

  const filteredProjects = useMemo(
    () =>
      proyectosIniciales.filter(
        (project) =>
          project.proyecto.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.sede.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.escuelas?.some((escuelaRel) =>
            escuelaRel.escuela.nombre
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
          ) ||
          false
      ),
    [proyectosIniciales, searchTerm]
  );

  const rolEnProyectoSeguimiento = useMemo(() => {
    if (!selectedProject) return null;
    const participantes = selectedProject.participantes_rel ?? [];
    const userId = session?.user?.id;
    const userEmail = session?.user?.email?.trim().toLowerCase();
    const isMe = (p: { userId?: string | null; email?: string | null }) =>
      p.userId === userId ||
      (userEmail && p.email?.trim().toLowerCase() === userEmail);
    const isCoord = participantes.some(
      (p) => isMe(p) && (p.rol?.trim().toLowerCase() ?? '') === 'coordinador'
    );
    if (isCoord) return 'Coordinador';
    const first = participantes.find(isMe);
    return first?.rol ?? null;
  }, [selectedProject, session?.user?.id, session?.user?.email]);

  // Si el proyecto seleccionado ya no está en la lista (ej. cambió de rol), limpiar selección
  useEffect(() => {
    if (selectedProject && proyectosIniciales.length > 0) {
      const estaEnLista = proyectosIniciales.some((p) => p.id === selectedProject.id);
      if (!estaEnLista) {
        setSelectedProject(null);
      }
    }
  }, [proyectosIniciales, selectedProject?.id]);

  // Preseleccionar proyecto cuando se llega con ?id= (ej. desde Inicio "Ir"). Opcional: ?tab=Seguimiento para abrir ese tab.
  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    const tabFromUrl = searchParams.get('tab');
    if (!idFromUrl || hasAppliedIdFromUrlRef.current || proyectosIniciales.length === 0) return;
    const project = proyectosIniciales.find((p) => p.id === idFromUrl);
    if (!project) return;
    hasAppliedIdFromUrlRef.current = true;
    const tabToSelect = tabFromUrl === 'Seguimiento' ? ('Seguimiento' as const) : null;
    (async () => {
      const cached = queryClient.getQueryData<ProyectoWithRelations>(
        proyectoBaseKey(project.id)
      );
      if (!cached) setSelectingProjectId(project.id);
      try {
        const data = cached ?? (await fetchProyectoBase(project.id));
        setSelectedProject(data);
        if (tabToSelect) setSelectedTab(tabToSelect);
        const videoUrl =
          (data as ProyectoWithRelations & { youtubeUrl?: string | null })
            .youtubeUrl ??
          projectVideos[project.id] ??
          '';
        setTempVideoUrl(videoUrl);
      } finally {
        setSelectingProjectId(null);
      }
    })();
  }, [proyectosIniciales, searchParams, fetchProyectoBase, queryClient]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'fondo' ? { linea: '' } : {}),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (showEditForm && selectedProject) {
        const { data, error } = await updateProyecto(
          selectedProject.id,
          formData
        );
        if (error) {
          alert('Error al actualizar el proyecto: ' + error);
        } else {
          if (data) setSelectedProject(data as typeof selectedProject);
          setShowEditForm(false);
          fetchProyectos({ silent: true });
          alert('Proyecto actualizado exitosamente');
        }
      } else {
        const { data, error } = await createProyecto({
          proyecto: formData.proyecto,
          fondo: formData.fondo,
          linea: formData.linea || null,
          sede: formData.sede,
          focalizacion: null,
          objetivoGeneral: '',
          objetivosEspecificos: [],
          avanceGantt: formData.avanceGantt,
          objetivos: formData.objetivos,
          presupuestoUsado: formData.presupuestoUsado,
          presupuestoTotal: formData.presupuestoTotal,
          participantes: formData.participantes,
          escuelasIds: formData.escuela ? [formData.escuela] : [],
          carrerasIds: [],
          asignaturasIds: [],
          comunasIds: [],
          gruposInteresIds: [],
          sociosComunitariosIds: [],
          participantes_rel: [],
        });
        if (error) {
          alert('Error al crear el proyecto: ' + error);
        } else {
          setFormData({
            proyecto: '',
            fondo: '',
            linea: '',
            sede: '',
            escuela: '',
            avanceGantt: 0,
            objetivos: 0,
            presupuestoUsado: 0,
            presupuestoTotal: 0,
            participantes: 0,
          });
          setShowAddForm(false);
          if (data) setSelectedProject(data as typeof selectedProject);
          fetchProyectos({ silent: true });
          alert('Proyecto creado exitosamente');
        }
      }
    } catch (err) {
      alert('Error inesperado: ' + err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    if (
      confirm(
        `¿Estás seguro de que quieres eliminar el proyecto "${selectedProject.proyecto}"?`
      )
    ) {
      const { error } = await deleteProyecto(selectedProject.id);
      if (error) {
        alert('Error al eliminar el proyecto: ' + error);
      } else {
        setSelectedProject(null);
        alert('Proyecto eliminado exitosamente');
      }
    }
  };

  const handleAddProject = () => {
    setShowAddForm(true);
    setShowEditForm(false);
    setSelectedProject(null);
  };

  const handleEditProject = () => {
    if (!selectedProject) return;

    setShowEditForm(true);
    setShowAddForm(false);

    setFormData({
      proyecto: selectedProject.proyecto,
      fondo: selectedProject.fondo,
      linea: selectedProject.linea ?? '',
      sede: selectedProject.sede,
      escuela: '', // No direct escuela field in model
      avanceGantt: selectedProject.avanceGantt,
      objetivos: selectedProject.objetivos,
      presupuestoUsado: selectedProject.presupuestoUsado,
      presupuestoTotal: selectedProject.presupuestoTotal,
      participantes: selectedProject.participantes,
    });
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setShowEditForm(false);
    setFormData({
      proyecto: '',
      fondo: '',
      linea: '',
      sede: '',
      escuela: '',
      avanceGantt: 0,
      objetivos: 0,
      presupuestoUsado: 0,
      presupuestoTotal: 0,
      participantes: 0,
    });
  };

  const handleClearProjectSelection = () => {
    setSelectedProject(null);
  };

  const handleSelectProject = async (project: ProyectoListadoItem) => {
    const cached = queryClient.getQueryData<ProyectoWithRelations>(
      proyectoBaseKey(project.id)
    );
    if (cached) {
      setSelectedProject(cached);
      const videoUrl =
        (cached as ProyectoWithRelations & { youtubeUrl?: string | null })
          .youtubeUrl ??
        projectVideos[project.id] ??
        '';
      setTempVideoUrl(videoUrl);
      return;
    }
    setSelectingProjectId(project.id);
    try {
      const data = await fetchProyectoBase(project.id);
      setSelectedProject(data);
      const videoUrl =
        (data as ProyectoWithRelations & { youtubeUrl?: string | null })
          .youtubeUrl ??
        projectVideos[project.id] ??
        '';
      setTempVideoUrl(videoUrl);
    } finally {
      setSelectingProjectId(null);
    }
  };

  // Cargar borradores en landing (diferido para no competir con el listado inicial)
  useEffect(() => {
    if (selectedProject || showAddForm || showEditForm || borradoresLoadedRef.current) {
      if (selectedProject || showAddForm || showEditForm) {
        setBorradores([]);
      }
      return;
    }
    const load = () => {
      borradoresLoadedRef.current = true;
      getProyectoBorradores().then((res) => {
        if (res.success && res.data) setBorradores(res.data);
        else setBorradores([]);
      });
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(load, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [selectedProject, showAddForm, showEditForm]);

  useEffect(() => {
    if (!showGeneralSaveToast) return;
    const t = setTimeout(() => setShowGeneralSaveToast(false), 3000);
    return () => clearTimeout(t);
  }, [showGeneralSaveToast]);

  useEffect(() => {
    setMountedTabs((prev) => {
      if (prev.has(selectedTab as ProyectoTab)) return prev;
      const next = new Set(prev);
      next.add(selectedTab as ProyectoTab);
      return next;
    });
  }, [selectedTab]);

  const generateProjectSummary = (project: ProyectoWithRelations) => {
    const summaries = {
      'AntofaSuena 2025. Música-Industria-Territorio':
        'Este proyecto busca fortalecer la industria musical de Antofagasta mediante la creación de espacios de encuentro entre artistas locales, productores y la comunidad. Incluye la organización de festivales, talleres de producción musical y el desarrollo de una plataforma digital para promover el talento regional.',
      'Laboratorio de Innovación Gastronómico':
        'Iniciativa que combina la tradición culinaria local con técnicas modernas de gastronomía. El laboratorio servirá como espacio de experimentación para chefs emergentes, promoviendo el uso de ingredientes locales y sostenibles, además de generar nuevas propuestas gastronómicas que impulsen el turismo culinario.',
      'Aqua Terra: Estética Consciente':
        'Proyecto enfocado en desarrollar una línea de productos de estética y cuidado personal utilizando ingredientes naturales y sostenibles. Busca crear conciencia sobre el impacto ambiental de la industria cosmética y ofrecer alternativas más saludables para el consumidor y el planeta.',
      'Renacer en Azul':
        'Iniciativa artística que utiliza el color azul como elemento unificador para explorar temas de identidad, memoria y futuro. A través de diversas disciplinas artísticas, el proyecto busca crear un diálogo sobre la relación entre el ser humano y el océano, promoviendo la conservación marina.',
      'Upcycling Intercultural':
        'Proyecto que combina técnicas de reciclaje creativo con elementos culturales de diferentes comunidades. Busca crear productos únicos que representen la diversidad cultural de la región, promoviendo la sostenibilidad y el respeto por las tradiciones locales.',
    };

    const escuelaNombre =
      project.escuelas?.[0]?.escuela.nombre || 'la escuela correspondiente';

    return (
      summaries[project.proyecto as keyof typeof summaries] ||
      `El proyecto ${project.proyecto} forma parte del programa IMPULSA y se desarrolla en la sede de ${project.sede}. Con un presupuesto de $${project.presupuestoTotal.toLocaleString('es-CL')} y ${project.participantes} participantes, busca generar impacto positivo en la comunidad a través de ${escuelaNombre}.`
    );
  };

  if (loading) {
    return (
      <div className="flex h-full">
        <div className="flex items-center justify-center w-full h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando proyectos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full">
        <div className="flex items-center justify-center w-full h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">
              Error al cargar los proyectos: {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast "Cambios guardados" (tab General y Participantes) */}
      {showGeneralSaveToast && (
        <div className="fixed bottom-6 right-6 bg-emerald-500 text-white px-8 py-4 rounded-lg shadow-lg flex items-center space-x-2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Check className="h-6 w-6" />
          <span className="font-semibold text-base">Cambios guardados</span>
        </div>
      )}

      {/* Main Content - Full Width */}
      <div className="h-full min-h-0 flex flex-col overflow-hidden">
        {showAddForm || showEditForm ? (
          /* Formulario de agregar/editar proyecto — scroll en la zona del form */
          <div className="flex-1 min-h-0 overflow-y-auto">
          <Card className="border-2 border-gray-200">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {showEditForm ? 'Editar Proyecto' : 'Agregar Nuevo Proyecto'}
                </h2>
                <Button
                  onClick={handleCloseForm}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Información básica */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      Información Básica
                    </h3>

                    <div>
                      <Label
                        htmlFor="proyecto"
                        className="text-sm font-medium text-gray-700"
                      >
                        Nombre del Proyecto *
                      </Label>
                      <Input
                        id="proyecto"
                        value={formData.proyecto}
                        onChange={(e) =>
                          handleInputChange('proyecto', e.target.value)
                        }
                        placeholder="Ej: Mi Proyecto Innovador"
                        className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="fondo"
                        className="text-sm font-medium text-gray-700"
                      >
                        Fondo *
                      </Label>
                      <Select
                        value={formData.fondo}
                        onValueChange={(value) =>
                          handleInputChange('fondo', value)
                        }
                      >
                        <SelectTrigger className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500">
                          <SelectValue placeholder="Selecciona el fondo" />
                        </SelectTrigger>
                        <SelectContent>
                          {catalogosLoading &&
                          catalogosGeneral.fondos.length === 0 ? (
                            <SelectItem value="__loading" disabled>
                              Cargando opciones…
                            </SelectItem>
                          ) : (
                            catalogosGeneral.fondos.map((f) => (
                              <SelectItem key={f.id} value={f.nombre}>
                                {f.nombre}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label
                        htmlFor="linea"
                        className="text-sm font-medium text-gray-700"
                      >
                        Línea
                      </Label>
                      <Select
                        value={formData.linea || undefined}
                        onValueChange={(value) =>
                          handleInputChange('linea', value)
                        }
                        disabled={!formData.fondo}
                      >
                        <SelectTrigger className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500">
                          <SelectValue
                            placeholder={
                              formData.fondo
                                ? 'Selecciona la línea'
                                : 'Selecciona un fondo primero'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {lineasForSelectedFondo.length === 0 ? (
                            <SelectItem value="__empty" disabled>
                              {formData.fondo
                                ? 'Sin líneas para este fondo'
                                : 'Selecciona un fondo primero'}
                            </SelectItem>
                          ) : (
                            lineasForSelectedFondo.map((l) => (
                              <SelectItem key={l.id} value={l.nombre}>
                                {l.nombre}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label
                        htmlFor="sede"
                        className="text-sm font-medium text-gray-700"
                      >
                        Sede *
                      </Label>
                      <Select
                        value={formData.sede}
                        onValueChange={(value) =>
                          handleInputChange('sede', value)
                        }
                      >
                        <SelectTrigger className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500">
                          <SelectValue placeholder="Selecciona la sede" />
                        </SelectTrigger>
                        <SelectContent>
                          {catalogosLoading &&
                          catalogosGeneral.sedes.length === 0 ? (
                            <SelectItem value="__loading" disabled>
                              Cargando opciones…
                            </SelectItem>
                          ) : (
                            catalogosGeneral.sedes.map((s) => (
                              <SelectItem key={s.id} value={s.nombre}>
                                {s.nombre}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label
                        htmlFor="escuela"
                        className="text-sm font-medium text-gray-700"
                      >
                        Escuela *
                      </Label>
                      <Select
                        value={formData.escuela}
                        onValueChange={(value) =>
                          handleInputChange('escuela', value)
                        }
                      >
                        <SelectTrigger className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500">
                          <SelectValue placeholder="Selecciona la escuela" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Artes e Industrias Creativas">
                            Artes e Industrias Creativas
                          </SelectItem>
                          <SelectItem value="Gastronomía, Hotelería y Turismo">
                            Gastronomía, Hotelería y Turismo
                          </SelectItem>
                          <SelectItem value="Estética Integral">
                            Estética Integral
                          </SelectItem>
                          <SelectItem value="Tecnología">Tecnología</SelectItem>
                          <SelectItem value="Negocios">Negocios</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Presupuesto y métricas */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      Presupuesto y Métricas
                    </h3>

                    <div>
                      <Label
                        htmlFor="presupuestoTotal"
                        className="text-sm font-medium text-gray-700"
                      >
                        Presupuesto Total *
                      </Label>
                      <Input
                        id="presupuestoTotal"
                        type="number"
                        value={formData.presupuestoTotal}
                        onChange={(e) =>
                          handleInputChange(
                            'presupuestoTotal',
                            parseInt(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                        required
                        min="0"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="presupuestoUsado"
                        className="text-sm font-medium text-gray-700"
                      >
                        Presupuesto Usado
                      </Label>
                      <Input
                        id="presupuestoUsado"
                        type="number"
                        value={formData.presupuestoUsado}
                        onChange={(e) =>
                          handleInputChange(
                            'presupuestoUsado',
                            parseInt(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                        min="0"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="participantes"
                        className="text-sm font-medium text-gray-700"
                      >
                        Número de Participantes *
                      </Label>
                      <Input
                        id="participantes"
                        type="number"
                        value={formData.participantes}
                        onChange={(e) =>
                          handleInputChange(
                            'participantes',
                            parseInt(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                        required
                        min="0"
                      />
                    </div>

                  </div>
                </div>

                {/* Avances */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Avances del Proyecto
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label
                        htmlFor="avanceGantt"
                        className="text-sm font-medium text-gray-700"
                      >
                        Avance Gantt (%)
                      </Label>
                      <Input
                        id="avanceGantt"
                        type="number"
                        value={formData.avanceGantt}
                        onChange={(e) =>
                          handleInputChange(
                            'avanceGantt',
                            parseInt(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                        min="0"
                        max="100"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="objetivos"
                        className="text-sm font-medium text-gray-700"
                      >
                        Avance Objetivos (%)
                      </Label>
                      <Input
                        id="objetivos"
                        type="number"
                        value={formData.objetivos}
                        onChange={(e) =>
                          handleInputChange(
                            'objetivos',
                            parseInt(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button
                    type="button"
                    onClick={handleCloseForm}
                    variant="outline"
                    className="px-6 py-2 border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>
                      {isSubmitting
                        ? showEditForm
                          ? 'Actualizando...'
                          : 'Guardando...'
                        : showEditForm
                          ? 'Actualizar Proyecto'
                          : 'Guardar Proyecto'}
                    </span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          </div>
        ) : selectingProjectId ? (
          <div className="flex items-center justify-center h-full min-h-[300px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800 mx-auto mb-3" />
              <p className="text-gray-500">Cargando proyecto...</p>
            </div>
          </div>
        ) : selectedProject ? (
          <div className="flex flex-col h-full min-h-0 overflow-hidden">
            {/* Navegación del proyecto: arriba de todo, centrada */}
            <nav
              aria-label="Secciones del proyecto"
              className="flex-shrink-0 mb-5 overflow-x-auto"
            >
              <div className="flex items-stretch justify-center gap-1 sm:gap-2 min-w-max mx-auto px-2">
                {PROJECT_NAV_TABS.map((tab) => {
                  const isActive = selectedTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedTab(tab.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`group relative px-3 py-2 text-[13px] tracking-wide whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 ${
                        isActive
                          ? 'text-gray-900 font-medium'
                          : 'text-gray-500 font-normal hover:text-gray-800'
                      }`}
                    >
                      {tab.label}
                      <span
                        aria-hidden
                        className={`absolute inset-x-2.5 bottom-0 h-0.5 rounded-full transition-colors ${
                          isActive
                            ? 'bg-emerald-600'
                            : 'bg-transparent group-hover:bg-gray-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Header del proyecto - Fixed, no scroll */}
            <div className="flex-shrink-0">
              <div className="flex flex-col gap-[5px] min-w-0">
                <div className="relative flex items-center justify-center min-w-0 overflow-visible">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={handleClearProjectSelection}
                            className="inline-flex items-center gap-0.5 text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
                            aria-label="Volver al selector de proyectos"
                          >
                            <ChevronLeft className="h-5 w-5 shrink-0" strokeWidth={2} />
                            <span>Proyectos</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Volver al selector de proyectos</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <GeneralTabHeader
                    project={selectedProject}
                    selectedTab={selectedTab}
                    editingField={editingField}
                    generalDraft={generalDraft}
                    setGeneralDraft={setGeneralDraft}
                    isGeneralSaving={isGeneralSaving}
                    handleStartEditField={handleStartEditField}
                    handleSaveGeneralTab={handleSaveGeneralTab}
                    handleCancelGeneralEdit={handleCancelGeneralEdit}
                  />
                </div>
                  <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-1.5">
                    <div className="group/field relative inline-flex items-center gap-1.5">
                      <HandCoins className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      {editingField === 'fondo' ? (
                        <div className="flex items-center gap-1.5">
                          <Select
                            value={generalDraft?.fondo || undefined}
                            onValueChange={(value) =>
                              setGeneralDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      fondo: value,
                                      linea:
                                        prev.fondo === value ? prev.linea : '',
                                    }
                                  : prev
                              )
                            }
                          >
                            <SelectTrigger className="h-7 w-[160px] text-[13px] border-gray-200 focus:ring-gray-400">
                              <SelectValue placeholder="Seleccionar fondo" />
                            </SelectTrigger>
                            <SelectContent>
                              {catalogosLoading &&
                              catalogosGeneral.fondos.length === 0 ? (
                                <SelectItem value="__loading" disabled>
                                  Cargando opciones…
                                </SelectItem>
                              ) : (
                                catalogosGeneral.fondos.map((f) => (
                                  <SelectItem key={f.id} value={f.nombre}>
                                    {f.nombre}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={handleSaveGeneralTab}
                              disabled={isGeneralSaving}
                              className="inline-flex items-center gap-1 text-[13px] font-normal text-gray-900 hover:text-emerald-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
                            >
                              <Save className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelGeneralEdit}
                              className="inline-flex items-center gap-1 text-[13px] font-normal text-gray-500 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
                            >
                              <X className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="relative inline-flex items-center">
                            <span className="text-[13px] font-normal text-gray-500 tracking-wide">
                              {selectedProject.fondo
                                ? selectedProject.fondo
                                : 'Fondo...'}
                            </span>
                            {selectedProject.fondo && (
                              <div className="absolute left-full top-1/2 z-10 -translate-y-1/2 ml-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        onClick={() =>
                                          handleStartEditField('fondo')
                                        }
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 shrink-0 rounded-sm opacity-0 group-hover/field:opacity-100 focus-visible:opacity-100 transition-opacity duration-150 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-transparent"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Editar fondo</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            )}
                          </div>
                          {!selectedProject.fondo && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    onClick={() =>
                                      handleStartEditField('fondo')
                                    }
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 shrink-0 rounded-sm flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-transparent"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Añadir fondo</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </>
                      )}
                    </div>

                    <span aria-hidden className="text-gray-300 select-none">
                      ·
                    </span>
                    <div className="group/field relative inline-flex items-center gap-1.5">
                      <GitBranch className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      {editingField === 'linea' ? (
                        <div className="flex items-center gap-1.5">
                          <Select
                            value={generalDraft?.linea || undefined}
                            onValueChange={(value) =>
                              setGeneralDraft((prev) =>
                                prev ? { ...prev, linea: value } : prev
                              )
                            }
                          >
                            <SelectTrigger className="h-7 w-[160px] text-[13px] border-gray-200 focus:ring-gray-400">
                              <SelectValue placeholder="Seleccionar línea" />
                            </SelectTrigger>
                            <SelectContent>
                              {lineasForSelectedFondo.length === 0 ? (
                                <SelectItem value="__empty" disabled>
                                  {generalDraft?.fondo || selectedProject.fondo
                                    ? 'Sin líneas para este fondo'
                                    : 'Selecciona un fondo primero'}
                                </SelectItem>
                              ) : (
                                lineasForSelectedFondo.map((l) => (
                                  <SelectItem key={l.id} value={l.nombre}>
                                    {l.nombre}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={handleSaveGeneralTab}
                              disabled={isGeneralSaving}
                              className="inline-flex items-center gap-1 text-[13px] font-normal text-gray-900 hover:text-emerald-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
                            >
                              <Save className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelGeneralEdit}
                              className="inline-flex items-center gap-1 text-[13px] font-normal text-gray-500 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
                            >
                              <X className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="relative inline-flex items-center">
                            <span className="text-[13px] font-normal text-gray-500 tracking-wide">
                              {selectedProject.linea
                                ? selectedProject.linea
                                : 'Línea...'}
                            </span>
                            {selectedProject.linea && (
                              <div className="absolute left-full top-1/2 z-10 -translate-y-1/2 ml-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        onClick={() =>
                                          handleStartEditField('linea')
                                        }
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 shrink-0 rounded-sm opacity-0 group-hover/field:opacity-100 focus-visible:opacity-100 transition-opacity duration-150 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-transparent"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Editar línea</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            )}
                          </div>
                          {!selectedProject.linea && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    onClick={() =>
                                      handleStartEditField('linea')
                                    }
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 shrink-0 rounded-sm flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-transparent"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Añadir línea</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </>
                      )}
                    </div>

                    {selectedProjectSedeNames.length > 0 && (
                      <>
                        <span
                          aria-hidden
                          className="text-gray-300 select-none"
                        >
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-normal text-gray-500 tracking-wide">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                          {selectedProjectSedeNames.join(' · ')}
                        </span>
                      </>
                    )}

                    {selectedProjectEscuelaNames.length > 0 && (
                      <>
                        <span
                          aria-hidden
                          className="text-gray-300 select-none"
                        >
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-normal text-gray-500 tracking-wide">
                          <GraduationCap className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                          {selectedProjectEscuelaNames.join(' · ')}
                        </span>
                      </>
                    )}

                    <span aria-hidden className="text-gray-300 select-none">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-normal text-gray-500 tracking-wide">
                      <Users className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      {selectedProject.participantes_rel?.length || 0}{' '}
                      participantes
                    </span>

                    {selectedProject.focalizacion && (
                      <>
                        <span
                          aria-hidden
                          className="text-gray-300 select-none"
                        >
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-normal text-gray-500 tracking-wide">
                          <Target className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                          Foco {selectedProject.focalizacion}
                        </span>
                      </>
                    )}
                  </div>
              </div>
            </div>

            {/* Contenido por tab (keep-alive tras primera visita) */}
            <div className="flex-1 overflow-hidden mt-6">
              {selectedProject && mountedTabs.has('Resumen') && (
                <div className={selectedTab === 'Resumen' ? 'h-full' : 'hidden'}>
                  <ResumenTab project={selectedProject} />
                </div>
              )}
              {selectedProject && mountedTabs.has('General') && (
                <div className={selectedTab === 'General' ? 'h-full' : 'hidden'}>
                  <GeneralTab
                    project={selectedProject}
                    setProject={setSelectedProjectAndCache}
                    fetchProyectos={fetchProyectos}
                    onSaveSuccess={() => setShowGeneralSaveToast(true)}
                    projectVideos={projectVideos}
                    editingField={editingField}
                    generalDraft={generalDraft}
                    setGeneralDraft={setGeneralDraft}
                    catalogosGeneral={catalogosGeneral}
                    catalogosLoading={catalogosLoading}
                    tempVideoUrl={tempVideoUrl}
                    setTempVideoUrl={setTempVideoUrl}
                    isGeneralSaving={isGeneralSaving}
                    handleStartEditField={handleStartEditField}
                    handleSaveGeneralTab={handleSaveGeneralTab}
                    handleCancelGeneralEdit={handleCancelGeneralEdit}
                  />
                </div>
              )}
              {selectedProject && mountedTabs.has('Participantes') && (
                <div
                  className={selectedTab === 'Participantes' ? 'h-full' : 'hidden'}
                >
                  <ParticipantesTab
                    project={selectedProject}
                    setProject={setSelectedProjectAndCache}
                    fetchProyectos={fetchProyectos}
                    selectedTab={selectedTab}
                    onSaveSuccess={() => setShowGeneralSaveToast(true)}
                  />
                </div>
              )}
              {selectedProject && mountedTabs.has('Gantt') && (
                <div className={selectedTab === 'Gantt' ? 'h-full min-h-0 overflow-hidden' : 'hidden'}>
                  <GanttTab
                    project={selectedProject}
                    onProjectChange={handleClearProjectSelection}
                  />
                </div>
              )}
              {selectedProject && mountedTabs.has('Indicadores') && (
                <div
                  className={selectedTab === 'Indicadores' ? 'h-full' : 'hidden'}
                >
                  <IndicadoresTab
                    projectId={selectedProject.id}
                  />
                </div>
              )}
              {selectedProject && mountedTabs.has('Presupuesto') && (
                <div
                  className={selectedTab === 'Presupuesto' ? 'h-full' : 'hidden'}
                >
                  <PresupuestoTab project={selectedProject} />
                </div>
              )}
              {selectedProject && mountedTabs.has('Historial') && (
                <div
                  className={selectedTab === 'Historial' ? 'h-full' : 'hidden'}
                >
                  <HistorialTab projectId={selectedProject.id} />
                </div>
              )}
              {selectedProject && mountedTabs.has('Seguimiento') && (
                <div
                  className={selectedTab === 'Seguimiento' ? 'h-full' : 'hidden'}
                >
                  <SeguimientoTab
                    project={selectedProject}
                    rolEnProyecto={rolEnProyectoSeguimiento}
                    activeRole={session?.user?.activeRole ?? null}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Pantalla principal / Landing - al entrar o cuando el proyecto seleccionado ya no aplica (ej. cambio de rol) */
          <div className="flex h-full min-h-0 flex-col overflow-hidden py-6 px-4">
            <div className="mx-auto flex w-full max-w-xl min-h-0 flex-1 flex-col overflow-hidden">
              <div className="shrink-0 text-center mb-8">
                <FolderKanban className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  Selección de Proyectos
                </h2>
                <p className="text-gray-500 mb-6">
                  Selecciona un proyecto para ver sus detalles o crea uno nuevo
                </p>
                <Button
                  variant="outline"
                  asChild
                  className="border-2 border-gray-300 text-gray-600 hover:bg-gray-50 px-6 py-3 rounded-lg font-medium transition-all duration-200"
                >
                  <Link
                    href="/proyectos/nuevo"
                    className="inline-flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Crear proyecto</span>
                  </Link>
                </Button>
              </div>

              <div className="relative mb-4 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, sede o escuela..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                />
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => (
                    <Card
                      key={project.id}
                      className="cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-gray-50"
                      onClick={() => handleSelectProject(project)}
                      onMouseEnter={() => prefetchProyecto(project.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <FolderKanban className="h-5 w-5 text-gray-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0 text-left">
                            <h3 className="font-medium text-sm text-gray-900 truncate">
                              {project.proyecto}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {project.sede} •{' '}
                              {project.escuelas
                                ?.map((e) => e.escuela.nombre)
                                .join(', ') || 'Sin escuela'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FolderKanban className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No se encontraron proyectos</p>
                  </div>
                )}

              {borradores.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Borradores
                  </h3>
                  <ul className="space-y-2">
                    {borradores.map((b) => (
                      <li key={b.id}>
                        <Link
                          href={`/proyectos/nuevo?borrador=${b.id}`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Continuar editando &quot;{b.nombre}&quot;
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              </div>
            </div>
          </div>
        )}
      </div>

    </>
  );
}

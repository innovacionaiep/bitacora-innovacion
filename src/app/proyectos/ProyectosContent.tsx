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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  ArrowLeftRight,
  Users,
  HandCoins,
  Target,
  Handshake,
  ChevronDown,
  Check,
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
import { getProyecto } from '@/lib/actions/proyectos';
import { usePrefetchProyecto } from '@/hooks/useProyectoQuery';
import { getRolesConProyectosVigentes } from '@/lib/actions/portal-inicio';
import { updateUserProfile } from '@/lib/auth-actions';
import { getProyectoBorradores } from '@/lib/actions/borradores';
import type { BorradorListItem } from '@/lib/actions/borradores';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Helper para truncar títulos de proyectos
const truncateTitle = (title: string, maxLength: number = 58): string => {
  if (title.length <= maxLength) {
    return title;
  }
  return title.substring(0, maxLength) + '...';
};

function getRoleColors(role: string): string {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200';
    case 'coordinador':
      return 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200';
    case 'colaborador':
      return 'bg-violet-100 text-violet-700 border-violet-300 hover:bg-violet-200';
    case 'encargado':
      return 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200';
    case 'docente':
      return 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200';
    case 'estudiante':
      return 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200';
    case 'beneficiario':
      return 'bg-cyan-100 text-cyan-700 border-cyan-300 hover:bg-cyan-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200';
  }
}

function getRoleCircleColor(role: string): string {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'bg-yellow-500';
    case 'coordinador':
      return 'bg-blue-500';
    case 'colaborador':
      return 'bg-violet-500';
    case 'encargado':
      return 'bg-orange-500';
    case 'docente':
      return 'bg-green-500';
    case 'estudiante':
      return 'bg-red-500';
    case 'beneficiario':
      return 'bg-cyan-500';
    default:
      return 'bg-gray-500';
  }
}

export function ProyectosContent() {
  const searchParams = useSearchParams();
  const { data: session, status, update: updateSession } = useSession();
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
  const initialSessionFetchDoneRef = useRef(false);
  const borradoresLoadedRef = useRef(false);
  const prefetchProyecto = usePrefetchProyecto();

  type ProyectoTab =
    | 'Resumen'
    | 'General'
    | 'Participantes'
    | 'Gantt'
    | 'Indicadores'
    | 'Presupuesto'
    | 'Historial'
    | 'Seguimiento';

  const [mountedTabs, setMountedTabs] = useState<Set<ProyectoTab>>(
    () => new Set(['General'])
  );

  const [rolesVigentes, setRolesVigentes] = useState<string[]>([]);
  const [optimisticRole, setOptimisticRole] = useState<string | null>(null);
  const skipRoleChangeRefetchRef = useRef(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] =
    useState<ProyectoWithRelations | null>(null);
  const [selectingProjectId, setSelectingProjectId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [borradores, setBorradores] = useState<BorradorListItem[]>([]);
  const [selectedTab, setSelectedTab] = useState<
    | 'Resumen'
    | 'General'
    | 'Participantes'
    | 'Gantt'
    | 'Indicadores'
    | 'Presupuesto'
    | 'Historial'
    | 'Seguimiento'
  >('General');

  // Estado para videos de YouTube por proyecto
  const [projectVideos, setProjectVideos] = useState<Record<string, string>>(
    {}
  );

  const [showGeneralSaveToast, setShowGeneralSaveToast] = useState(false);

  const {
    catalogosGeneral,
    isGeneralEditMode,
    generalDraft,
    setGeneralDraft,
    isGeneralSaving,
    handleToggleGeneralEditMode,
    handleSaveGeneralTab,
    handleCancelGeneralEdit,
    tempVideoUrl,
    setTempVideoUrl,
    activeDesarrolloTecnicoTab,
    setActiveDesarrolloTecnicoTab,
  } = useGeneralTab({
    project: selectedProject,
    setProject: setSelectedProject,
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
    sede: '',
    escuela: '',
    avanceGantt: 0,
    objetivos: 0,
    presupuestoUsado: 0,
    presupuestoTotal: 0,
    participantes: 0,
  });

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

  const coordinadorIdsForProject = useMemo(() => {
    if (!selectedProject) return [];
    const fromParticipantes =
      selectedProject.participantes_rel
        ?.filter((p) => p.rol === 'Coordinador' && p.userId)
        .map((p) => p.userId as string) ?? [];
    const currentUserIdSession = session?.user?.id;
    const userEmail = session?.user?.email?.trim().toLowerCase() ?? '';
    const participantes = selectedProject.participantes_rel ?? [];
    const isMe = (p: { userId?: string | null; email?: string | null }) =>
      p.userId === currentUserIdSession ||
      (!!userEmail &&
        (p.email?.trim().toLowerCase() ?? '') === userEmail);
    const isCoordinatorByEmail = participantes.some(
      (p) =>
        isMe(p) && (p.rol?.trim().toLowerCase() ?? '') === 'coordinador'
    );
    if (
      isCoordinatorByEmail &&
      currentUserIdSession &&
      !fromParticipantes.includes(currentUserIdSession)
    ) {
      return [...fromParticipantes, currentUserIdSession];
    }
    return fromParticipantes;
  }, [selectedProject, session?.user?.id, session?.user?.email]);

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
      setSelectingProjectId(project.id);
      try {
        const result = await getProyecto(project.id);
        if (result.success && result.data) {
          setSelectedProject(result.data);
          if (tabToSelect) setSelectedTab(tabToSelect);
          const videoUrl = (result.data as ProyectoWithRelations & { youtubeUrl?: string | null }).youtubeUrl ?? projectVideos[project.id] ?? '';
          setTempVideoUrl(videoUrl);
        }
      } finally {
        setSelectingProjectId(null);
      }
    })();
  }, [proyectosIniciales, searchParams]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (showEditForm && selectedProject) {
        const { error } = await updateProyecto(selectedProject.id, formData);
        if (error) {
          alert('Error al actualizar el proyecto: ' + error);
        } else {
          setShowEditForm(false);
          alert('Proyecto actualizado exitosamente');
        }
      } else {
        const { error } = await createProyecto({
          proyecto: formData.proyecto,
          fondo: formData.fondo,
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
            sede: '',
            escuela: '',
            avanceGantt: 0,
            objetivos: 0,
            presupuestoUsado: 0,
            presupuestoTotal: 0,
            participantes: 0,
          });
          setShowAddForm(false);
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
      sede: '',
      escuela: '',
      avanceGantt: 0,
      objetivos: 0,
      presupuestoUsado: 0,
      presupuestoTotal: 0,
      participantes: 0,
    });
  };

  const handleSelectProject = async (project: ProyectoListadoItem) => {
    setIsSheetOpen(false);
    setSelectingProjectId(project.id);
    try {
      const includeActivities =
        selectedTab === 'Gantt' || selectedTab === 'Resumen';
      const result = await getProyecto(project.id, { includeActivities });
      if (result.success && result.data) {
        setSelectedProject(result.data);
        const videoUrl = (result.data as ProyectoWithRelations & { youtubeUrl?: string | null }).youtubeUrl ?? projectVideos[project.id] ?? '';
        setTempVideoUrl(videoUrl);
      }
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

  // Recargar proyectos cuando cambie el rol activo (ej. desde el sidebar).
  // Se omite si el cambio vino del selector (handleRoleChange ya recargó).
  useEffect(() => {
    if (status !== 'authenticated' || skipRoleChangeRefetchRef.current) return;
    if (!initialSessionFetchDoneRef.current) {
      initialSessionFetchDoneRef.current = true;
      return;
    }
    fetchProyectos({ silent: true });
  }, [session?.user?.activeRole, status]);

  const loadRoles = useCallback(async () => {
    const res = await getRolesConProyectosVigentes();
    if (res.success && res.data) {
      setRolesVigentes(res.data);
    }
  }, []);

  useEffect(() => {
    if (!isSheetOpen || rolesVigentes.length > 0) return;
    void loadRoles();
  }, [isSheetOpen, rolesVigentes.length, loadRoles]);

  useEffect(() => {
    setMountedTabs((prev) => {
      if (prev.has(selectedTab as ProyectoTab)) return prev;
      const next = new Set(prev);
      next.add(selectedTab as ProyectoTab);
      return next;
    });
  }, [selectedTab]);

  useEffect(() => {
    if (!selectedProject) return;
    if (selectedTab !== 'Gantt' && selectedTab !== 'Resumen') return;
    if (selectedProject.activities && selectedProject.activities.length > 0) return;
    let cancelled = false;
    void getProyecto(selectedProject.id, { includeActivities: true }).then(
      (result) => {
        if (!cancelled && result.success && result.data) {
          setSelectedProject(result.data);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [selectedTab, selectedProject?.id, selectedProject?.activities?.length]);

  const currentRole =
    optimisticRole ?? session?.user?.activeRole ?? rolesVigentes[0] ?? 'Sin rol';

  const handleRoleChange = async (newRole: string) => {
    if (!session?.user?.id) return;
    const previousRole = session.user.activeRole ?? null;
    setOptimisticRole(newRole);
    skipRoleChangeRefetchRef.current = true;
    try {
      const result = await updateUserProfile(session.user.id, {
        activeRole: newRole,
      });
      if (!result.success) throw new Error(result.error);
      await Promise.all([
        updateSession({ activeRole: newRole }),
        fetchProyectos({ silent: true, activeRole: newRole }),
      ]);
      setTimeout(() => updateSession(), 100);
    } catch {
      setOptimisticRole(null);
      await updateSession({ activeRole: previousRole });
    } finally {
      setTimeout(() => {
        skipRoleChangeRefetchRef.current = false;
      }, 500);
    }
  };

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

      {/* Sheet Panel - Project Selector */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="px-6 py-4 border-b">
              <SheetTitle className="text-xl font-bold text-gray-900">
                Seleccionar Proyecto
              </SheetTitle>
            </SheetHeader>

            {/* Selector de rol activo - arriba del selector de proyectos */}
            {session?.user && rolesVigentes.length > 0 && (
              <div className="px-6 py-4 border-b">
                <Label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                  Rol activo
                </Label>
                <DropdownMenu onOpenChange={(open) => open && void loadRoles()}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-between min-w-0 ${getRoleColors(currentRole)}`}
                    >
                      <span className="truncate">{currentRole}</span>
                      <ChevronDown className="h-4 w-4 ml-1 opacity-70 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[160px]">
                    {rolesVigentes.map((role) => {
                      const isActive = role === currentRole;
                      return (
                        <DropdownMenuItem
                          key={role}
                          className={`cursor-pointer flex items-center gap-2 ${
                            isActive ? 'bg-accent font-semibold' : ''
                          }`}
                          onClick={() => handleRoleChange(role)}
                        >
                          <div
                            className={`w-3 h-3 rounded-full shrink-0 ${getRoleCircleColor(role)}`}
                          />
                          <span className="flex-1">{role}</span>
                          {isActive && <Check className="h-4 w-4" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Search Input */}
            <div className="px-6 py-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, sede o escuela..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                />
              </div>
            </div>

            {/* Project List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedProject?.id === project.id
                        ? 'ring-2 ring-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectProject(project)}
                    onMouseEnter={() => prefetchProyecto(project.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <FolderKanban className="h-5 w-5 text-gray-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
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
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content - Full Width */}
      <div className="h-full flex flex-col">
        {showAddForm || showEditForm ? (
          /* Formulario de agregar/editar proyecto */
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
                          <SelectItem value="IMPULSA">IMPULSA</SelectItem>
                          <SelectItem value="FONDART">FONDART</SelectItem>
                          <SelectItem value="CORFO">CORFO</SelectItem>
                          <SelectItem value="SENCE">SENCE</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
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
                          {catalogosGeneral.sedes.map((s) => (
                            <SelectItem key={s.id} value={s.nombre}>
                              {s.nombre}
                            </SelectItem>
                          ))}
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
        ) : selectingProjectId ? (
          <div className="flex items-center justify-center h-full min-h-[300px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800 mx-auto mb-3" />
              <p className="text-gray-500">Cargando proyecto...</p>
            </div>
          </div>
        ) : selectedProject ? (
          <div className="flex flex-col h-full">
            {/* Header del proyecto - Fixed, no scroll */}
            <div className="flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                {/* Columna izquierda: título + línea de información juntos */}
                <div className="flex flex-col gap-[5px] min-w-0 flex-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => setIsSheetOpen(true)}
                            className="h-10 w-10 rounded-full shadow-lg bg-gray-800 hover:bg-gray-900 text-white transition-all duration-200 hover:scale-105 flex-shrink-0"
                          >
                            <ArrowLeftRight size={20} strokeWidth={2.5} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Cambiar proyecto</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <GeneralTabHeader
                      project={selectedProject}
                      selectedTab={selectedTab}
                      truncateTitle={truncateTitle}
                      isGeneralEditMode={isGeneralEditMode}
                      generalDraft={generalDraft}
                      setGeneralDraft={setGeneralDraft}
                      isGeneralSaving={isGeneralSaving}
                      handleToggleGeneralEditMode={handleToggleGeneralEditMode}
                      handleSaveGeneralTab={handleSaveGeneralTab}
                      handleCancelGeneralEdit={handleCancelGeneralEdit}
                    />
                  </div>
                  <div className="flex items-center flex-wrap gap-3 text-sm text-gray-600">
                    <div className="flex items-center space-x-1.5 pr-3 border-r border-gray-200">
                      <HandCoins className="h-4 w-4 text-gray-600" />
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
                        Fondo {selectedProject.fondo}
                      </span>
                    </div>
                    {selectedProject.focalizacion && (
                      <div className="flex items-center space-x-1.5 pr-3 border-r border-gray-200">
                        <Target className="h-4 w-4 text-gray-600" />
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${
                            selectedProject.focalizacion === 'Ambiental'
                              ? 'bg-green-100 text-green-700'
                              : selectedProject.focalizacion === 'Social'
                                ? 'bg-yellow-100 text-yellow-700'
                                : selectedProject.focalizacion === 'Productiva'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          Foco {selectedProject.focalizacion}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1 pr-3 border-r border-gray-200">
                      <Users className="h-4 w-4 text-gray-600" />
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
                        {selectedProject.participantes_rel?.length || 0}{' '}
                        participantes
                      </span>
                    </div>
                    {selectedProject.sociosComunitarios &&
                      selectedProject.sociosComunitarios.length > 0 && (
                        <div className="flex items-center space-x-1.5">
                          <Handshake className="h-4 w-4 text-gray-600" />
                          <span className="text-xs text-gray-600 font-medium">
                            Socios Comunitarios:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {selectedProject.sociosComunitarios.map(
                              (socioRel, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium"
                                >
                                  {socioRel.socioComunitario.nombre}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* Botones de navegación - Dos filas */}
                <div className="flex flex-col gap-[6px] w-[450px] flex-shrink-0">
                  {/* Primera fila: Resumen, General, Equipo, Historial */}
                  <div className="flex items-center gap-1.5 w-full">
                    <Button
                      onClick={() => setSelectedTab('Resumen')}
                      size="sm"
                      className={`flex-1 h-7 min-w-0 px-2 text-sm font-medium ${
                        selectedTab === 'Resumen'
                          ? 'bg-gray-800 text-white hover:bg-gray-800'
                          : 'text-gray-700 bg-white hover:bg-gray-200 hover:text-gray-800 border border-gray-300'
                      }`}
                    >
                      Resumen
                    </Button>
                    <Button
                      onClick={() => setSelectedTab('General')}
                      size="sm"
                      className={`flex-1 h-7 min-w-0 px-2 text-sm font-medium ${
                        selectedTab === 'General'
                          ? 'bg-gray-800 text-white hover:bg-gray-800'
                          : 'text-gray-700 bg-white hover:bg-gray-200 hover:text-gray-800 border border-gray-300'
                      }`}
                    >
                      General
                    </Button>
                    <Button
                      onClick={() => setSelectedTab('Participantes')}
                      size="sm"
                      className={`flex-1 h-7 min-w-0 px-2 text-sm font-medium ${
                        selectedTab === 'Participantes'
                          ? 'bg-gray-800 text-white hover:bg-gray-800'
                          : 'text-gray-700 bg-white hover:bg-gray-200 hover:text-gray-800 border border-gray-300'
                      }`}
                    >
                      Participantes
                    </Button>
                    <Button
                      onClick={() => setSelectedTab('Historial')}
                      size="sm"
                      className={`flex-1 h-7 min-w-0 px-2 text-sm font-medium ${
                        selectedTab === 'Historial'
                          ? 'bg-gray-800 text-white hover:bg-gray-800'
                          : 'text-gray-700 bg-white hover:bg-gray-200 hover:text-gray-800 border border-gray-300'
                      }`}
                    >
                      Historial
                    </Button>
                  </div>
                  {/* Segunda fila: Actividades, Indicadores, Presupuesto, Seguimiento */}
                  <div className="flex items-center gap-1.5 w-full">
                    <Button
                      onClick={() => setSelectedTab('Gantt')}
                      size="sm"
                      className={`flex-1 h-7 min-w-0 px-2 text-sm font-medium ${
                        selectedTab === 'Gantt'
                          ? 'bg-gray-800 text-white hover:bg-gray-800'
                          : 'text-gray-700 bg-white hover:bg-gray-200 hover:text-gray-800 border border-gray-300'
                      }`}
                    >
                      Actividades
                    </Button>
                    <Button
                      onClick={() => setSelectedTab('Indicadores')}
                      size="sm"
                      className={`flex-1 h-7 min-w-0 px-2 text-sm font-medium ${
                        selectedTab === 'Indicadores'
                          ? 'bg-gray-800 text-white hover:bg-gray-800'
                          : 'text-gray-700 bg-white hover:bg-gray-200 hover:text-gray-800 border border-gray-300'
                      }`}
                    >
                      Indicadores
                    </Button>
                    <Button
                      onClick={() => setSelectedTab('Presupuesto')}
                      size="sm"
                      className={`flex-1 h-7 min-w-0 px-2 text-sm font-medium ${
                        selectedTab === 'Presupuesto'
                          ? 'bg-gray-800 text-white hover:bg-gray-800'
                          : 'text-gray-700 bg-white hover:bg-gray-200 hover:text-gray-800 border border-gray-300'
                      }`}
                    >
                      Presupuesto
                    </Button>
                    <Button
                      onClick={() => setSelectedTab('Seguimiento')}
                      size="sm"
                      className={`flex-1 h-7 min-w-0 px-2 text-sm font-medium ${
                        selectedTab === 'Seguimiento'
                          ? 'bg-gray-800 text-white hover:bg-gray-800'
                          : 'text-gray-700 bg-white hover:bg-gray-200 hover:text-gray-800 border border-gray-300'
                      }`}
                    >
                      Seguimiento
                    </Button>
                  </div>
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
                    projectVideos={projectVideos}
                    isGeneralEditMode={isGeneralEditMode}
                    generalDraft={generalDraft}
                    setGeneralDraft={setGeneralDraft}
                    catalogosGeneral={catalogosGeneral}
                    tempVideoUrl={tempVideoUrl}
                    setTempVideoUrl={setTempVideoUrl}
                    activeDesarrolloTecnicoTab={activeDesarrolloTecnicoTab}
                    setActiveDesarrolloTecnicoTab={setActiveDesarrolloTecnicoTab}
                  />
                </div>
              )}
              {selectedProject && mountedTabs.has('Participantes') && (
                <div
                  className={selectedTab === 'Participantes' ? 'h-full' : 'hidden'}
                >
                  <ParticipantesTab
                    project={selectedProject}
                    setProject={setSelectedProject}
                    fetchProyectos={fetchProyectos}
                    selectedTab={selectedTab}
                    onSaveSuccess={() => setShowGeneralSaveToast(true)}
                  />
                </div>
              )}
              {selectedProject && mountedTabs.has('Gantt') && (
                <div className={selectedTab === 'Gantt' ? 'h-full' : 'hidden'}>
                  <GanttTab
                    project={selectedProject}
                    coordinadorIds={coordinadorIdsForProject}
                    currentUserId={session?.user?.id}
                    onProjectChange={() => setIsSheetOpen(true)}
                  />
                </div>
              )}
              {selectedProject && mountedTabs.has('Indicadores') && (
                <div
                  className={selectedTab === 'Indicadores' ? 'h-full' : 'hidden'}
                >
                  <IndicadoresTab
                    projectId={selectedProject.id}
                    coordinadorIds={coordinadorIdsForProject}
                    currentUserId={session?.user?.id}
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
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center max-w-md">
              <FolderKanban className="h-20 w-20 mx-auto mb-6 text-gray-300" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Gestión de Proyectos
              </h2>
              <p className="text-gray-500 mb-8">
                Selecciona un proyecto para ver sus detalles o crea uno nuevo
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => setIsSheetOpen(true)}
                  className="bg-sidebar text-sidebar-foreground hover:bg-sidebar/90 px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  <span>Seleccionar proyecto</span>
                </Button>
                <Button variant="outline" asChild className="border-2 border-gray-300 text-gray-600 hover:bg-gray-50 px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2">
                  <Link href="/proyectos/nuevo" className="inline-flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Crear proyecto</span>
                  </Link>
                </Button>
              </div>
              {borradores.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Borradores</h3>
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
        )}
      </div>

    </>
  );
}

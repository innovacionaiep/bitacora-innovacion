'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  MultiSelectNombres,
  MULTI_VALUE_SEP,
} from '@/components/ui/multi-select-nombres';
import {
  MultiSelectOptions,
  MULTI_SELECT_SEP,
} from '@/components/ui/multi-select-options';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  FolderKanban,
  MapPin,
  GraduationCap,
  DollarSign,
  BarChart3,
  FileText,
  Plus,
  Trash2,
  Save,
  X,
  Pencil,
  RefreshCw,
  ArrowLeftRight,
  Users,
  HandCoins,
  Target,
  Video,
  BookOpen,
  Building2,
  UsersRound,
  Handshake,
  Crosshair,
  ListChecks,
  History,
  AlertCircle,
  Lightbulb,
  Heart,
  Zap,
  TrendingUp,
  Globe,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Crown,
  UserCog,
  FileDown,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useProyectosParaUsuario } from '@/hooks/useProyectosParaUsuario';
import {
  type CarreraItem,
  type ComunaItem,
  type EscuelaItem,
  type GrupoInteresItem,
  type SocioComunitarioItem,
  ProyectoWithRelations,
} from '@/types/proyecto';
import type { ProyectoListadoItem } from '@/lib/actions/proyectos';
import { ProgressCard } from '@/components/proyectos/ProgressCard';
import { ProjectInfoCard } from '@/components/proyectos/ProjectInfoCard';
import GanttChart from '@/components/proyectos/GanttChart';
import { IndicadoresCard } from '@/components/proyectos/IndicadoresCard';
import { HistorialCard } from '@/components/proyectos/HistorialCard';
import { PresupuestoCard } from '@/components/proyectos/PresupuestoCard';
import { ResumenProyectoCard } from '@/components/proyectos/ResumenProyectoCard';
import { SeguimientoCard } from '@/components/seguimiento/SeguimientoCard';
import { ProyectoParticipante } from '@prisma/client';
import { User as UserType } from '@prisma/client';
import {
  getCarreras,
  getComunas,
  getEscuelas,
  getGruposInteres,
  getSociosComunitarios,
  getProyecto,
  updateProyectoGeneralTab,
  addParticipanteProyecto,
  updateParticipanteProyecto,
  deleteParticipanteProyecto,
  createSocioComunitario,
} from '@/lib/actions/proyectos';
import {
  getSedes,
  getEscuelas as getEscuelasConfig,
} from '@/lib/actions/configuracion';
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

// Valor sentinela para Select (Radix no permite value="" en SelectItem)
const SELECT_NONE_VALUE = '__none__';

// Helper para extraer el ID de video de YouTube desde una URL
const extractYouTubeVideoId = (url: string): string | null => {
  try {
    const urlObj = new URL(url);

    // Formato: youtube.com/watch?v=VIDEO_ID
    if (
      urlObj.hostname.includes('youtube.com') &&
      urlObj.pathname === '/watch'
    ) {
      return urlObj.searchParams.get('v');
    }

    // Formato: youtu.be/VIDEO_ID
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }

    return null;
  } catch (error) {
    return null;
  }
};

// Helper para truncar títulos de proyectos
const truncateTitle = (title: string, maxLength: number = 58): string => {
  if (title.length <= maxLength) {
    return title;
  }
  return title.substring(0, maxLength) + '...';
};

type GeneralDraft = {
  proyecto: string;
  objetivoGeneralId?: string;
  objetivoGeneral: string;
  objetivosEspecificos: Array<{
    id: string;
    descripcion: string;
    orden: number;
  }>;
  sede: string;
  escuelasTexto: string;
  carrerasTexto: string;
  comunasTexto: string;
  gruposInteresTexto: string;
  sociosComunitariosTexto: string;
  desarrolloTecnico: {
    continuidadFasesAnteriores: string;
    pertinenciaLocal: string;
    pertinenciaDisciplinar: string;
    necesidadProblema: string;
    publicoObjetivo: string;
    solucionAvance: string;
    perspectiveGenero: string;
    resultadosContribucion: string;
    metodologiaMedicion: string;
    ejesImpacto: string;
    factorInnovador: string;
    escalabilidad: string;
  };
};

type CatalogosGeneral = {
  escuelas: EscuelaItem[];
  carreras: CarreraItem[];
  comunas: ComunaItem[];
  gruposInteres: GrupoInteresItem[];
  sociosComunitarios: SocioComunitarioItem[];
  sedes: { id: string; nombre: string; orden: number }[];
};

const buildGeneralDraft = (project: ProyectoWithRelations): GeneralDraft => {
  const objetivoGeneral = project.objetivos_rel?.find(
    (obj) => obj.tipo === 'General'
  );
  const objetivosEspecificos =
    project.objetivos_rel
      ?.filter((obj) => obj.tipo === 'Especifico')
      .sort((a, b) => a.orden - b.orden) ?? [];

  return {
    proyecto: project.proyecto ?? '',
    objetivoGeneralId: objetivoGeneral?.id,
    objetivoGeneral: objetivoGeneral?.descripcion ?? '',
    objetivosEspecificos: objetivosEspecificos.map((obj) => ({
      id: obj.id,
      descripcion: obj.descripcion,
      orden: obj.orden,
    })),
    sede: (project.sede ?? '').replace(/, /g, MULTI_VALUE_SEP),
    escuelasTexto:
      project.escuelas
        ?.map((item) => item.escuela.nombre)
        .join(MULTI_VALUE_SEP) ?? '',
    carrerasTexto:
      project.carreras
        ?.map((item) => item.carrera.nombre)
        .join(MULTI_VALUE_SEP) ?? '',
    comunasTexto:
      project.comunas
        ?.map((item) => item.comuna.nombre)
        .join(MULTI_VALUE_SEP) ?? '',
    gruposInteresTexto:
      project.gruposInteres
        ?.map((item) => item.grupoInteres.nombre)
        .join(MULTI_VALUE_SEP) ?? '',
    sociosComunitariosTexto:
      project.sociosComunitarios
        ?.map((item) => item.socioComunitario.nombre)
        .join(MULTI_VALUE_SEP) ?? '',
    desarrolloTecnico: {
      continuidadFasesAnteriores:
        project.desarrolloTecnico?.continuidadFasesAnteriores ?? '',
      pertinenciaLocal: project.desarrolloTecnico?.pertinenciaLocal ?? '',
      pertinenciaDisciplinar:
        project.desarrolloTecnico?.pertinenciaDisciplinar ?? '',
      necesidadProblema: project.desarrolloTecnico?.necesidadProblema ?? '',
      publicoObjetivo: project.desarrolloTecnico?.publicoObjetivo ?? '',
      solucionAvance: project.desarrolloTecnico?.solucionAvance ?? '',
      perspectiveGenero: project.desarrolloTecnico?.perspectiveGenero ?? '',
      resultadosContribucion:
        project.desarrolloTecnico?.resultadosContribucion ?? '',
      metodologiaMedicion: project.desarrolloTecnico?.metodologiaMedicion ?? '',
      ejesImpacto: project.desarrolloTecnico?.ejesImpacto ?? '',
      factorInnovador: project.desarrolloTecnico?.factorInnovador ?? '',
      escalabilidad: project.desarrolloTecnico?.escalabilidad ?? '',
    },
  };
};

/** Textarea para tab General: 2 líneas por defecto, se expande al enfocar para mostrar todo el texto */
function GeneralTabTextarea({
  className,
  onFocus,
  onBlur,
  onChange,
  ...props
}: React.ComponentProps<typeof Textarea>) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const expandHeight = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 52)}px`;
  };
  const resetHeight = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '';
  };
  return (
    <Textarea
      ref={ref}
      rows={2}
      className={cn('min-h-[52px] resize-none overflow-y-auto', className)}
      onFocus={(e) => {
        expandHeight();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        resetHeight();
        onBlur?.(e);
      }}
      onChange={(e) => {
        if (document.activeElement === e.target) expandHeight();
        onChange?.(e);
      }}
      {...props}
    />
  );
}

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

function ProyectosContent() {
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

  // Filtros de la pestaña Participantes
  const [filterParticipantesNombre, setFilterParticipantesNombre] =
    useState('');
  const [filterParticipantesRol, setFilterParticipantesRol] = useState('');
  const [filterParticipantesCargo, setFilterParticipantesCargo] = useState('');
  const [filterParticipantesSocio, setFilterParticipantesSocio] = useState('');

  // Modos y estado de la tabla Participantes (estilo PresupuestoCard)
  const [isAddingParticipante, setIsAddingParticipante] = useState(false);
  const [isEditModeParticipante, setIsEditModeParticipante] = useState(false);
  const [isDeleteModeParticipante, setIsDeleteModeParticipante] =
    useState(false);
  const [editingParticipanteId, setEditingParticipanteId] = useState<
    string | null
  >(null);
  type NewParticipanteForm = {
    rol: 'Encargado' | 'Coordinador' | 'Colaborador' | 'Docente' | 'Estudiante' | 'Beneficiario';
    nombre: string;
    email: string;
    cargo: string;
    socioComunitarioId: string;
    sedeId: string;
    escuelaId: string;
  };
  const [newParticipanteData, setNewParticipanteData] = useState<NewParticipanteForm>({
    rol: 'Colaborador',
    nombre: '',
    email: '',
    cargo: '',
    socioComunitarioId: '',
    sedeId: '',
    escuelaId: '',
  });
  // Catálogos para Sede y Escuela en Participantes (configuración - validación de datos)
  const [sedesParticipantes, setSedesParticipantes] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [escuelasParticipantes, setEscuelasParticipantes] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [participanteSubmitting, setParticipanteSubmitting] = useState(false);

  // Popup Editar socios comunitarios (tab Participantes)
  const [isEditarSociosOpen, setIsEditarSociosOpen] = useState(false);
  const [editarSociosIds, setEditarSociosIds] = useState<string[]>([]);
  const [editarSociosCatalog, setEditarSociosCatalog] = useState<
    { id: string; nombre: string; descripcion?: string | null }[]
  >([]);
  const [editarSociosSaving, setEditarSociosSaving] = useState(false);
  const [nuevoSocioNombre, setNuevoSocioNombre] = useState('');
  const [nuevoSocioDescripcion, setNuevoSocioDescripcion] = useState('');
  const [nuevoSocioSaving, setNuevoSocioSaving] = useState(false);

  // Estado para videos de YouTube por proyecto
  const [projectVideos, setProjectVideos] = useState<Record<string, string>>(
    {}
  );
  const [tempVideoUrl, setTempVideoUrl] = useState('');

  // Estado para secciones expandidas del desarrollo técnico
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  // Estado para el tab activo del desarrollo técnico
  const [activeDesarrolloTecnicoTab, setActiveDesarrolloTecnicoTab] =
    useState<string>('fases-anteriores');
  // Estado para el tab activo de información básica
  const [activeInfoBasicaTab, setActiveInfoBasicaTab] =
    useState<string>('local-disciplinar');

  const [isGeneralEditMode, setIsGeneralEditMode] = useState(false);
  const [isGeneralSaving, setIsGeneralSaving] = useState(false);
  const [showGeneralSaveToast, setShowGeneralSaveToast] = useState(false);
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

  const [formData, setFormData] = useState({
    proyecto: '',
    fondo: '',
    sede: '',
    escuela: '',
    avanceGantt: 0,
    objetivos: 0,
    presupuestoUsado: 0,
    presupuestoTotal: 0,
    reunionesHechas: 0,
    reunionesTotales: 0,
    participantes: 0,
  });

  const filteredProjects = proyectosIniciales.filter(
    (project) =>
      project.proyecto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.sede.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.escuelas?.some((escuelaRel) =>
        escuelaRel.escuela.nombre
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      ) ||
      false
  );

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
          reunionesHechas: formData.reunionesHechas,
          reunionesTotales: formData.reunionesTotales,
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
            reunionesHechas: 0,
            reunionesTotales: 0,
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
      reunionesHechas: selectedProject.reunionesHechas,
      reunionesTotales: selectedProject.reunionesTotales,
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
      reunionesHechas: 0,
      reunionesTotales: 0,
      participantes: 0,
    });
  };

  const handleSelectProject = async (project: ProyectoListadoItem) => {
    setIsSheetOpen(false);
    setSelectingProjectId(project.id);
    try {
      const result = await getProyecto(project.id);
      if (result.success && result.data) {
        setSelectedProject(result.data);
        const videoUrl = (result.data as ProyectoWithRelations & { youtubeUrl?: string | null }).youtubeUrl ?? projectVideos[project.id] ?? '';
        setTempVideoUrl(videoUrl);
      }
    } finally {
      setSelectingProjectId(null);
    }
  };

  const handleSaveNewParticipante = async () => {
    if (!selectedProject) return;
    const { rol, nombre, email, cargo, socioComunitarioId, sedeId, escuelaId } =
      newParticipanteData;
    if (!nombre?.trim()) {
      alert('El nombre es obligatorio.');
      return;
    }
    if (rol === 'Beneficiario' && !socioComunitarioId) {
      alert('El socio comunitario es obligatorio para beneficiarios.');
      return;
    }
    setParticipanteSubmitting(true);
    const result = await addParticipanteProyecto(selectedProject.id, {
      rol,
      nombre: nombre.trim(),
      email: email.trim() || undefined,
      cargo: cargo.trim() || undefined,
      socioComunitarioId:
        rol === 'Beneficiario' ? socioComunitarioId || undefined : undefined,
      sedeId: sedeId || undefined,
      escuelaId: escuelaId || undefined,
    });
    setParticipanteSubmitting(false);
    if (result.success && result.data) {
      setSelectedProject(result.data);
      setShowGeneralSaveToast(true);
      fetchProyectos({ silent: true });
      setIsAddingParticipante(false);
      setNewParticipanteData({
        rol: 'Colaborador',
        nombre: '',
        email: '',
        cargo: '',
        socioComunitarioId: '',
        sedeId: '',
        escuelaId: '',
      });
    } else {
      alert(result.error ?? 'Error al agregar participante');
    }
  };

  const handleUpdateParticipante = async (
    participanteId: string,
    data: {
      rol?: string;
      nombre?: string;
      email?: string;
      cargo?: string;
      socioComunitarioId?: string;
      sedeId?: string;
      escuelaId?: string;
    }
  ) => {
    setParticipanteSubmitting(true);
    const result = await updateParticipanteProyecto(participanteId, data);
    setParticipanteSubmitting(false);
    if (result.success && result.data) {
      setSelectedProject(result.data);
      setShowGeneralSaveToast(true);
      fetchProyectos({ silent: true });
    } else {
      alert(result.error ?? 'Error al actualizar participante');
    }
  };

  const handleDeleteParticipante = async (participanteId: string) => {
    if (!confirm('¿Eliminar este participante?')) return;
    setParticipanteSubmitting(true);
    const result = await deleteParticipanteProyecto(participanteId);
    setParticipanteSubmitting(false);
    if (result.success && result.data) {
      setSelectedProject(result.data);
      setShowGeneralSaveToast(true);
      fetchProyectos({ silent: true });
    } else {
      alert(result.error ?? 'Error al eliminar participante');
    }
  };

  const parseNameList = (value: string) =>
    value
      .split(MULTI_VALUE_SEP)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

  const mapNamesToIds = (
    names: string[],
    catalogo: { id: string; nombre: string }[]
  ) => {
    const catalogoMap = new Map(
      catalogo.map((item) => [item.nombre.toLowerCase(), item.id])
    );
    const ids: string[] = [];
    const missing: string[] = [];

    names.forEach((name) => {
      const id = catalogoMap.get(name.toLowerCase());
      if (id) {
        ids.push(id);
      } else {
        missing.push(name);
      }
    });

    return { ids, missing };
  };

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
      carreras: carrerasResult.success
        ? (carrerasResult.data ?? []).map((c) => ({
            ...c,
            escuelaId: c.escuelaId ?? undefined,
          }))
        : [],
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
    if (!selectedProject) return;
    if (!isGeneralEditMode) {
      setGeneralDraft(buildGeneralDraft(selectedProject));
    }
    setIsGeneralEditMode((prev) => !prev);
  };

  const handleCancelGeneralEdit = () => {
    if (!selectedProject) return;
    setGeneralDraft(buildGeneralDraft(selectedProject));
    const videoUrl = (selectedProject as ProyectoWithRelations & { youtubeUrl?: string | null }).youtubeUrl ?? projectVideos[selectedProject.id] ?? '';
    setTempVideoUrl(videoUrl);
    setIsGeneralEditMode(false);
  };

  const handleSaveGeneralTab = async () => {
    if (!selectedProject || !generalDraft || isGeneralSaving) return;

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

      // Estado guardado actual (solo lo que está en BD) para enviar únicamente cambios
      const initialDraft = buildGeneralDraft(selectedProject);
      const idsEqual = (a: string[], b: string[]) => {
        if (a.length !== b.length) return false;
        const sa = [...a].sort();
        const sb = [...b].sort();
        return sa.every((id, i) => id === sb[i]);
      };

      const payload: Parameters<typeof updateProyectoGeneralTab>[0] = {
        proyectoId: selectedProject.id,
      };

      if (generalDraft.proyecto.trim() !== initialDraft.proyecto.trim()) {
        payload.proyecto = generalDraft.proyecto.trim();
      }
      if (generalDraft.sede.trim() !== initialDraft.sede.trim()) {
        payload.sede = generalDraft.sede.trim();
      }
      const currentVideoUrl = (selectedProject as ProyectoWithRelations & { youtubeUrl?: string | null }).youtubeUrl ?? '';
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
        generalDraft.objetivoGeneral.trim() !== initialDraft.objetivoGeneral.trim()
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

      // Proyecto optimista: la vista muestra ya los valores editados (evita parpadeo a valores viejos)
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
        ...selectedProject.desarrolloTecnico,
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
        ...selectedProject,
        proyecto: generalDraft.proyecto.trim(),
        sede: generalDraft.sede.trim(),
        youtubeUrl: tempVideoUrl.trim() || null,
        objetivos_rel: optimisticObjetivosRel,
        desarrolloTecnico: optimisticDesarrolloTecnico,
      } as ProyectoWithRelations & { youtubeUrl?: string | null };

      setSelectedProject(optimisticProject);
      setGeneralDraft(buildGeneralDraft(optimisticProject));
      setTempVideoUrl(tempVideoUrl.trim());
      setProjectVideos((prev) => ({
        ...prev,
        [selectedProject.id]: tempVideoUrl.trim() || '',
      }));
      setIsGeneralEditMode(false);
      setShowGeneralSaveToast(true);
      setIsGeneralSaving(false);

      const result = await updateProyectoGeneralTab(payload);

      if (!result.success || !result.data) {
        setIsGeneralEditMode(true);
        setShowGeneralSaveToast(false);
        alert(result.error || 'Error al actualizar el proyecto');
        return;
      }

      const updated = result.data as ProyectoWithRelations & { youtubeUrl?: string | null };
      setSelectedProject(result.data);
      setGeneralDraft(buildGeneralDraft(result.data));
      setTempVideoUrl(updated.youtubeUrl ?? '');
      setProjectVideos((prev) => ({ ...prev, [updated.id]: updated.youtubeUrl ?? '' }));
      fetchProyectos({ silent: true });
    } catch (error) {
      setIsGeneralEditMode(true);
      setShowGeneralSaveToast(false);
      setIsGeneralSaving(false);
      alert('Error inesperado al guardar los cambios');
    }
  };

  useEffect(() => {
    if (!selectedProject) {
      setGeneralDraft(null);
      return;
    }
    setGeneralDraft(buildGeneralDraft(selectedProject));
    const videoUrl = (selectedProject as ProyectoWithRelations & { youtubeUrl?: string | null }).youtubeUrl ?? projectVideos[selectedProject.id] ?? '';
    setTempVideoUrl(videoUrl);
    setIsGeneralEditMode(false);
  }, [selectedProject]);

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

  // Cargar borradores cuando se muestra la landing (sin proyecto seleccionado)
  useEffect(() => {
    if (!selectedProject && !showAddForm && !showEditForm) {
      getProyectoBorradores().then((res) => {
        if (res.success && res.data) setBorradores(res.data);
        else setBorradores([]);
      });
    } else {
      setBorradores([]);
    }
  }, [selectedProject, showAddForm, showEditForm]);

  // Cargar sedes y escuelas para dropdowns de Participantes (configuración - validación de datos)
  useEffect(() => {
    if (selectedTab !== 'Participantes' || !selectedProject) return;
    let cancelled = false;
    (async () => {
      const [sedes, escuelas] = await Promise.all([
        getSedes(),
        getEscuelasConfig(),
      ]);
      if (!cancelled) {
        setSedesParticipantes(
          sedes.map((s) => ({ id: s.id, nombre: s.nombre }))
        );
        setEscuelasParticipantes(
          escuelas.map((e) => ({ id: e.id, nombre: e.nombre }))
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTab, selectedProject?.id]);

  useEffect(() => {
    if (!showGeneralSaveToast) return;
    const t = setTimeout(() => setShowGeneralSaveToast(false), 3000);
    return () => clearTimeout(t);
  }, [showGeneralSaveToast]);

  // Recargar proyectos cuando cambie el rol activo (ej. desde el sidebar).
  // Se omite si el cambio vino del selector (handleRoleChange ya recargó).
  useEffect(() => {
    if (status !== 'authenticated' || skipRoleChangeRefetchRef.current) return;
    fetchProyectos({ silent: true });
  }, [session?.user?.activeRole, status]);

  const loadRoles = useCallback(async () => {
    const res = await getRolesConProyectosVigentes();
    if (res.success && res.data) {
      setRolesVigentes(res.data);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const currentRole =
    optimisticRole ?? session?.user?.activeRole ?? rolesVigentes[0] ?? 'Sin rol';

  const handleRoleChange = async (newRole: string) => {
    if (!session?.user?.id) return;
    const t0 = performance.now();
    const previousRole = session.user.activeRole ?? null;
    setOptimisticRole(newRole);
    skipRoleChangeRefetchRef.current = true;
    try {
      const result = await updateUserProfile(session.user.id, {
        activeRole: newRole,
      });
      const t1 = performance.now();
      if (typeof window !== 'undefined') console.log('[DEBUG-LISTADO] updateUserProfile ms:', Math.round(t1 - t0));
      if (!result.success) throw new Error(result.error);
      // Ejecutar actualización de sesión y carga de proyectos en paralelo.
      const t2Start = performance.now();
      await Promise.all([
        updateSession({ activeRole: newRole }),
        fetchProyectos({ silent: true, activeRole: newRole }),
      ]);
      const t2End = performance.now();
      if (typeof window !== 'undefined') console.log('[DEBUG-LISTADO] Promise.all(updateSession,fetchProyectos) ms:', Math.round(t2End - t2Start));
      setTimeout(() => updateSession(), 100);
      if (typeof window !== 'undefined') console.log('[DEBUG-LISTADO] handleRoleChange total ms:', Math.round(performance.now() - t0));
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
                <DropdownMenu>
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

                    <div>
                      <Label
                        htmlFor="reunionesTotales"
                        className="text-sm font-medium text-gray-700"
                      >
                        Reuniones Totales
                      </Label>
                      <Input
                        id="reunionesTotales"
                        type="number"
                        value={formData.reunionesTotales}
                        onChange={(e) =>
                          handleInputChange(
                            'reunionesTotales',
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
                        htmlFor="reunionesHechas"
                        className="text-sm font-medium text-gray-700"
                      >
                        Reuniones Realizadas
                      </Label>
                      <Input
                        id="reunionesHechas"
                        type="number"
                        value={formData.reunionesHechas}
                        onChange={(e) =>
                          handleInputChange(
                            'reunionesHechas',
                            parseInt(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
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
                        {truncateTitle(selectedProject.proyecto)}
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

            {/* Contenido condicional según tab seleccionado - Scrollable */}
            <div className="flex-1 overflow-hidden mt-6">
              {selectedTab === 'Resumen' && selectedProject && (
                <div className="h-full overflow-hidden pt-4">
                  <ResumenProyectoCard
                    projectId={selectedProject.id}
                    project={selectedProject}
                    presupuestoTotal={selectedProject.presupuestoTotal ?? 0}
                  />
                </div>
              )}
              {selectedTab === 'General' && selectedProject && (
                <div className="h-full overflow-hidden pt-4">
                  <div className="grid grid-cols-1 xl:grid-cols-[0.85fr_0.80fr_1.00fr] h-full">
                    {/* Columna izquierda: Objetivos + Video */}
                    <div className="h-full flex flex-col pr-6 xl:pr-8 xl:border-r xl:border-gray-200 overflow-hidden">
                      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                        <div className="space-y-6">
                          {/* Objetivos */}
                          {(() => {
                            const objetivos =
                              selectedProject.objetivos_rel || [];
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
                              const projVideo = (selectedProject as ProyectoWithRelations & { youtubeUrl?: string | null }).youtubeUrl ?? projectVideos[selectedProject.id] ?? '';
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
                                        {(selectedProject.sede ?? '')
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
                                  (selectedProject.comunas &&
                                    selectedProject.comunas.length > 0)) && (
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
                                        selectedProject.comunas.map(
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
                                  (selectedProject.escuelas &&
                                    selectedProject.escuelas.length > 0)) && (
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
                                        selectedProject.escuelas.map(
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
                                  (selectedProject.carreras &&
                                    selectedProject.carreras.length > 0)) && (
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
                                        selectedProject.carreras.map(
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
                                  (selectedProject.gruposInteres &&
                                    selectedProject.gruposInteres.length >
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
                                        selectedProject.gruposInteres.map(
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
                            : selectedProject.desarrolloTecnico;

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
              )}

              {selectedTab === 'Participantes' &&
                selectedProject &&
                (() => {
                  const ROLES: { value: string; label: string }[] = [
                    { value: 'Encargado', label: 'Encargado' },
                    { value: 'Coordinador', label: 'Coordinador' },
                    { value: 'Colaborador', label: 'Colaborador' },
                    { value: 'Docente', label: 'Docente' },
                    { value: 'Estudiante', label: 'Estudiante' },
                    { value: 'Beneficiario', label: 'Beneficiario' },
                  ];
                  // Colores por rol según docs/SISTEMA-ROLES.md (mismo criterio que Mi Cuenta y Configuración)
                  const ROLE_COLORS: Record<string, string> = {
                    Encargado:
                      'bg-orange-100 text-orange-800 border-orange-200',
                    Coordinador: 'bg-blue-100 text-blue-800 border-blue-200',
                    Colaborador:
                      'bg-violet-100 text-violet-800 border-violet-200',
                    Docente: 'bg-green-100 text-green-800 border-green-200',
                    Estudiante: 'bg-red-100 text-red-800 border-red-200',
                    Beneficiario: 'bg-cyan-100 text-cyan-800 border-cyan-200',
                  };
                  const list = selectedProject.participantes_rel ?? [];
                  const rolesSelected = filterParticipantesRol
                    ? filterParticipantesRol
                        .split(MULTI_SELECT_SEP)
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : [];
                  const cargosSelected = filterParticipantesCargo
                    ? filterParticipantesCargo
                        .split(MULTI_SELECT_SEP)
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : [];
                  const sociosSelected = filterParticipantesSocio
                    ? filterParticipantesSocio
                        .split(MULTI_SELECT_SEP)
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : [];
                  const filteredParticipants = list.filter((p) => {
                    const nombre = (
                      p.user?.name ??
                      p.nombre ??
                      ''
                    ).toLowerCase();
                    const email = (
                      p.user?.email ??
                      p.email ??
                      ''
                    ).toLowerCase();
                    const cargo = (p.cargo ?? '').toLowerCase();
                    const socioId = p.socioComunitario?.id ?? '';
                    const q = filterParticipantesNombre.trim().toLowerCase();
                    if (q && !nombre.includes(q) && !email.includes(q))
                      return false;
                    if (
                      rolesSelected.length > 0 &&
                      !rolesSelected.includes(p.rol)
                    )
                      return false;
                    if (cargosSelected.length > 0) {
                      const cargoNorm = (p.cargo ?? '').trim().toLowerCase();
                      const match =
                        cargoNorm &&
                        cargosSelected.some(
                          (c) => c.trim().toLowerCase() === cargoNorm
                        );
                      if (!match) return false;
                    }
                    if (sociosSelected.length > 0 && p.rol === 'Beneficiario') {
                      if (!socioId || !sociosSelected.includes(socioId))
                        return false;
                    }
                    return true;
                  });
                  const uniqueCargos = (() => {
                    const set = new Set<string>();
                    list.forEach((p) => {
                      if (p.cargo?.trim()) set.add(p.cargo.trim());
                    });
                    return Array.from(set).sort();
                  })();
                  const cargoOptions = uniqueCargos.map((c) => ({
                    value: c,
                    label: c,
                  }));
                  const sociosFromProject =
                    selectedProject.sociosComunitarios?.map((sc) => ({
                      value: sc.socioComunitario.id,
                      label: sc.socioComunitario.nombre,
                    })) ?? [];
                  const sociosFromParticipants = (() => {
                    const seen = new Set<string>();
                    return list
                      .filter(
                        (p) => p.rol === 'Beneficiario' && p.socioComunitario
                      )
                      .map((p) => p.socioComunitario!)
                      .filter((s) => {
                        if (seen.has(s.id)) return false;
                        seen.add(s.id);
                        return true;
                      })
                      .map((s) => ({ value: s.id, label: s.nombre }));
                  })();
                  const socioOptions =
                    sociosFromProject.length > 0
                      ? sociosFromProject
                      : sociosFromParticipants;
                  const counts = (() => {
                    const encargados = list.filter(
                      (p) => p.rol === 'Encargado'
                    ).length;
                    const coordinadores = list.filter(
                      (p) => p.rol === 'Coordinador'
                    ).length;
                    const colaboradores = list.filter(
                      (p) => p.rol === 'Colaborador'
                    ).length;
                    const docentes = list.filter(
                      (p) => p.rol === 'Docente'
                    ).length;
                    const estudiantes = list.filter(
                      (p) => p.rol === 'Estudiante'
                    ).length;
                    const beneficiarios = list.filter(
                      (p) => p.rol === 'Beneficiario'
                    ).length;
                    const sociosUnicos = new Set(
                      list
                        .filter(
                          (p) =>
                            p.rol === 'Beneficiario' && p.socioComunitario?.id
                        )
                        .map((p) => p.socioComunitario!.id)
                    );
                    return {
                      encargados,
                      coordinadores,
                      colaboradores,
                      docentes,
                      estudiantes,
                      beneficiarios,
                      sociosComunitarios: sociosUnicos.size,
                    };
                  })();
                  const showActionsColumn =
                    isEditModeParticipante ||
                    isDeleteModeParticipante ||
                    isAddingParticipante;
                  return (
                    <div className="h-full overflow-hidden flex flex-col pt-4 px-4">
                      {/* Tarjetas de cantidades - colores por rol según SISTEMA-ROLES.md */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4 flex-shrink-0">
                        <Card className="py-2 px-3">
                          <CardContent className="p-0 flex items-center justify-center gap-2">
                            <Crown className="h-8 w-8 shrink-0 text-orange-600" />
                            <span className="text-[25px] font-bold text-orange-600">
                              {counts.encargados}
                            </span>
                            <span className="text-sm font-bold text-orange-600">
                              Encargados
                            </span>
                          </CardContent>
                        </Card>
                        <Card className="py-2 px-3">
                          <CardContent className="p-0 flex items-center justify-center gap-2">
                            <UserCog className="h-8 w-8 shrink-0 text-blue-600" />
                            <span className="text-[25px] font-bold text-blue-600">
                              {counts.coordinadores}
                            </span>
                            <span className="text-sm font-bold text-blue-600">
                              Coordinadores
                            </span>
                          </CardContent>
                        </Card>
                        <Card className="py-2 px-3">
                          <CardContent className="p-0 flex items-center justify-center gap-2">
                            <Users className="h-8 w-8 shrink-0 text-violet-600" />
                            <span className="text-[25px] font-bold text-violet-600">
                              {counts.colaboradores}
                            </span>
                            <span className="text-sm font-bold text-violet-600">
                              Colaboradores
                            </span>
                          </CardContent>
                        </Card>
                        <Card className="py-2 px-3">
                          <CardContent className="p-0 flex items-center justify-center gap-2">
                            <GraduationCap className="h-8 w-8 shrink-0 text-green-600" />
                            <span className="text-[25px] font-bold text-green-600">
                              {counts.docentes}
                            </span>
                            <span className="text-sm font-bold text-green-600">
                              Docentes
                            </span>
                          </CardContent>
                        </Card>
                        <Card className="py-2 px-3">
                          <CardContent className="p-0 flex items-center justify-center gap-2">
                            <BookOpen className="h-8 w-8 shrink-0 text-red-600" />
                            <span className="text-[25px] font-bold text-red-600">
                              {counts.estudiantes}
                            </span>
                            <span className="text-sm font-bold text-red-600">
                              Estudiantes
                            </span>
                          </CardContent>
                        </Card>
                        <Card className="py-2 px-3">
                          <CardContent className="p-0 flex items-center justify-center gap-2">
                            <Heart className="h-8 w-8 shrink-0 text-cyan-600" />
                            <span className="text-[25px] font-bold text-cyan-600">
                              {counts.beneficiarios}
                            </span>
                            <span className="text-sm font-bold text-cyan-600">
                              Beneficiarios
                            </span>
                          </CardContent>
                        </Card>
                        <Card className="py-2 px-3">
                          <CardContent className="p-0 flex items-center justify-center gap-2">
                            <Handshake className="h-8 w-8 shrink-0 text-gray-600" />
                            <span className="text-[25px] font-bold text-gray-600">
                              {counts.sociosComunitarios}
                            </span>
                            <span className="text-sm font-bold text-gray-600">
                              Socios comunitarios
                            </span>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Filtros + Botones */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 flex-shrink-0">
                        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-[180px]">
                            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                            <Input
                              placeholder="Buscar por nombre o correo..."
                              value={filterParticipantesNombre}
                              onChange={(e) =>
                                setFilterParticipantesNombre(e.target.value)
                              }
                              className="max-w-[220px] h-9"
                            />
                          </div>
                          <div className="w-[160px]">
                            <MultiSelectOptions
                              options={ROLES}
                              value={filterParticipantesRol}
                              onChange={setFilterParticipantesRol}
                              placeholder="Rol"
                            />
                          </div>
                          <div className="w-[160px]">
                            <MultiSelectOptions
                              options={cargoOptions}
                              value={filterParticipantesCargo}
                              onChange={setFilterParticipantesCargo}
                              placeholder="Cargo"
                            />
                          </div>
                          <div className="w-[180px]">
                            <MultiSelectOptions
                              options={socioOptions}
                              value={filterParticipantesSocio}
                              onChange={setFilterParticipantesSocio}
                              placeholder="Socio comunitario"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  onClick={() => {
                                    setIsAddingParticipante((v) => !v);
                                    if (isAddingParticipante)
                                      setNewParticipanteData({
                                        rol: 'Colaborador',
                                        nombre: '',
                                        email: '',
                                        cargo: '',
                                        socioComunitarioId: '',
                                        sedeId: '',
                                        escuelaId: '',
                                      });
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className={`h-10 w-10 rounded-lg transition-all duration-200 flex items-center justify-center border shadow-sm ${
                                    isAddingParticipante
                                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                                  }`}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {isAddingParticipante
                                    ? 'Cancelar agregar participante'
                                    : 'Agregar participante'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  onClick={() => {
                                    setIsEditModeParticipante((v) => !v);
                                    if (isEditModeParticipante)
                                      setEditingParticipanteId(null);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className={`h-10 w-10 rounded-lg transition-all duration-200 flex items-center justify-center border shadow-sm ml-1 ${
                                    isEditModeParticipante
                                      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                                  }`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {isEditModeParticipante
                                    ? 'Salir del modo edición'
                                    : 'Editar participantes'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  onClick={() =>
                                    setIsDeleteModeParticipante((v) => !v)
                                  }
                                  variant="ghost"
                                  size="sm"
                                  className={`h-10 w-10 rounded-lg transition-all duration-200 flex items-center justify-center border shadow-sm ml-1 ${
                                    isDeleteModeParticipante
                                      ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                                  }`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {isDeleteModeParticipante
                                    ? 'Salir del modo eliminación'
                                    : 'Eliminar participantes'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  onClick={() => {
                                    if (selectedProject) {
                                      setEditarSociosIds(
                                        selectedProject.sociosComunitarios?.map(
                                          (sc) => sc.socioComunitarioId
                                        ) ?? []
                                      );
                                      getSociosComunitarios().then((r) => {
                                        if (r.success && r.data)
                                          setEditarSociosCatalog(r.data);
                                      });
                                      setIsEditarSociosOpen(true);
                                    }
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="h-10 rounded-lg transition-all duration-200 flex items-center justify-center border shadow-sm ml-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 gap-1.5 px-3"
                                >
                                  <Handshake className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    Editar socios
                                  </span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Agregar o editar socios comunitarios del proyecto</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  onClick={() => {
                                    const headers = [
                                      'Rol',
                                      'Nombre',
                                      'Correo',
                                      'Cargo',
                                      'Sede',
                                      'Escuela',
                                      'Socio comunitario',
                                    ];
                                    const rows = filteredParticipants.map(
                                      (p) => [
                                        p.rol,
                                        p.user?.name ??
                                          p.nombre ??
                                          'Sin nombre',
                                        p.user?.email ?? p.email ?? '',
                                        p.cargo ?? '',
                                        p.sede?.nombre ?? '—',
                                        p.escuela?.nombre ?? '—',
                                        p.rol === 'Beneficiario'
                                          ? (p.socioComunitario?.nombre ?? '—')
                                          : '—',
                                      ]
                                    );
                                    const wsData = [headers, ...rows];
                                    const ws = XLSX.utils.aoa_to_sheet(wsData);
                                    const wb = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(
                                      wb,
                                      ws,
                                      'Participantes'
                                    );
                                    const nombreProyecto = (
                                      selectedProject?.proyecto ?? 'proyecto'
                                    )
                                      .replace(/[^\w\s-]/gi, '')
                                      .trim()
                                      .slice(0, 50);
                                    XLSX.writeFile(
                                      wb,
                                      `participantes_${nombreProyecto}.xlsx`
                                    );
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="h-10 rounded-lg transition-all duration-200 flex items-center justify-center border shadow-sm ml-1 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1.5 px-3"
                                >
                                  <FileDown className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    Exportar
                                  </span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Exportar tabla de participantes a Excel (XLSX)
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>

                      {/* Tabla con encabezados sticky y cuerpo scrolleable */}
                      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden flex flex-col">
                        <div className="overflow-auto flex-1 custom-scrollbar">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/60 hover:bg-muted/60">
                                <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 w-[140px] text-center">
                                  Rol
                                </TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 min-w-[200px] text-center">
                                  Nombre
                                </TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 min-w-[180px] text-center">
                                  Correo
                                </TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 min-w-[160px] text-center">
                                  Cargo
                                </TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 min-w-[140px] text-center">
                                  Sede
                                </TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 min-w-[140px] text-center">
                                  Escuela
                                </TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 min-w-[180px] text-center">
                                  Socio comunitario
                                </TableHead>
                                {showActionsColumn && (
                                  <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 w-[60px] text-center" />
                                )}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {isAddingParticipante && (
                                <TableRow className="bg-green-50/80 border-2 border-green-200">
                                  <TableCell className="align-middle text-center">
                                    <Select
                                      value={newParticipanteData.rol}
                                      onValueChange={(v) =>
                                        setNewParticipanteData((prev) => ({
                                          ...prev,
                                          rol: v as typeof prev.rol,
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="h-8 text-sm w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ROLES.map((r) => (
                                          <SelectItem
                                            key={r.value}
                                            value={r.value}
                                          >
                                            {r.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    <Input
                                      value={newParticipanteData.nombre}
                                      onChange={(e) =>
                                        setNewParticipanteData((prev) => ({
                                          ...prev,
                                          nombre: e.target.value,
                                        }))
                                      }
                                      placeholder="Nombre *"
                                      className="h-8 text-sm"
                                    />
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    <Input
                                      value={newParticipanteData.email}
                                      onChange={(e) =>
                                        setNewParticipanteData((prev) => ({
                                          ...prev,
                                          email: e.target.value,
                                        }))
                                      }
                                      placeholder="Correo"
                                      className="h-8 text-sm"
                                    />
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    <Input
                                      value={newParticipanteData.cargo}
                                      onChange={(e) =>
                                        setNewParticipanteData((prev) => ({
                                          ...prev,
                                          cargo: e.target.value,
                                        }))
                                      }
                                      placeholder="Cargo"
                                      className="h-8 text-sm"
                                    />
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    <Select
                                      value={
                                        newParticipanteData.sedeId ||
                                        SELECT_NONE_VALUE
                                      }
                                      onValueChange={(v) =>
                                        setNewParticipanteData((prev) => ({
                                          ...prev,
                                          sedeId:
                                            v === SELECT_NONE_VALUE ? '' : v,
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="h-8 text-sm w-full">
                                        <SelectValue placeholder="Sede" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value={SELECT_NONE_VALUE}>
                                          —
                                        </SelectItem>
                                        {sedesParticipantes.map((s) => (
                                          <SelectItem key={s.id} value={s.id}>
                                            {s.nombre}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    <Select
                                      value={
                                        newParticipanteData.escuelaId ||
                                        SELECT_NONE_VALUE
                                      }
                                      onValueChange={(v) =>
                                        setNewParticipanteData((prev) => ({
                                          ...prev,
                                          escuelaId:
                                            v === SELECT_NONE_VALUE ? '' : v,
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="h-8 text-sm w-full">
                                        <SelectValue placeholder="Escuela" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value={SELECT_NONE_VALUE}>
                                          —
                                        </SelectItem>
                                        {escuelasParticipantes.map((e) => (
                                          <SelectItem key={e.id} value={e.id}>
                                            {e.nombre}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    {newParticipanteData.rol ===
                                    'Beneficiario' ? (
                                      <Select
                                        value={
                                          newParticipanteData.socioComunitarioId
                                        }
                                        onValueChange={(v) =>
                                          setNewParticipanteData((prev) => ({
                                            ...prev,
                                            socioComunitarioId: v,
                                          }))
                                        }
                                      >
                                        <SelectTrigger className="h-8 text-sm w-full">
                                          <SelectValue placeholder="Socio comunitario *" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {socioOptions.map((s) => (
                                            <SelectItem
                                              key={s.value}
                                              value={s.value}
                                            >
                                              {s.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      '—'
                                    )}
                                  </TableCell>
                                  {showActionsColumn && (
                                    <TableCell className="align-middle text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <Button
                                          size="sm"
                                          onClick={handleSaveNewParticipante}
                                          disabled={participanteSubmitting}
                                          className="bg-green-600 hover:bg-green-700 text-white"
                                        >
                                          {participanteSubmitting
                                            ? 'Guardando...'
                                            : 'Guardar'}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setIsAddingParticipante(false);
                                            setNewParticipanteData({
                                              rol: 'Colaborador',
                                              nombre: '',
                                              email: '',
                                              cargo: '',
                                              socioComunitarioId: '',
                                              sedeId: '',
                                              escuelaId: '',
                                            });
                                          }}
                                        >
                                          Cancelar
                                        </Button>
                                      </div>
                                    </TableCell>
                                  )}
                                </TableRow>
                              )}
                              {filteredParticipants.length === 0 &&
                              !isAddingParticipante ? (
                                <TableRow>
                                  <TableCell
                                    colSpan={showActionsColumn ? 8 : 7}
                                    className="text-center text-muted-foreground py-8"
                                  >
                                    No hay participantes que coincidan con los
                                    filtros.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredParticipants.map((p) => {
                                  const nombre =
                                    p.displayName ??
                                    p.user?.name ??
                                    p.nombre ??
                                    'Sin nombre';
                                  const email = p.user?.email ?? p.email ?? '';
                                  const avatarImage =
                                    p.displayImage ?? p.user?.image;
                                  const cargo = p.cargo ?? '';
                                  const sedeNombre = p.sede?.nombre ?? '—';
                                  const escuelaNombre =
                                    p.escuela?.nombre ?? '—';
                                  const socioComunitario =
                                    p.rol === 'Beneficiario'
                                      ? (p.socioComunitario?.nombre ?? '—')
                                      : '—';
                                  const colorClass =
                                    ROLE_COLORS[p.rol] ??
                                    'bg-gray-100 text-gray-800 border-gray-200';
                                  const isEditing =
                                    editingParticipanteId === p.id;
                                  return (
                                    <TableRow
                                      key={p.id}
                                      className={`hover:bg-muted/50 ${isEditing ? 'bg-blue-50/80' : ''}`}
                                    >
                                      <TableCell className="align-middle text-center">
                                        {isEditing ? (
                                          <Select
                                            value={p.rol}
                                            onValueChange={(v) =>
                                              handleUpdateParticipante(p.id, {
                                                rol: v,
                                              })
                                            }
                                          >
                                            <SelectTrigger className="h-8 text-sm w-full">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {ROLES.map((r) => (
                                                <SelectItem
                                                  key={r.value}
                                                  value={r.value}
                                                >
                                                  {r.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <span
                                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${colorClass}`}
                                          >
                                            #{p.rol}
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell className="align-middle">
                                        {isEditing ? (
                                          <Input
                                            defaultValue={nombre}
                                            onBlur={(e) => {
                                              const v = e.target.value.trim();
                                              if (v && v !== nombre)
                                                handleUpdateParticipante(p.id, {
                                                  nombre: v,
                                                });
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                const v = (
                                                  e.target as HTMLInputElement
                                                ).value.trim();
                                                if (v && v !== nombre)
                                                  handleUpdateParticipante(
                                                    p.id,
                                                    { nombre: v }
                                                  );
                                              }
                                            }}
                                            className="h-8 text-sm"
                                          />
                                        ) : (
                                          <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 rounded-full ring-2 ring-gray-200">
                                              {avatarImage ? (
                                                <AvatarImage
                                                  src={avatarImage}
                                                  alt={nombre}
                                                />
                                              ) : null}
                                              <AvatarFallback className="bg-gray-100 text-gray-700">
                                                <Users className="h-4 w-4" />
                                              </AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium truncate">
                                              {nombre}
                                            </span>
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell className="align-middle text-muted-foreground truncate max-w-[200px]">
                                        {isEditing ? (
                                          <Input
                                            defaultValue={email}
                                            onBlur={(e) => {
                                              const v = e.target.value.trim();
                                              if (v !== (email || ''))
                                                handleUpdateParticipante(p.id, {
                                                  email: v || undefined,
                                                });
                                            }}
                                            className="h-8 text-sm"
                                          />
                                        ) : (
                                          email || '—'
                                        )}
                                      </TableCell>
                                      <TableCell className="align-middle truncate max-w-[160px]">
                                        {isEditing ? (
                                          <Input
                                            defaultValue={cargo}
                                            onBlur={(e) => {
                                              const v = e.target.value.trim();
                                              if (v !== (cargo || ''))
                                                handleUpdateParticipante(p.id, {
                                                  cargo: v || undefined,
                                                });
                                            }}
                                            className="h-8 text-sm"
                                          />
                                        ) : (
                                          cargo || '—'
                                        )}
                                      </TableCell>
                                      <TableCell className="align-middle truncate max-w-[140px]">
                                        {isEditing ? (
                                          <Select
                                            value={
                                              p.sede?.id ?? SELECT_NONE_VALUE
                                            }
                                            onValueChange={(v) =>
                                              handleUpdateParticipante(p.id, {
                                                sedeId:
                                                  v === SELECT_NONE_VALUE
                                                    ? undefined
                                                    : v,
                                              })
                                            }
                                          >
                                            <SelectTrigger className="h-8 text-sm w-full">
                                              <SelectValue placeholder="Sede" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem
                                                value={SELECT_NONE_VALUE}
                                              >
                                                —
                                              </SelectItem>
                                              {sedesParticipantes.map((s) => (
                                                <SelectItem
                                                  key={s.id}
                                                  value={s.id}
                                                >
                                                  {s.nombre}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          sedeNombre
                                        )}
                                      </TableCell>
                                      <TableCell className="align-middle truncate max-w-[140px]">
                                        {isEditing ? (
                                          <Select
                                            value={
                                              p.escuela?.id ?? SELECT_NONE_VALUE
                                            }
                                            onValueChange={(v) =>
                                              handleUpdateParticipante(p.id, {
                                                escuelaId:
                                                  v === SELECT_NONE_VALUE
                                                    ? undefined
                                                    : v,
                                              })
                                            }
                                          >
                                            <SelectTrigger className="h-8 text-sm w-full">
                                              <SelectValue placeholder="Escuela" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem
                                                value={SELECT_NONE_VALUE}
                                              >
                                                —
                                              </SelectItem>
                                              {escuelasParticipantes.map(
                                                (e) => (
                                                  <SelectItem
                                                    key={e.id}
                                                    value={e.id}
                                                  >
                                                    {e.nombre}
                                                  </SelectItem>
                                                )
                                              )}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          escuelaNombre
                                        )}
                                      </TableCell>
                                      <TableCell className="align-middle truncate max-w-[180px]">
                                        {isEditing &&
                                        p.rol === 'Beneficiario' ? (
                                          <Select
                                            value={p.socioComunitario?.id ?? ''}
                                            onValueChange={(v) =>
                                              handleUpdateParticipante(p.id, {
                                                socioComunitarioId: v,
                                              })
                                            }
                                          >
                                            <SelectTrigger className="h-8 text-sm w-full">
                                              <SelectValue placeholder="Socio comunitario" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {socioOptions.map((s) => (
                                                <SelectItem
                                                  key={s.value}
                                                  value={s.value}
                                                >
                                                  {s.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          socioComunitario
                                        )}
                                      </TableCell>
                                      {showActionsColumn && (
                                        <TableCell className="align-middle text-center">
                                          {isEditModeParticipante && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className={`h-6 w-6 p-0 ${
                                                isEditing
                                                  ? 'text-blue-600 bg-blue-50'
                                                  : 'text-gray-600 hover:bg-blue-50'
                                              }`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingParticipanteId(
                                                  isEditing ? null : p.id
                                                );
                                              }}
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                          )}
                                          {isDeleteModeParticipante && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteParticipante(p.id);
                                              }}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          )}
                                        </TableCell>
                                      )}
                                    </TableRow>
                                  );
                                })
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {selectedTab === 'Gantt' && (
                <div className="h-full pt-4">
                  {(() => {
                    const coordinadorIdsFromParticipantes =
                      selectedProject.participantes_rel
                        ?.filter((p) => p.rol === 'Coordinador' && p.userId)
                        .map((p) => p.userId as string) ?? [];
                    const currentUserIdSession = session?.user?.id ?? undefined;
                    const participantes =
                      selectedProject.participantes_rel ?? [];
                    const userEmail =
                      session?.user?.email?.trim().toLowerCase() ?? '';
                    const isMe = (
                      p: { userId?: string | null; email?: string | null }
                    ) =>
                      p.userId === currentUserIdSession ||
                      (!!userEmail &&
                        (p.email?.trim().toLowerCase() ?? '') === userEmail);
                    const isCoordinatorByEmail = participantes.some(
                      (p) =>
                        isMe(p) &&
                        (p.rol?.trim().toLowerCase() ?? '') === 'coordinador'
                    );
                    const coordinadorIdsForGantt =
                      isCoordinatorByEmail &&
                      currentUserIdSession &&
                      !coordinadorIdsFromParticipantes.includes(
                        currentUserIdSession
                      )
                        ? [
                            ...coordinadorIdsFromParticipantes,
                            currentUserIdSession,
                          ]
                        : coordinadorIdsFromParticipantes;
                    return (
                      <GanttChart
                        projectId={selectedProject.id}
                        projectName={selectedProject.proyecto}
                        onProjectChange={() => setIsSheetOpen(true)}
                        coordinadorIds={coordinadorIdsForGantt}
                        currentUserId={currentUserIdSession}
                      />
                    );
                  })()}
                </div>
              )}

              {selectedTab === 'Indicadores' && (
                <div className="h-full pt-2 overflow-x-hidden">
                  {(() => {
                    const participantesInd =
                      selectedProject.participantes_rel ?? [];
                    const coordIdsInd =
                      participantesInd
                        .filter((p) => p.rol === 'Coordinador' && p.userId)
                        .map((p) => p.userId as string) ?? [];
                    const uidInd = session?.user?.id ?? undefined;
                    const emailInd =
                      session?.user?.email?.trim().toLowerCase() ?? '';
                    const isMeInd = (
                      p: { userId?: string | null; email?: string | null }
                    ) =>
                      p.userId === uidInd ||
                      (!!emailInd &&
                        (p.email?.trim().toLowerCase() ?? '') === emailInd);
                    const isCoordByEmailInd = participantesInd.some(
                      (p) =>
                        isMeInd(p) &&
                        (p.rol?.trim().toLowerCase() ?? '') === 'coordinador'
                    );
                    const coordinadorIdsIndicadores =
                      isCoordByEmailInd &&
                      uidInd &&
                      !coordIdsInd.includes(uidInd)
                        ? [...coordIdsInd, uidInd]
                        : coordIdsInd;
                    return (
                      <IndicadoresCard
                        projectId={selectedProject.id}
                        coordinadorIds={coordinadorIdsIndicadores}
                        currentUserId={uidInd}
                      />
                    );
                  })()}
                </div>
              )}

              {selectedTab === 'Presupuesto' && (
                <div className="h-full pt-2">
                  <PresupuestoCard
                    projectId={selectedProject.id}
                    presupuestoTotal={selectedProject.presupuestoTotal ?? 0}
                    projectName={selectedProject.proyecto}
                  />
                </div>
              )}

              {selectedTab === 'Historial' && (
                <div className="h-full pt-4">
                  <HistorialCard projectId={selectedProject.id} />
                </div>
              )}

              {selectedTab === 'Seguimiento' && (
                <div className="h-full pt-4">
                  <SeguimientoCard
                    projectId={selectedProject.id}
                    projectName={selectedProject.proyecto}
                    rolEnProyecto={(() => {
                      const participantes =
                        selectedProject.participantes_rel ?? [];
                      const userId = session?.user?.id;
                      const userEmail = session?.user?.email?.trim().toLowerCase();
                      const isMe = (p: { userId?: string | null; email?: string | null }) =>
                        p.userId === userId ||
                        (userEmail &&
                          p.email?.trim().toLowerCase() === userEmail);
                      const isCoord = participantes.some(
                        (p) =>
                          isMe(p) &&
                          (p.rol?.trim().toLowerCase() ?? '') === 'coordinador'
                      );
                      if (isCoord) return 'Coordinador';
                      const first = participantes.find(isMe);
                      return first?.rol ?? null;
                    })()}
                    activeRole={session?.user?.activeRole ?? null}
                    currentUser={
                      session?.user
                        ? {
                            id: session.user.id,
                            name: session.user.name ?? null,
                            image: session.user.image ?? null,
                          }
                        : null
                    }
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

      {/* Dialog Editar socios comunitarios (tab Participantes) */}
      <Dialog open={isEditarSociosOpen} onOpenChange={setIsEditarSociosOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar socios comunitarios</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Socios del proyecto
              </Label>
              <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto rounded-md border bg-gray-50/50 p-2">
                {editarSociosIds.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">
                    No hay socios agregados. Agrega uno desde el catálogo abajo.
                  </p>
                ) : (
                  editarSociosIds.map((id) => {
                    const socio = editarSociosCatalog.find((s) => s.id === id);
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-gray-900">
                          {socio?.nombre ?? id}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() =>
                            setEditarSociosIds((prev) => prev.filter((x) => x !== id))
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Agregar socio desde el catálogo
              </Label>
              <Select
                key={`socio-add-${editarSociosIds.length}`}
                value={SELECT_NONE_VALUE}
                onValueChange={(value) => {
                  if (value && value !== SELECT_NONE_VALUE && !editarSociosIds.includes(value)) {
                    setEditarSociosIds((prev) => [...prev, value]);
                  }
                }}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Seleccionar socio comunitario..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE_VALUE} disabled>
                    — Seleccionar —
                  </SelectItem>
                  {editarSociosCatalog
                    .filter((s) => !editarSociosIds.includes(s.id))
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nombre}
                      </SelectItem>
                    ))}
                  {editarSociosCatalog.filter(
                    (s) => !editarSociosIds.includes(s.id)
                  ).length === 0 && (
                    <span className="text-sm text-gray-500 px-2 py-1.5 block">
                      Todos los socios ya están agregados
                    </span>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-2 border-t">
              <Label className="text-sm font-medium text-gray-700">
                Crear nuevo socio comunitario
              </Label>
              <div className="mt-2 space-y-2">
                <Input
                  placeholder="Nombre del socio comunitario"
                  value={nuevoSocioNombre}
                  onChange={(e) => setNuevoSocioNombre(e.target.value)}
                />
                <Textarea
                  placeholder="Descripción (opcional)"
                  value={nuevoSocioDescripcion}
                  onChange={(e) => setNuevoSocioDescripcion(e.target.value)}
                  className="min-h-[72px]"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={nuevoSocioSaving || !nuevoSocioNombre.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={async () => {
                    const nombre = nuevoSocioNombre.trim();
                    const descripcion = nuevoSocioDescripcion.trim();
                    if (!nombre) return;
                    setNuevoSocioSaving(true);
                    const result = await createSocioComunitario(
                      nombre,
                      descripcion || undefined
                    );
                    setNuevoSocioSaving(false);
                    if (result.success && result.data) {
                      const socio = result.data;
                      setEditarSociosCatalog((prev) => {
                        if (prev.find((s) => s.id === socio.id)) return prev;
                        return [...prev, socio];
                      });
                      setEditarSociosIds((prev) =>
                        prev.includes(socio.id) ? prev : [...prev, socio.id]
                      );
                      setNuevoSocioNombre('');
                      setNuevoSocioDescripcion('');
                    } else {
                      alert(result.error ?? 'Error al crear socio comunitario');
                    }
                  }}
                >
                  {nuevoSocioSaving ? 'Creando socio...' : 'Crear y agregar al catálogo'}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditarSociosOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={editarSociosSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={async () => {
                if (!selectedProject) return;
                setEditarSociosSaving(true);
                const result = await updateProyectoGeneralTab({
                  proyectoId: selectedProject.id,
                  sociosComunitariosIds: editarSociosIds,
                });
                setEditarSociosSaving(false);
                if (result.success && result.data) {
                  setSelectedProject(result.data);
                  setIsEditarSociosOpen(false);
                } else {
                  alert(result.error ?? 'Error al guardar socios comunitarios');
                }
              }}
            >
              {editarSociosSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ProyectosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><span className="text-muted-foreground">Cargando...</span></div>}>
      <ProyectosContent />
    </Suspense>
  );
}

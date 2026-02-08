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
import { MultiSelectNombres, MULTI_VALUE_SEP } from '@/components/ui/multi-select-nombres';
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
  Calendar,
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
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useProyectos } from '@/hooks/useProyectos';
import {
  type CarreraItem,
  type ComunaItem,
  type EscuelaItem,
  type GrupoInteresItem,
  type SocioComunitarioItem,
  ProyectoWithRelations,
} from '@/types/proyecto';
import { ProgressCard } from '@/components/proyectos/ProgressCard';
import { ProjectInfoCard } from '@/components/proyectos/ProjectInfoCard';
import GanttChart from '@/components/proyectos/GanttChart';
import { IndicadoresCard } from '@/components/proyectos/IndicadoresCard';
import { HistorialCard } from '@/components/proyectos/HistorialCard';
import { PresupuestoCard } from '@/components/proyectos/PresupuestoCard';
import { ResumenProyectoCard } from '@/components/proyectos/ResumenProyectoCard';
import { SeguimientoCard } from '@/components/seguimiento/SeguimientoCard';
import { ModalParticipante } from '@/components/proyectos/ModalParticipante';
import { ProyectoParticipante } from '@prisma/client';
import { User as UserType } from '@prisma/client';
import {
  getCarreras,
  getComunas,
  getEscuelas,
  getGruposInteres,
  getSociosComunitarios,
  updateProyectoGeneralTab,
} from '@/lib/actions/proyectos';
import { getSedes } from '@/lib/actions/configuracion';

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
    escuelasTexto: project.escuelas
      ?.map((item) => item.escuela.nombre)
      .join(MULTI_VALUE_SEP) ?? '',
    carrerasTexto: project.carreras
      ?.map((item) => item.carrera.nombre)
      .join(MULTI_VALUE_SEP) ?? '',
    comunasTexto: project.comunas
      ?.map((item) => item.comuna.nombre)
      .join(MULTI_VALUE_SEP) ?? '',
    gruposInteresTexto: project.gruposInteres
      ?.map((item) => item.grupoInteres.nombre)
      .join(MULTI_VALUE_SEP) ?? '',
    sociosComunitariosTexto: project.sociosComunitarios
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
      metodologiaMedicion:
        project.desarrolloTecnico?.metodologiaMedicion ?? '',
      ejesImpacto: project.desarrolloTecnico?.ejesImpacto ?? '',
      factorInnovador: project.desarrolloTecnico?.factorInnovador ?? '',
      escalabilidad: project.desarrolloTecnico?.escalabilidad ?? '',
    },
  };
};

export default function ProyectosPage() {
  const { data: session } = useSession();
  const {
    proyectos: proyectosIniciales,
    loading,
    error,
    fetchProyectos,
    createProyecto,
    updateProyecto,
    deleteProyecto,
  } = useProyectos();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] =
    useState<ProyectoWithRelations | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<
    | 'Resumen'
    | 'General'
    | 'Equipo'
    | 'Gantt'
    | 'Indicadores'
    | 'Presupuesto'
    | 'Historial'
    | 'Seguimiento'
  >('General');

  // Estado para el modal de participante
  const [selectedParticipante, setSelectedParticipante] = useState<
    (ProyectoParticipante & { user?: UserType | null }) | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  if (
    proyectosIniciales.length > 0 &&
    !selectedProject &&
    !showAddForm &&
    !showEditForm
  ) {
    const firstProject = proyectosIniciales[0];
    setSelectedProject(firstProject);
    setTempVideoUrl(projectVideos[firstProject.id] || '');
  }

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

  const handleSelectProject = (project: ProyectoWithRelations) => {
    setSelectedProject(project);
    setIsSheetOpen(false);
    // Cargar URL del video del proyecto seleccionado si existe
    setTempVideoUrl(projectVideos[project.id] || '');
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
      escuelas: escuelasResult.success ? escuelasResult.data ?? [] : [],
      carreras: carrerasResult.success ? carrerasResult.data ?? [] : [],
      comunas: comunasResult.success ? comunasResult.data ?? [] : [],
      gruposInteres: gruposResult.success ? gruposResult.data ?? [] : [],
      sociosComunitarios: sociosResult.success ? sociosResult.data ?? [] : [],
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
    setTempVideoUrl(projectVideos[selectedProject.id] || '');
    setIsGeneralEditMode(false);
  };

  const handleSaveGeneralTab = async () => {
    if (!selectedProject || !generalDraft || isGeneralSaving) return;
    setIsGeneralSaving(true);

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
        setIsGeneralSaving(false);
        return;
      }

      const result = await updateProyectoGeneralTab({
        proyectoId: selectedProject.id,
        proyecto: generalDraft.proyecto.trim(),
        sede: generalDraft.sede.trim(),
        objetivoGeneral: {
          id: generalDraft.objetivoGeneralId,
          descripcion: generalDraft.objetivoGeneral.trim(),
        },
        objetivosEspecificos: generalDraft.objetivosEspecificos.map((obj) => ({
          ...obj,
          descripcion: obj.descripcion.trim(),
        })),
        escuelasIds: escuelasMapped.ids,
        carrerasIds: carrerasMapped.ids,
        comunasIds: comunasMapped.ids,
        gruposInteresIds: gruposMapped.ids,
        sociosComunitariosIds: sociosMapped.ids,
        desarrolloTecnico: {
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
        },
      });

      if (!result.success || !result.data) {
        alert(result.error || 'Error al actualizar el proyecto');
        setIsGeneralSaving(false);
        return;
      }

      handleSaveVideo();
      setSelectedProject(result.data);
      setGeneralDraft(buildGeneralDraft(result.data));
      setIsGeneralEditMode(false);
      fetchProyectos();
      setIsGeneralSaving(false);
    } catch (error) {
      alert('Error inesperado al guardar los cambios');
      setIsGeneralSaving(false);
    }
  };

  useEffect(() => {
    if (!selectedProject) {
      setGeneralDraft(null);
      return;
    }
    setGeneralDraft(buildGeneralDraft(selectedProject));
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

  const handleSaveVideo = () => {
    if (!selectedProject) return;

    if (!tempVideoUrl.trim()) {
      // Si está vacío, eliminar el video
      setProjectVideos((prev) => {
        const newVideos = { ...prev };
        delete newVideos[selectedProject.id];
        return newVideos;
      });
      return;
    }

    const videoId = extractYouTubeVideoId(tempVideoUrl);
    if (!videoId) {
      alert('Por favor ingresa una URL válida de YouTube');
      return;
    }

    // Guardar la URL del video para este proyecto
    setProjectVideos((prev) => ({
      ...prev,
      [selectedProject.id]: tempVideoUrl,
    }));
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
      {/* Sheet Panel - Project Selector */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="px-6 py-4 border-b">
              <SheetTitle className="text-xl font-bold text-gray-900">
                Seleccionar Proyecto
              </SheetTitle>
            </SheetHeader>

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
                      selectedProject?.proyecto === project.proyecto
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
        ) : selectedProject ? (
          <div className="flex flex-col h-full px-8 pt-6 pb-6">
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
                            prev
                              ? { ...prev, proyecto: e.target.value }
                              : prev
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
                    <div className="flex items-center space-x-1 pr-3 border-r border-gray-200">
                      <Calendar className="h-4 w-4 text-gray-600" />
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
                        {selectedProject.reunionesHechas}/
                        {selectedProject.reunionesTotales} reuniones
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
                      onClick={() => setSelectedTab('Equipo')}
                      size="sm"
                      className={`flex-1 h-7 min-w-0 px-2 text-sm font-medium ${
                        selectedTab === 'Equipo'
                          ? 'bg-gray-800 text-white hover:bg-gray-800'
                          : 'text-gray-700 bg-white hover:bg-gray-200 hover:text-gray-800 border border-gray-300'
                      }`}
                    >
                      Equipo
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
                                          <Textarea
                                            value={
                                              generalDraft?.objetivoGeneral ?? ''
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
                                            className="min-h-[120px] text-base border-2 border-emerald-200 focus:border-emerald-400 bg-white"
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

                                {/* Objetivos Específicos */}
                                {objetivosEspecificos.length > 0 && (
                                  <div className="space-y-6">
                                    <div className="sticky top-0 z-10 bg-gradient-to-r from-gray-200 to-white px-3 py-2 rounded-lg flex items-center space-x-2.5">
                                      <ListChecks className="h-5 w-5 text-emerald-600" />
                                      <h4 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                                        Objetivos Específicos
                                      </h4>
                                    </div>
                                    <div className="ml-8 space-y-6">
                                      {objetivosEspecificos.map(
                                        (objetivo, index) => (
                                          <div
                                            key={objetivo.id}
                                            className="flex items-start space-x-4"
                                          >
                                            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                                              {index + 1}
                                            </div>
                                            {isGeneralEditMode ? (
                                              <Textarea
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
                                                className="min-h-[90px] text-[15px] border-2 border-emerald-200 focus:border-emerald-400 bg-white flex-1"
                                              />
                                            ) : (
                                              <p className="text-gray-800 leading-relaxed flex-1 text-[15px] pt-0.5">
                                                {objetivo.descripcion}
                                              </p>
                                            )}
                                          </div>
                                        )
                                      )}
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
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={tempVideoUrl}
                                    onChange={(e) =>
                                      setTempVideoUrl(e.target.value)
                                    }
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="border-2 border-gray-300 rounded-lg focus:border-blue-500"
                                  />
                                  <Button
                                    type="button"
                                    onClick={handleSaveVideo}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    Guardar
                                  </Button>
                                </div>
                              </div>
                            )}
                            {(() => {
                              const activeVideoUrl =
                                projectVideos[selectedProject.id] ||
                                tempVideoUrl;
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
                                      options={catalogosGeneral.sedes.map((s) => ({ id: s.id, nombre: s.nombre }))}
                                      value={generalDraft?.sede ?? ''}
                                      onChange={(v) =>
                                        setGeneralDraft((prev) =>
                                          prev ? { ...prev, sede: v } : prev
                                        )
                                      }
                                      placeholder="Seleccionar sedes"
                                      className="min-h-[80px]"
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
                                            value={generalDraft?.comunasTexto ?? ''}
                                            onChange={(v) =>
                                              setGeneralDraft((prev) =>
                                                prev ? { ...prev, comunasTexto: v } : prev
                                              )
                                            }
                                            placeholder="Seleccionar comunas"
                                            className="min-h-[80px]"
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
                                            value={generalDraft?.escuelasTexto ?? ''}
                                            onChange={(v) =>
                                              setGeneralDraft((prev) =>
                                                prev ? { ...prev, escuelasTexto: v } : prev
                                              )
                                            }
                                            placeholder="Seleccionar escuelas"
                                            className="min-h-[80px]"
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
                                            value={generalDraft?.carrerasTexto ?? ''}
                                            onChange={(v) =>
                                              setGeneralDraft((prev) =>
                                                prev ? { ...prev, carrerasTexto: v } : prev
                                              )
                                            }
                                            placeholder="Seleccionar carreras"
                                            className="min-h-[80px]"
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
                                            options={catalogosGeneral.gruposInteres}
                                            value={generalDraft?.gruposInteresTexto ?? ''}
                                            onChange={(v) =>
                                              setGeneralDraft((prev) =>
                                                prev ? { ...prev, gruposInteresTexto: v } : prev
                                              )
                                            }
                                            placeholder="Seleccionar grupos de interés"
                                            className="min-h-[80px]"
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
                              content: desarrolloTecnico?.pertinenciaLocal ?? '',
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
                              content: desarrolloTecnico?.perspectiveGenero ?? '',
                              icon: <Heart className="h-4 w-4" />,
                              group: 'publico-objetivo',
                              field: 'perspectiveGenero',
                            },
                            {
                              key: 'necesidad',
                              title: 'Necesidad, Problema u Oportunidad',
                              content: desarrolloTecnico?.necesidadProblema ?? '',
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
                                          <Textarea
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
                                            className="min-h-[120px] text-[15px] border-2 border-gray-200 focus:border-emerald-400 bg-white"
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

              {selectedTab === 'Equipo' && selectedProject && (
                <div className="h-full overflow-hidden pt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-4 h-full">
                    {/* Columna 1: Encargados, Coordinadores y Colaboradores */}
                    <div className="h-full flex flex-col px-6 lg:px-8 lg:border-r lg:border-gray-200 overflow-hidden">
                      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                        <div className="space-y-6">
                          {/* Encargados */}
                          {selectedProject.participantes_rel &&
                            selectedProject.participantes_rel.filter(
                              (p) => p.rol === 'Encargado'
                            ).length > 0 && (
                              <div className="mb-8">
                                <div className="bg-gradient-to-r from-gray-200 to-white px-3 py-2 rounded-lg flex items-center space-x-2.5 mb-4">
                                  <Crown className="h-5 w-5 text-emerald-600" />
                                  <h4 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                                    Encargados
                                  </h4>
                                </div>
                                <div className="space-y-3">
                                  {selectedProject.participantes_rel
                                    .filter((p) => p.rol === 'Encargado')
                                    .map((participante) => {
                                      const nombre =
                                        participante.user?.name ||
                                        participante.nombre ||
                                        'Sin nombre';
                                      const cargo = participante.cargo || '';
                                      const imagen = participante.user?.image;
                                      return (
                                        <div
                                          key={participante.id}
                                          onClick={() => {
                                            setSelectedParticipante(
                                              participante
                                            );
                                            setIsModalOpen(true);
                                          }}
                                          className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-transparent rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
                                        >
                                          {imagen ? (
                                            <img
                                              src={imagen}
                                              alt={nombre}
                                              className="h-11 w-11 rounded-full ring-2 ring-gray-200"
                                            />
                                          ) : (
                                            <div className="h-11 w-11 rounded-full bg-gray-100 flex items-center justify-center ring-2 ring-gray-200">
                                              <Users className="h-5 w-5 text-gray-800" />
                                            </div>
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                              {nombre}
                                            </p>
                                            {cargo && (
                                              <p className="text-xs text-gray-600 truncate">
                                                {cargo}
                                              </p>
                                            )}
                                          </div>
                                          <Crown className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            )}

                          {/* Coordinadores */}
                          {selectedProject.participantes_rel &&
                            selectedProject.participantes_rel.filter(
                              (p) => p.rol === 'Coordinador'
                            ).length > 0 && (
                              <div className="mb-8">
                                <div className="bg-gradient-to-r from-gray-200 to-white px-3 py-2 rounded-lg flex items-center space-x-2.5 mb-4">
                                  <Users className="h-5 w-5 text-emerald-600" />
                                  <h4 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                                    Coordinadores
                                  </h4>
                                </div>
                                <div className="space-y-3">
                                  {selectedProject.participantes_rel
                                    .filter((p) => p.rol === 'Coordinador')
                                    .map((participante) => {
                                      const nombre =
                                        participante.user?.name ||
                                        participante.nombre ||
                                        'Sin nombre';
                                      const cargo = participante.cargo || '';
                                      const imagen = participante.user?.image;
                                      return (
                                        <div
                                          key={participante.id}
                                          onClick={() => {
                                            setSelectedParticipante(
                                              participante
                                            );
                                            setIsModalOpen(true);
                                          }}
                                          className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-transparent rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
                                        >
                                          {imagen ? (
                                            <img
                                              src={imagen}
                                              alt={nombre}
                                              className="h-11 w-11 rounded-full ring-2 ring-gray-200"
                                            />
                                          ) : (
                                            <div className="h-11 w-11 rounded-full bg-gray-100 flex items-center justify-center ring-2 ring-gray-200">
                                              <Users className="h-5 w-5 text-gray-800" />
                                            </div>
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                              {nombre}
                                            </p>
                                            {cargo && (
                                              <p className="text-xs text-gray-600 truncate">
                                                {cargo}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            )}

                          {/* Colaboradores */}
                          {selectedProject.participantes_rel &&
                            selectedProject.participantes_rel.filter(
                              (p) => p.rol === 'Colaborador'
                            ).length > 0 && (
                              <div className="mb-8">
                                <div className="sticky top-0 z-10 bg-gradient-to-r from-gray-200 to-white px-3 py-2 rounded-lg flex items-center space-x-2.5 mb-4">
                                  <Users className="h-5 w-5 text-emerald-600" />
                                  <h4 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                                    Colaboradores
                                  </h4>
                                </div>
                                <div className="space-y-3">
                                  {selectedProject.participantes_rel
                                    .filter((p) => p.rol === 'Colaborador')
                                    .map((participante) => {
                                      const nombre =
                                        participante.user?.name ||
                                        participante.nombre ||
                                        'Sin nombre';
                                      const cargo = participante.cargo || '';
                                      const imagen = participante.user?.image;
                                      return (
                                        <div
                                          key={participante.id}
                                          onClick={() => {
                                            setSelectedParticipante(
                                              participante
                                            );
                                            setIsModalOpen(true);
                                          }}
                                          className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-transparent rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
                                        >
                                          {imagen ? (
                                            <img
                                              src={imagen}
                                              alt={nombre}
                                              className="h-11 w-11 rounded-full ring-2 ring-gray-200"
                                            />
                                          ) : (
                                            <div className="h-11 w-11 rounded-full bg-gray-100 flex items-center justify-center ring-2 ring-gray-200">
                                              <Users className="h-5 w-5 text-gray-800" />
                                            </div>
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                              {nombre}
                                            </p>
                                            {cargo && (
                                              <p className="text-xs text-gray-600 truncate">
                                                {cargo}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            )}

                          {/* Mensaje si no hay equipo */}
                          {(!selectedProject.participantes_rel ||
                            selectedProject.participantes_rel.filter((p) =>
                              [
                                'Encargado',
                                'Coordinador',
                                'Colaborador',
                              ].includes(p.rol)
                            ).length === 0) && (
                            <div className="text-center py-8 text-gray-500">
                              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                              <p>No hay equipo asignado</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Columna 2: Docentes */}
                    <div className="h-full flex flex-col px-6 lg:px-8 lg:border-r lg:border-gray-200 overflow-hidden">
                      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                        {selectedProject.participantes_rel &&
                        selectedProject.participantes_rel.filter(
                          (p) => p.rol === 'Docente'
                        ).length > 0 ? (
                          <div className="space-y-6">
                            <div className="mb-8">
                              <div className="sticky top-0 z-10 bg-gradient-to-r from-gray-200 to-white px-3 py-2 rounded-lg flex items-center space-x-2.5 mb-4">
                                <Users className="h-5 w-5 text-emerald-600" />
                                <h4 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                                  Docentes
                                </h4>
                              </div>
                              <div className="space-y-3">
                                {selectedProject.participantes_rel
                                  .filter((p) => p.rol === 'Docente')
                                  .map((participante) => {
                                    const nombre =
                                      participante.user?.name ||
                                      participante.nombre ||
                                      'Sin nombre';
                                    const cargo = participante.cargo || '';
                                    const imagen = participante.user?.image;
                                    return (
                                      <div
                                        key={participante.id}
                                        onClick={() => {
                                          setSelectedParticipante(participante);
                                          setIsModalOpen(true);
                                        }}
                                        className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-transparent rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
                                      >
                                        {imagen ? (
                                          <img
                                            src={imagen}
                                            alt={nombre}
                                            className="h-11 w-11 rounded-full ring-2 ring-gray-200"
                                          />
                                        ) : (
                                          <div className="h-11 w-11 rounded-full bg-gray-100 flex items-center justify-center ring-2 ring-gray-200">
                                            <Users className="h-5 w-5 text-gray-800" />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-gray-900 truncate">
                                            {nombre}
                                          </p>
                                          {cargo && (
                                            <p className="text-xs text-gray-600 truncate">
                                              {cargo}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>No hay docentes asignados</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Columna 3: Estudiantes */}
                    <div className="h-full flex flex-col px-6 lg:px-8 lg:border-r lg:border-gray-200 overflow-hidden">
                      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                        {selectedProject.participantes_rel &&
                        selectedProject.participantes_rel.filter(
                          (p) => p.rol === 'Estudiante'
                        ).length > 0 ? (
                          <div className="space-y-6">
                            <div className="mb-8">
                              <div className="sticky top-0 z-10 bg-gradient-to-r from-gray-200 to-white px-3 py-2 rounded-lg flex items-center space-x-2.5 mb-4">
                                <Users className="h-5 w-5 text-emerald-600" />
                                <h4 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                                  Estudiantes
                                </h4>
                              </div>
                              <div className="space-y-3">
                                {selectedProject.participantes_rel
                                  .filter((p) => p.rol === 'Estudiante')
                                  .map((participante) => {
                                    const nombre =
                                      participante.user?.name ||
                                      participante.nombre ||
                                      'Sin nombre';
                                    const cargo = participante.cargo || '';
                                    const imagen = participante.user?.image;
                                    return (
                                      <div
                                        key={participante.id}
                                        onClick={() => {
                                          setSelectedParticipante(participante);
                                          setIsModalOpen(true);
                                        }}
                                        className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-transparent rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
                                      >
                                        {imagen ? (
                                          <img
                                            src={imagen}
                                            alt={nombre}
                                            className="h-11 w-11 rounded-full ring-2 ring-gray-200"
                                          />
                                        ) : (
                                          <div className="h-11 w-11 rounded-full bg-gray-100 flex items-center justify-center ring-2 ring-gray-200">
                                            <Users className="h-5 w-5 text-gray-800" />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-gray-900 truncate">
                                            {nombre}
                                          </p>
                                          {cargo && (
                                            <p className="text-xs text-gray-600 truncate">
                                              {cargo}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>No hay estudiantes asignados</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Columna 4: Beneficiarios */}
                    <div className="h-full flex flex-col px-6 lg:px-8 overflow-hidden">
                      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                        {selectedProject.participantes_rel &&
                        selectedProject.participantes_rel.filter(
                          (p) => p.rol === 'Beneficiario'
                        ).length > 0 ? (
                          <div className="space-y-6">
                            <div className="mb-8">
                              <div className="sticky top-0 z-10 bg-gradient-to-r from-gray-200 to-white px-3 py-2 rounded-lg flex items-center space-x-2.5 mb-4">
                                <Users className="h-5 w-5 text-emerald-600" />
                                <h4 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                                  Beneficiarios
                                </h4>
                              </div>
                              <div className="space-y-3">
                                {selectedProject.participantes_rel
                                  .filter((p) => p.rol === 'Beneficiario')
                                  .map((participante) => {
                                    const nombre =
                                      participante.user?.name ||
                                      participante.nombre ||
                                      'Sin nombre';
                                    const cargo = participante.cargo || '';
                                    const imagen = participante.user?.image;
                                    const socioComunitario =
                                      participante.socioComunitario?.nombre;
                                    return (
                                      <div
                                        key={participante.id}
                                        onClick={() => {
                                          setSelectedParticipante(participante);
                                          setIsModalOpen(true);
                                        }}
                                        className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-transparent rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
                                      >
                                        {imagen ? (
                                          <img
                                            src={imagen}
                                            alt={nombre}
                                            className="h-11 w-11 rounded-full ring-2 ring-gray-200"
                                          />
                                        ) : (
                                          <div className="h-11 w-11 rounded-full bg-gray-100 flex items-center justify-center ring-2 ring-gray-200">
                                            <Users className="h-5 w-5 text-gray-800" />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-gray-900 truncate">
                                            {nombre}
                                          </p>
                                          {cargo && (
                                            <p className="text-xs text-gray-600 truncate">
                                              {cargo}
                                            </p>
                                          )}
                                          {socioComunitario && (
                                            <p className="text-xs text-blue-600 truncate font-medium mt-0.5">
                                              {socioComunitario}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>No hay beneficiarios asignados</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedTab === 'Gantt' && (
                <div className="h-full pt-4">
                  <GanttChart
                    projectId={selectedProject.id}
                    projectName={selectedProject.proyecto}
                    onProjectChange={() => setIsSheetOpen(true)}
                  />
                </div>
              )}

              {selectedTab === 'Indicadores' && (
                <div className="h-full pt-2">
                  <IndicadoresCard projectId={selectedProject.id} />
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
                    rolEnProyecto={
                      selectedProject.participantes_rel?.find(
                        (p) => p.userId === session?.user?.id
                      )?.rol ?? null
                    }
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
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FolderKanban className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-4">
                Selecciona un proyecto para ver sus detalles
              </p>
              <Button
                onClick={() => setIsSheetOpen(true)}
                variant="outline"
                className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 mx-auto"
              >
                <Search className="h-4 w-4" />
                <span>Buscar proyecto</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Información del Participante */}
      <ModalParticipante
        participante={selectedParticipante}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
}

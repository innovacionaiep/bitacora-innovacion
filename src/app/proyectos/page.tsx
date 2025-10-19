'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Edit,
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
} from 'lucide-react';
import { useState } from 'react';
import { useProyectos } from '@/hooks/useProyectos';
import { ProyectoWithRelations } from '@/types/proyecto';
import { ProgressCard } from '@/components/proyectos/ProgressCard';
import { ProjectInfoCard } from '@/components/proyectos/ProjectInfoCard';
import { ObjetivosCard } from '@/components/proyectos/ObjetivosCard';
import { DesarrolloTecnicoCard } from '@/components/proyectos/DesarrolloTecnicoCard';

// Helper para extraer el ID de video de YouTube desde una URL
const extractYouTubeVideoId = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    
    // Formato: youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
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

export default function ProyectosPage() {
  const {
    proyectos: proyectosIniciales,
    loading,
    error,
    createProyecto,
    updateProyecto,
    deleteProyecto,
  } = useProyectos();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProyectoWithRelations | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'General' | 'Objetivos' | 'Equipo' | 'Gantt' | 'Indicadores' | 'Presupuesto'>('General');
  
  // Estado para videos de YouTube por proyecto
  const [projectVideos, setProjectVideos] = useState<Record<string, string>>({});
  const [tempVideoUrl, setTempVideoUrl] = useState('');

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
      project.escuelas?.some(escuelaRel => 
        escuelaRel.escuela.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      ) || false
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
        const { error } = await createProyecto(formData);
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

  const handleSaveVideo = () => {
    if (!selectedProject) return;
    
    if (!tempVideoUrl.trim()) {
      // Si está vacío, eliminar el video
      setProjectVideos(prev => {
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
    setProjectVideos(prev => ({
      ...prev,
      [selectedProject.id]: tempVideoUrl
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

    const escuelaNombre = project.escuelas?.[0]?.escuela.nombre || 'la escuela correspondiente';
    
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
                            {project.sede} • {project.escuelas?.map(e => e.escuela.nombre).join(', ') || 'Sin escuela'}
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
                          <SelectItem value="Antofagasta">
                            Antofagasta
                          </SelectItem>
                          <SelectItem value="La Serena">La Serena</SelectItem>
                          <SelectItem value="Los Ángeles">
                            Los Ángeles
                          </SelectItem>
                          <SelectItem value="Barrio Universitario">
                            Barrio Universitario
                          </SelectItem>
                          <SelectItem value="Santiago">Santiago</SelectItem>
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
            <div className="flex-shrink-0 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-bold text-gray-900">
                      {selectedProject.proyecto}
                    </h1>
                </div>
                
                {/* Botones de navegación */}
                <div className="flex items-center gap-2">
                          <Button
                    onClick={() => setSelectedTab('General')}
                            size="sm"
                    className={`text-sm font-medium ${
                      selectedTab === 'General'
                        ? 'bg-black text-white hover:bg-black'
                        : 'text-gray-700 bg-white hover:bg-gray-200 hover:text-black border border-gray-300'
                    }`}
                  >
                    General
                          </Button>
                  <Button
                    onClick={() => setSelectedTab('Objetivos')}
                    size="sm"
                    className={`text-sm font-medium ${
                      selectedTab === 'Objetivos'
                        ? 'bg-black text-white hover:bg-black'
                        : 'text-gray-700 bg-white hover:bg-gray-200 hover:text-black border border-gray-300'
                    }`}
                  >
                    Objetivos
                  </Button>
                  <Button
                    onClick={() => setSelectedTab('Equipo')}
                    size="sm"
                    className={`text-sm font-medium ${
                      selectedTab === 'Equipo'
                        ? 'bg-black text-white hover:bg-black'
                        : 'text-gray-700 bg-white hover:bg-gray-200 hover:text-black border border-gray-300'
                    }`}
                  >
                    Equipo
                  </Button>
                  <Button
                    onClick={() => setSelectedTab('Gantt')}
                    size="sm"
                    className={`text-sm font-medium ${
                      selectedTab === 'Gantt'
                        ? 'bg-black text-white hover:bg-black'
                        : 'text-gray-700 bg-white hover:bg-gray-200 hover:text-black border border-gray-300'
                    }`}
                  >
                    Gantt
                  </Button>
                  <Button
                    onClick={() => setSelectedTab('Indicadores')}
                    size="sm"
                    className={`text-sm font-medium ${
                      selectedTab === 'Indicadores'
                        ? 'bg-black text-white hover:bg-black'
                        : 'text-gray-700 bg-white hover:bg-gray-200 hover:text-black border border-gray-300'
                    }`}
                  >
                    Indicadores
                  </Button>
                  <Button
                    onClick={() => setSelectedTab('Presupuesto')}
                    size="sm"
                    className={`text-sm font-medium ${
                      selectedTab === 'Presupuesto'
                        ? 'bg-black text-white hover:bg-black'
                        : 'text-gray-700 bg-white hover:bg-gray-200 hover:text-black border border-gray-300'
                    }`}
                  >
                    Presupuesto
                  </Button>
                  </div>
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
                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                          selectedProject.focalizacion === 'Ambiental' 
                            ? 'bg-green-100 text-green-700'
                            : selectedProject.focalizacion === 'Social'
                            ? 'bg-yellow-100 text-yellow-700'
                            : selectedProject.focalizacion === 'Productiva'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          Foco {selectedProject.focalizacion}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1 pr-3 border-r border-gray-200">
                      <Users className="h-4 w-4 text-gray-600" />
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
                        {selectedProject.participantes} participantes
                      </span>
                    </div>
                <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4 text-gray-600" />
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
                        {selectedProject.reunionesHechas}/{selectedProject.reunionesTotales} reuniones
                      </span>
                </div>
              </div>
                    </div>
                    
            {/* Contenido condicional según tab seleccionado - Scrollable */}
            <div className="flex-1 overflow-hidden mt-8">
              {selectedTab === 'General' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full min-h-0">
                {/* Columna izquierda: Información Básica */}
                <Card className="h-full shadow-md flex flex-col min-h-0">
                  <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
                    <div className="bg-gray-100 px-4 py-3 rounded-t-lg flex-shrink-0">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-5 w-5 text-gray-700" />
                        <h3 className="text-base font-bold text-gray-700 uppercase tracking-wide">
                          Información Básica
                        </h3>
                  </div>
                </div>
                    <div className="p-6 flex-1 overflow-auto min-h-0 custom-scrollbar">
                      <div className="space-y-6">
                        {/* Sección 1: Contribución Local */}
                        <div className="mb-8">
                          <div className="flex items-center gap-3 mb-6">
                            <span className="text-xs font-semibold text-gray-400 tracking-wider pr-4">Contribución Local</span>
                            <div className="h-px bg-gray-200 flex-1"></div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Sedes */}
                          <div className="border-l-4 border-cyan-500 pl-4 py-1">
                            <div className="flex items-center gap-2 mb-3">
                              <MapPin className="h-4 w-4 text-cyan-600" />
                              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Sedes
                              </h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary" className="text-sm font-normal bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border-cyan-200">
                                {selectedProject.sede}
                              </Badge>
              </div>
            </div>

                          {/* Comunas */}
                          {selectedProject.comunas && selectedProject.comunas.length > 0 && (
                            <div className="border-l-4 border-cyan-500 pl-4 py-1">
                              <div className="flex items-center gap-2 mb-3">
                                <Building2 className="h-4 w-4 text-cyan-600" />
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                  Comunas
                                </h3>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {selectedProject.comunas.map((comunaRel, idx) => (
                                  <Badge key={idx} variant="outline" className="text-sm font-normal bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border-cyan-300">
                                    {comunaRel.comuna.nombre}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          </div>
                        </div>

                        {/* Sección 2: Contribución Disciplinar */}
                        <div className="mb-8">
                          <div className="flex items-center gap-3 mb-6">
                            <span className="text-xs font-semibold text-gray-400 tracking-wider pr-4">Contribución Disciplinar</span>
                            <div className="h-px bg-gray-200 flex-1"></div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Escuelas */}
                          {selectedProject.escuelas && selectedProject.escuelas.length > 0 && (
                            <div className="border-l-4 border-indigo-500 pl-4 py-1">
                              <div className="flex items-center gap-2 mb-3">
                                <GraduationCap className="h-4 w-4 text-indigo-600" />
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                  Escuelas
                                </h3>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {selectedProject.escuelas.map((escuelaRel, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-sm font-normal bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200">
                                    {escuelaRel.escuela.nombre}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Carreras */}
                          {selectedProject.carreras && selectedProject.carreras.length > 0 && (
                            <div className="border-l-4 border-indigo-500 pl-4 py-1">
                              <div className="flex items-center gap-2 mb-3">
                                <BookOpen className="h-4 w-4 text-indigo-600" />
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                  Carreras
                                </h3>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {selectedProject.carreras.map((carreraRel, idx) => (
                                  <Badge key={idx} variant="outline" className="text-sm font-normal bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-300">
                                    {carreraRel.carrera.nombre}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          </div>
                        </div>

                        {/* Sección 3: Contribución Comunitaria */}
                        <div className="mb-8">
                          <div className="flex items-center gap-3 mb-6">
                            <span className="text-xs font-semibold text-gray-400 tracking-wider pr-4">Contribución Comunitaria</span>
                            <div className="h-px bg-gray-200 flex-1"></div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Grupos de Interés */}
                          {selectedProject.gruposInteres && selectedProject.gruposInteres.length > 0 && (
                            <div className="border-l-4 border-purple-500 pl-4 py-1">
                              <div className="flex items-center gap-2 mb-3">
                                <UsersRound className="h-4 w-4 text-purple-600" />
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                  Grupos de Interés
                                </h3>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {selectedProject.gruposInteres.map((grupoRel, idx) => (
                                  <Badge key={idx} variant="outline" className="text-sm font-normal bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-300">
                                    {grupoRel.grupoInteres.nombre}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Socios Comunitarios */}
                          {selectedProject.sociosComunitarios && selectedProject.sociosComunitarios.length > 0 && (
                            <div className="border-l-4 border-purple-500 pl-4 py-1">
                              <div className="flex items-center gap-2 mb-3">
                                <Handshake className="h-4 w-4 text-purple-600" />
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                  Socios Comunitarios
                                </h3>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {selectedProject.sociosComunitarios.map((socioRel, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-sm font-normal bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200">
                                    {socioRel.socioComunitario.nombre}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          </div>
                        </div>

                        {/* Sección 4: Encargados del Proyecto */}
                        <div className="mb-8">
                          <div className="flex items-center gap-3 mb-6">
                            <span className="text-xs font-semibold text-gray-400 tracking-wider pr-4">Encargados del Proyecto</span>
                            <div className="h-px bg-gray-200 flex-1"></div>
                          </div>
                          {/* Encargados del proyecto */}
                        {selectedProject.participantes_rel && selectedProject.participantes_rel.filter(p => p.rol === 'Encargado').length > 0 && (
                          <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {selectedProject.participantes_rel
                                .filter(p => p.rol === 'Encargado')
                                .map((participante) => (
                                  <div key={participante.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-transparent rounded-lg border border-gray-200 hover:border-gray-300 transition-all">
                                    {participante.user.image ? (
                                      <img
                                        src={participante.user.image}
                                        alt={participante.user.name || 'Usuario'}
                                        className="h-11 w-11 rounded-full ring-2 ring-gray-200"
                                      />
                                    ) : (
                                      <div className="h-11 w-11 rounded-full bg-gray-100 flex items-center justify-center ring-2 ring-gray-200">
                                        <Users className="h-5 w-5 text-gray-600" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-900 truncate">
                                        {participante.user.name || 'Sin nombre'}
                                      </p>
                                      <p className="text-xs text-gray-600 truncate">{participante.user.email}</p>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Columna derecha: Desarrollo Técnico */}
                <DesarrolloTecnicoCard desarrolloTecnico={selectedProject.desarrolloTecnico} />
              </div>
            )}

            {selectedTab === 'Objetivos' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                {/* Columna izquierda: Objetivos */}
                <ObjetivosCard objetivos={selectedProject.objetivos_rel || []} />

                {/* Columna derecha: Video */}
                <Card className="h-full shadow-md flex flex-col">
                  <CardContent className="p-0 flex-1 overflow-auto">
                    <div className="bg-gray-100 px-4 py-3 rounded-t-lg">
                      <div className="flex items-center space-x-2">
                        <Video className="h-5 w-5 text-gray-700" />
                        <h3 className="text-base font-bold text-gray-700 uppercase tracking-wide">
                          Video del Proyecto
                        </h3>
                      </div>
                    </div>
                    <div className="p-6">
                    <div className="flex items-center justify-end gap-2 mb-3">
                      <Input
                        value={tempVideoUrl}
                        onChange={(e) => setTempVideoUrl(e.target.value)}
                        placeholder="URL de YouTube"
                        className="w-64 h-8 text-xs"
                      />
                      <Button
                        onClick={handleSaveVideo}
                        size="sm"
                        className="h-8 px-3 bg-blue-600 hover:bg-blue-700"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Guardar
                      </Button>
                    </div>
                    {selectedProject && projectVideos[selectedProject.id] ? (
                      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                        <iframe
                          className="absolute top-0 left-0 w-full h-full rounded-lg"
                          src={`https://www.youtube.com/embed/${extractYouTubeVideoId(projectVideos[selectedProject.id])}`}
                          title="Video del Proyecto"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <div className="text-center">
                          <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-500">
                            Ingresa una URL de YouTube y haz clic en Guardar
                          </p>
                        </div>
                      </div>
                    )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedTab === 'Equipo' && (
              <Card className="h-full shadow-md flex flex-col">
                <CardContent className="p-6 flex-1 overflow-auto">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Equipo del Proyecto</h2>
                  
                  <div className="space-y-6">
                    {/* Encargados */}
                    {selectedProject.participantes_rel && selectedProject.participantes_rel.filter(p => p.rol === 'Encargado').length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                          <Users className="h-5 w-5 mr-2" />
                          Encargados
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {selectedProject.participantes_rel
                            .filter(p => p.rol === 'Encargado')
                            .map((participante) => (
                              <div key={participante.id} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                {participante.user.image ? (
                                  <img
                                    src={participante.user.image}
                                    alt={participante.user.name || 'Usuario'}
                                    className="h-12 w-12 rounded-full"
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-full bg-blue-200 flex items-center justify-center">
                                    <Users className="h-6 w-6 text-blue-600" />
            </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {participante.user.name || 'Sin nombre'}
                                  </p>
                                  <p className="text-xs text-gray-500">{participante.user.email}</p>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Coordinadores */}
                    {selectedProject.participantes_rel && selectedProject.participantes_rel.filter(p => p.rol === 'Coordinador').length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                          <Users className="h-5 w-5 mr-2" />
                          Coordinadores
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {selectedProject.participantes_rel
                            .filter(p => p.rol === 'Coordinador')
                            .map((participante) => (
                              <div key={participante.id} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                {participante.user.image ? (
                                  <img
                                    src={participante.user.image}
                                    alt={participante.user.name || 'Usuario'}
                                    className="h-12 w-12 rounded-full"
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-full bg-green-200 flex items-center justify-center">
                                    <Users className="h-6 w-6 text-green-600" />
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {participante.user.name || 'Sin nombre'}
                                  </p>
                                  <p className="text-xs text-gray-500">{participante.user.email}</p>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Participantes */}
                    {selectedProject.participantes_rel && selectedProject.participantes_rel.filter(p => p.rol === 'Participante').length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                          <Users className="h-5 w-5 mr-2" />
                          Participantes
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {selectedProject.participantes_rel
                            .filter(p => p.rol === 'Participante')
                            .map((participante) => (
                              <div key={participante.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                {participante.user.image ? (
                                  <img
                                    src={participante.user.image}
                                    alt={participante.user.name || 'Usuario'}
                                    className="h-10 w-10 rounded-full"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-gray-600" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {participante.user.name || 'Sin nombre'}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">{participante.user.email}</p>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Mensaje si no hay participantes */}
                    {(!selectedProject.participantes_rel || selectedProject.participantes_rel.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No hay miembros asignados a este proyecto</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedTab === 'Gantt' && (
              <Card className="h-full shadow-md flex flex-col">
                <CardContent className="p-6 flex-1 overflow-auto">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Diagrama de Gantt</h2>
                  <p className="text-gray-500">Contenido del diagrama de Gantt próximamente...</p>
                </CardContent>
              </Card>
            )}

            {selectedTab === 'Indicadores' && (
              <Card className="h-full shadow-md flex flex-col">
                <CardContent className="p-6 flex-1 overflow-auto">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Indicadores</h2>
                  <p className="text-gray-500">Contenido de indicadores próximamente...</p>
                </CardContent>
              </Card>
            )}

            {selectedTab === 'Presupuesto' && (
              <Card className="h-full shadow-md flex flex-col">
                <CardContent className="p-6 flex-1 overflow-auto">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Presupuesto</h2>
                  <p className="text-gray-500">Contenido de presupuesto próximamente...</p>
                </CardContent>
              </Card>
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

      {/* Botón flotante de cambiar proyecto */}
      {selectedProject && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsSheetOpen(true)}
                className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-xl bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:scale-110 z-50"
              >
                <ArrowLeftRight size={28} strokeWidth={2.5} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Cambiar proyecto</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </>
  );
}

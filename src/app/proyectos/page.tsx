'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FolderKanban, MapPin, GraduationCap, DollarSign, BarChart3, FileText, Plus, Trash2, Save, X, Edit } from 'lucide-react';
import { useState } from 'react';
import { useProyectos } from '@/hooks/useProyectos';

type Project = {
  id: string;
  proyecto: string;
  fondo: string;
  sede: string;
  escuela: string;
  avance_gantt: number;
  objetivos: number;
  presupuesto_usado: number;
  presupuesto_total: number;
  reuniones_hechas: number;
  reuniones_totales: number;
  participantes: number;
  created_at: string;
  updated_at: string;
};

export default function ProyectosPage() {
  const { proyectos: proyectosIniciales, loading, error, createProyecto, updateProyecto, deleteProyecto } = useProyectos();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    proyecto: '',
    fondo: '',
    sede: '',
    escuela: '',
    avance_gantt: 0,
    objetivos: 0,
    presupuesto_usado: 0,
    presupuesto_total: 0,
    reuniones_hechas: 0,
    reuniones_totales: 0,
    participantes: 0
  });

  const filteredProjects = proyectosIniciales.filter(project =>
    project.proyecto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.sede.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.escuela.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (proyectosIniciales.length > 0 && !selectedProject && !showAddForm && !showEditForm) {
    setSelectedProject(proyectosIniciales[0]);
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
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
            avance_gantt: 0,
            objetivos: 0,
            presupuesto_usado: 0,
            presupuesto_total: 0,
            reuniones_hechas: 0,
            reuniones_totales: 0,
            participantes: 0
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
    
    if (confirm(`¿Estás seguro de que quieres eliminar el proyecto "${selectedProject.proyecto}"?`)) {
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
      escuela: selectedProject.escuela,
      avance_gantt: selectedProject.avance_gantt,
      objetivos: selectedProject.objetivos,
      presupuesto_usado: selectedProject.presupuesto_usado,
      presupuesto_total: selectedProject.presupuesto_total,
      reuniones_hechas: selectedProject.reuniones_hechas,
      reuniones_totales: selectedProject.reuniones_totales,
      participantes: selectedProject.participantes
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
      avance_gantt: 0,
      objetivos: 0,
      presupuesto_usado: 0,
      presupuesto_total: 0,
      reuniones_hechas: 0,
      reuniones_totales: 0,
      participantes: 0
    });
  };

  const generateProjectSummary = (project: Project) => {
    const summaries = {
      "AntofaSuena 2025. Música-Industria-Territorio": "Este proyecto busca fortalecer la industria musical de Antofagasta mediante la creación de espacios de encuentro entre artistas locales, productores y la comunidad. Incluye la organización de festivales, talleres de producción musical y el desarrollo de una plataforma digital para promover el talento regional.",
      "Laboratorio de Innovación Gastronómico": "Iniciativa que combina la tradición culinaria local con técnicas modernas de gastronomía. El laboratorio servirá como espacio de experimentación para chefs emergentes, promoviendo el uso de ingredientes locales y sostenibles, además de generar nuevas propuestas gastronómicas que impulsen el turismo culinario.",
      "Aqua Terra: Estética Consciente": "Proyecto enfocado en desarrollar una línea de productos de estética y cuidado personal utilizando ingredientes naturales y sostenibles. Busca crear conciencia sobre el impacto ambiental de la industria cosmética y ofrecer alternativas más saludables para el consumidor y el planeta.",
      "Renacer en Azul": "Iniciativa artística que utiliza el color azul como elemento unificador para explorar temas de identidad, memoria y futuro. A través de diversas disciplinas artísticas, el proyecto busca crear un diálogo sobre la relación entre el ser humano y el océano, promoviendo la conservación marina.",
      "Upcycling Intercultural": "Proyecto que combina técnicas de reciclaje creativo con elementos culturales de diferentes comunidades. Busca crear productos únicos que representen la diversidad cultural de la región, promoviendo la sostenibilidad y el respeto por las tradiciones locales."
    };
    
    return summaries[project.proyecto as keyof typeof summaries] || 
      `El proyecto ${project.proyecto} forma parte del programa IMPULSA y se desarrolla en la sede de ${project.sede}. Con un presupuesto de $${project.presupuesto_total.toLocaleString("es-CL")} y ${project.participantes} participantes, busca generar impacto positivo en la comunidad a través de la ${project.escuela.toLowerCase()}.`;
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
            <p className="text-red-500 mb-4">Error al cargar los proyectos: {error}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-500 text-white rounded">
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Panel izquierdo - Lista de proyectos */}
      <div className="w-1/3 border-r border-gray-200 p-6">
        <div className="space-y-4">
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="buscador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-2 border-gray-900 rounded-lg"
            />
          </div>

          {/* Lista de proyectos */}
          <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            {filteredProjects.map((project, index) => (
              <Card
                key={index}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedProject?.proyecto === project.proyecto
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedProject(project)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <FolderKanban className="h-5 w-5 text-gray-600" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-gray-900 truncate">
                        {project.proyecto}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {project.sede} • {project.escuela}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho - Detalles del proyecto */}
      <div className="flex-1 p-6">
        {/* Botones de acción */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-3">
            <Button 
              onClick={handleAddProject}
              className="bg-red-600 hover:bg-red-700 text-white border-2 border-red-600 hover:border-red-700 px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Agregar proyecto</span>
            </Button>
            {selectedProject && !showAddForm && !showEditForm && (
              <>
                <Button 
                  onClick={handleEditProject}
                  variant="outline"
                  className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                >
                  <Edit className="h-4 w-4" />
                  <span>Editar proyecto</span>
                </Button>
                <Button 
                  onClick={handleDeleteProject}
                  variant="outline"
                  className="border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Borrar proyecto</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {(showAddForm || showEditForm) ? (
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
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Información Básica</h3>
                    
                    <div>
                      <Label htmlFor="proyecto" className="text-sm font-medium text-gray-700">Nombre del Proyecto *</Label>
                      <Input
                        id="proyecto"
                        value={formData.proyecto}
                        onChange={(e) => handleInputChange('proyecto', e.target.value)}
                        placeholder="Ej: Mi Proyecto Innovador"
                        className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="fondo" className="text-sm font-medium text-gray-700">Fondo *</Label>
                      <Select value={formData.fondo} onValueChange={(value) => handleInputChange('fondo', value)}>
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
                      <Label htmlFor="sede" className="text-sm font-medium text-gray-700">Sede *</Label>
                      <Select value={formData.sede} onValueChange={(value) => handleInputChange('sede', value)}>
                        <SelectTrigger className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500">
                          <SelectValue placeholder="Selecciona la sede" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Antofagasta">Antofagasta</SelectItem>
                          <SelectItem value="La Serena">La Serena</SelectItem>
                          <SelectItem value="Los Ángeles">Los Ángeles</SelectItem>
                          <SelectItem value="Barrio Universitario">Barrio Universitario</SelectItem>
                          <SelectItem value="Santiago">Santiago</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="escuela" className="text-sm font-medium text-gray-700">Escuela *</Label>
                      <Select value={formData.escuela} onValueChange={(value) => handleInputChange('escuela', value)}>
                        <SelectTrigger className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500">
                          <SelectValue placeholder="Selecciona la escuela" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Artes e Industrias Creativas">Artes e Industrias Creativas</SelectItem>
                          <SelectItem value="Gastronomía, Hotelería y Turismo">Gastronomía, Hotelería y Turismo</SelectItem>
                          <SelectItem value="Estética Integral">Estética Integral</SelectItem>
                          <SelectItem value="Tecnología">Tecnología</SelectItem>
                          <SelectItem value="Negocios">Negocios</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Presupuesto y métricas */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Presupuesto y Métricas</h3>
                    
                    <div>
                      <Label htmlFor="presupuesto_total" className="text-sm font-medium text-gray-700">Presupuesto Total *</Label>
                      <Input
                        id="presupuesto_total"
                        type="number"
                        value={formData.presupuesto_total}
                        onChange={(e) => handleInputChange('presupuesto_total', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                        required
                        min="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="presupuesto_usado" className="text-sm font-medium text-gray-700">Presupuesto Usado</Label>
                      <Input
                        id="presupuesto_usado"
                        type="number"
                        value={formData.presupuesto_usado}
                        onChange={(e) => handleInputChange('presupuesto_usado', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                        min="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="participantes" className="text-sm font-medium text-gray-700">Número de Participantes *</Label>
                      <Input
                        id="participantes"
                        type="number"
                        value={formData.participantes}
                        onChange={(e) => handleInputChange('participantes', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                        required
                        min="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="reuniones_totales" className="text-sm font-medium text-gray-700">Reuniones Totales</Label>
                      <Input
                        id="reuniones_totales"
                        type="number"
                        value={formData.reuniones_totales}
                        onChange={(e) => handleInputChange('reuniones_totales', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                        min="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="reuniones_hechas" className="text-sm font-medium text-gray-700">Reuniones Realizadas</Label>
                      <Input
                        id="reuniones_hechas"
                        type="number"
                        value={formData.reuniones_hechas}
                        onChange={(e) => handleInputChange('reuniones_hechas', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Avances */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Avances del Proyecto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="avance_gantt" className="text-sm font-medium text-gray-700">Avance Gantt (%)</Label>
                      <Input
                        id="avance_gantt"
                        type="number"
                        value={formData.avance_gantt}
                        onChange={(e) => handleInputChange('avance_gantt', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                        min="0"
                        max="100"
                      />
                    </div>

                    <div>
                      <Label htmlFor="objetivos" className="text-sm font-medium text-gray-700">Avance Objetivos (%)</Label>
                      <Input
                        id="objetivos"
                        type="number"
                        value={formData.objetivos}
                        onChange={(e) => handleInputChange('objetivos', parseInt(e.target.value) || 0)}
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
                        ? (showEditForm ? 'Actualizando...' : 'Guardando...') 
                        : (showEditForm ? 'Actualizar Proyecto' : 'Guardar Proyecto')
                      }
                    </span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : selectedProject ? (
          <div className="space-y-6">
            {/* Header del proyecto */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {selectedProject.proyecto}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-medium">{selectedProject.fondo}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedProject.sede}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <GraduationCap className="h-4 w-4" />
                      <span>{selectedProject.escuela}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Información presupuestaria y avances */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Presupuesto */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">PRESUPUESTO</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">PRESUPUESTO CONSUMIDO</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${selectedProject.presupuesto_usado.toLocaleString("es-CL")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">PRESUPUESTO TOTAL</p>
                      <p className="text-xl font-semibold text-gray-700">
                        ${selectedProject.presupuesto_total.toLocaleString("es-CL")}
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${(selectedProject.presupuesto_usado / selectedProject.presupuesto_total) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {Math.round((selectedProject.presupuesto_usado / selectedProject.presupuesto_total) * 100)}% utilizado
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Avances */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">AVANCES</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">AVANCE GANTT</span>
                        <span className="text-sm font-bold text-gray-900">{selectedProject.avance_gantt}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-green-500 h-3 rounded-full" 
                          style={{ width: `${selectedProject.avance_gantt}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">INDICADORES</span>
                        <span className="text-sm font-bold text-gray-900">{selectedProject.objetivos}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-blue-500 h-3 rounded-full" 
                          style={{ width: `${selectedProject.objetivos}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resumen del proyecto */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">RESUMEN DEL PROYECTO</h3>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 leading-relaxed">
                    {generateProjectSummary(selectedProject)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Selecciona un proyecto para ver sus detalles</p>
          </div>
        )}
      </div>
    </div>
  );
}
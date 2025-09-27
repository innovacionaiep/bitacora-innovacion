'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Circle, 
  BarChart3,
  FolderKanban,
  Clock,
  Target
} from 'lucide-react';
import { useState } from 'react';
import { useProyectos } from '@/hooks/useProyectos';
import { useGantt, type Activity, type Task } from '@/hooks/useGantt';

// Meses del año
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function GanttPage() {
  const { proyectos, loading: proyectosLoading, error: proyectosError } = useProyectos();
  
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  
  // Formulario de actividad
  const [activityForm, setActivityForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: ''
  });
  
  // Formulario de tarea
  const [taskForm, setTaskForm] = useState({
    name: '',
    startDate: '',
    endDate: ''
  });

  // Usar el hook de Gantt con Supabase
  const {
    activities,
    loading: ganttLoading,
    error: ganttError,
    createActivity,
    deleteActivity,
    createTask,
    deleteTask,
    toggleTaskCompletion,
    calculateProjectProgress,
    syncAllActivitiesProgress
  } = useGantt(selectedProject?.id || null);

  // Manejar cambios en el formulario de actividad
  const handleActivityInputChange = (field: string, value: string) => {
    setActivityForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Manejar cambios en el formulario de tarea
  const handleTaskInputChange = (field: string, value: string) => {
    setTaskForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Crear nueva actividad
  const handleCreateActivity = async () => {
    if (!selectedProject || !activityForm.name || !activityForm.startDate || !activityForm.endDate) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    const { error } = await createActivity({
      name: activityForm.name,
      description: activityForm.description,
      start_date: activityForm.startDate,
      end_date: activityForm.endDate
    });

    if (error) {
      alert('Error al crear la actividad: ' + error);
    } else {
      setActivityForm({ name: '', description: '', startDate: '', endDate: '' });
      setShowAddActivity(false);
      alert('Actividad creada exitosamente');
    }
  };

  // Crear nueva tarea
  const handleCreateTask = async () => {
    if (!selectedActivity || !taskForm.name || !taskForm.startDate || !taskForm.endDate) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    const { error } = await createTask(selectedActivity.id, {
      name: taskForm.name,
      start_date: taskForm.startDate,
      end_date: taskForm.endDate
    });

    if (error) {
      alert('Error al crear la tarea: ' + error);
    } else {
      setTaskForm({ name: '', startDate: '', endDate: '' });
      setShowAddTask(false);
      setSelectedActivity(null);
      alert('Tarea creada exitosamente');
    }
  };

  // Toggle completar tarea
  const handleToggleTaskCompletion = (taskId: string) => {
    toggleTaskCompletion(taskId);
  };

  // Eliminar actividad
  const handleDeleteActivity = async (activityId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta actividad y todas sus tareas?')) {
      const { error } = await deleteActivity(activityId);
      if (error) {
        alert('Error al eliminar la actividad: ' + error);
      } else {
        alert('Actividad eliminada exitosamente');
      }
    }
  };

  // Eliminar tarea
  const handleDeleteTask = async (taskId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
      const { error } = await deleteTask(taskId);
      if (error) {
        alert('Error al eliminar la tarea: ' + error);
      } else {
        alert('Tarea eliminada exitosamente');
      }
    }
  };

  // Guardar cambios en el Gantt
  const handleSaveGantt = async () => {
    if (!selectedProject) return;
    
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const result = await syncAllActivitiesProgress();
      
      if (result.success) {
        setSaveMessage('Cambios guardados exitosamente');
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage('Error al guardar: ' + result.error);
        setTimeout(() => setSaveMessage(null), 5000);
      }
    } catch (error) {
      setSaveMessage('Error al guardar los cambios');
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Manejar clic en agregar actividad
  const handleAddActivityClick = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPopupPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10
    });
    setShowAddActivity(true);
  };

  // Manejar clic en agregar tarea
  const handleAddTaskClick = (event: React.MouseEvent, activity: Activity) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPopupPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10
    });
    setSelectedActivity(activity);
    setShowAddTask(true);
  };

  // Obtener posición de una fecha en el calendario
  const getDatePosition = (date: string) => {
    const dateObj = new Date(date);
    const month = dateObj.getMonth();
    const day = dateObj.getDate();
    
    // Calcular la posición basada en el mes (0-11) y el día del mes
    const monthWidth = 100 / 12; // Cada mes ocupa 1/12 del ancho total
    const dayWidth = monthWidth / 31; // Cada día ocupa 1/31 del ancho del mes
    
    return {
      month: month,
      day: day,
      left: (month * monthWidth) + (day * dayWidth) // Posición más precisa
    };
  };

  // Obtener duración en días
  const getDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Obtener ancho de la barra basado en la duración
  const getBarWidth = (startDate: string, endDate: string) => {
    const duration = getDuration(startDate, endDate);
    const monthWidth = 100 / 12; // Cada mes ocupa 1/12 del ancho total
    const dayWidth = monthWidth / 31; // Cada día ocupa 1/31 del ancho del mes
    return duration * dayWidth;
  };

  if (proyectosLoading || ganttLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (proyectosError || ganttError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {proyectosError || ganttError}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-500 text-white rounded">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cronograma Gantt</h1>
          <p className="text-gray-600 mt-1">Gestiona las actividades y tareas de tus proyectos</p>
        </div>
        
        {selectedProject && (
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Progreso del Proyecto</p>
              <p className="text-2xl font-bold text-blue-600">{calculateProjectProgress()}%</p>
            </div>
            <div className="w-32 bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${calculateProjectProgress()}%` }}
              ></div>
            </div>
            <Button
              onClick={handleSaveGantt}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Guardar Cambios</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Mensaje de feedback */}
      {saveMessage && (
        <div className={`p-4 rounded-lg ${
          saveMessage.includes('exitosamente') 
            ? 'bg-green-100 border border-green-300 text-green-700' 
            : 'bg-red-100 border border-red-300 text-red-700'
        }`}>
          <div className="flex items-center space-x-2">
            {saveMessage.includes('exitosamente') ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-medium">{saveMessage}</span>
          </div>
        </div>
      )}

      {/* Selector de proyecto */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <FolderKanban className="h-6 w-6 text-gray-600" />
            <div className="flex-1">
              <Label htmlFor="project-select" className="text-sm font-medium text-gray-700">
                Seleccionar Proyecto
              </Label>
              <Select 
                value={selectedProject?.id || ''} 
                onValueChange={(value) => {
                  const project = proyectos.find(p => p.id === value);
                  setSelectedProject(project || null);
                }}
              >
                <SelectTrigger className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500">
                  <SelectValue placeholder="Selecciona un proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {proyectos.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.proyecto} - {project.sede}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedProject ? (
        <div className="space-y-6">
          {/* Título de actividades */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Actividades de {selectedProject.proyecto}
            </h2>
          </div>

          {/* Calendario Gantt */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="min-w-[1200px]">
                  {/* Header del calendario */}
                  <div className="flex border-b border-gray-200">
                    <div className="w-64 p-4 border-r border-gray-200 bg-gray-50">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900">Actividades</h3>
                        <Button
                          onClick={handleAddActivityClick}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Agregar
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 flex">
                      {MONTHS.map((month, index) => (
                        <div key={month} className="flex-1 p-2 text-center border-r border-gray-200 bg-gray-50">
                          <div className="text-sm font-medium text-gray-700">{month}</div>
                          <div className="text-xs text-gray-500">2025</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Filas de actividades */}
                  {activities.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No hay actividades creadas</p>
                      <p className="text-sm">Haz clic en "Agregar Actividad" para comenzar</p>
                    </div>
                  ) : (
                    activities.map((activity) => (
                      <div key={activity.id} className="flex border-b border-gray-200 hover:bg-gray-50">
                        {/* Nombre de la actividad */}
                        <div className="w-64 p-4 border-r border-gray-200 flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{activity.name}</h4>
                            <p className="text-sm text-gray-500">{activity.description}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {activity.tasks.length} tareas
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {activity.progress}% completo
                              </Badge>
                            </div>
                          </div>
                          <div className="flex space-x-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => handleAddTaskClick(e, activity)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteActivity(activity.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Barra de progreso de la actividad */}
                        <div className="flex-1 relative p-2">
                          <div className="relative h-8 bg-gray-100 rounded">
                            <div
                              className={`absolute top-0 h-full ${activity.color} rounded opacity-80`}
                              style={{
                                left: `${getDatePosition(activity.start_date).left}%`,
                                width: `${getBarWidth(activity.start_date, activity.end_date)}%`
                              }}
                            ></div>
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                              {activity.progress}%
                            </div>
                          </div>

                          {/* Tareas de la actividad */}
                          {activity.tasks.map((task) => (
                            <div key={task.id} className="mt-1 flex items-center space-x-2">
                              <Checkbox
                                checked={task.completed}
                                onCheckedChange={() => handleToggleTaskCompletion(task.id)}
                                className="h-4 w-4"
                              />
                              <span className={`text-xs ${task.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                                {task.name}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteTask(task.id)}
                                className="h-4 w-4 p-0 text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecciona un Proyecto</h3>
            <p className="text-gray-500">Elige un proyecto para ver y gestionar su cronograma Gantt</p>
          </CardContent>
        </Card>
      )}

      {/* Popup simple para agregar actividad */}
      {showAddActivity && (
        <div 
          className="fixed z-50"
          style={{
            left: `${popupPosition.x - 192}px`, // 192px = half of 384px (w-96)
            top: `${popupPosition.y}px`
          }}
        >
          <Card className="w-96 shadow-2xl border-2">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Nueva Actividad</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddActivity(false)}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Input
                    value={activityForm.name}
                    onChange={(e) => handleActivityInputChange('name', e.target.value)}
                    placeholder="Nombre de la actividad *"
                    className="w-full"
                    required
                  />
                </div>

                <div>
                  <Input
                    value={activityForm.description}
                    onChange={(e) => handleActivityInputChange('description', e.target.value)}
                    placeholder="Descripción (opcional)"
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={activityForm.startDate}
                    onChange={(e) => handleActivityInputChange('startDate', e.target.value)}
                    className="w-full"
                    required
                  />
                  <Input
                    type="date"
                    value={activityForm.endDate}
                    onChange={(e) => handleActivityInputChange('endDate', e.target.value)}
                    className="w-full"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddActivity(false)}
                    size="sm"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateActivity}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    Crear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Popup simple para agregar tarea */}
      {showAddTask && selectedActivity && (
        <div 
          className="fixed z-50"
          style={{
            left: `${popupPosition.x - 192}px`, // 192px = half of 384px (w-96)
            top: `${popupPosition.y}px`
          }}
        >
          <Card className="w-96 shadow-2xl border-2">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Nueva Tarea
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddTask(false);
                    setSelectedActivity(null);
                  }}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-3">
                <div className="text-sm text-gray-600 mb-2">
                  Para: <span className="font-medium">{selectedActivity.name}</span>
                </div>

                <div>
                  <Input
                    value={taskForm.name}
                    onChange={(e) => handleTaskInputChange('name', e.target.value)}
                    placeholder="Nombre de la tarea *"
                    className="w-full"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={taskForm.startDate}
                    onChange={(e) => handleTaskInputChange('startDate', e.target.value)}
                    className="w-full"
                    required
                  />
                  <Input
                    type="date"
                    value={taskForm.endDate}
                    onChange={(e) => handleTaskInputChange('endDate', e.target.value)}
                    className="w-full"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddTask(false);
                      setSelectedActivity(null);
                    }}
                    size="sm"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateTask}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    Crear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

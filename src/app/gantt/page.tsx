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
    calculateProjectProgress
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
  const handleToggleTaskCompletion = async (taskId: string) => {
    const result = await toggleTaskCompletion(taskId);
    if (result?.error) {
      alert('Error al actualizar la tarea: ' + result.error);
    }
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

  // Obtener posición de una fecha en el calendario
  const getDatePosition = (date: string) => {
    const dateObj = new Date(date);
    const month = dateObj.getMonth();
    const day = dateObj.getDate();
    return {
      month: month,
      day: day,
      left: (month * 100) + ((day / 31) * 100) // Aproximación visual
    };
  };

  // Obtener duración en días
  const getDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
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
          </div>
        )}
      </div>

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
          {/* Controles de actividades */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Actividades de {selectedProject.proyecto}
            </h2>
            <Button
              onClick={() => setShowAddActivity(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Agregar Actividad</span>
            </Button>
          </div>

          {/* Calendario Gantt */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="min-w-[1200px]">
                  {/* Header del calendario */}
                  <div className="flex border-b border-gray-200">
                    <div className="w-64 p-4 border-r border-gray-200 bg-gray-50">
                      <h3 className="font-semibold text-gray-900">Actividades</h3>
                    </div>
                    <div className="flex-1 flex">
                      {MONTHS.map((month, index) => (
                        <div key={month} className="flex-1 p-2 text-center border-r border-gray-200 bg-gray-50">
                          <div className="text-sm font-medium text-gray-700">{month}</div>
                          <div className="text-xs text-gray-500">2024</div>
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
                              onClick={() => {
                                setSelectedActivity(activity);
                                setShowAddTask(true);
                              }}
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
                              className={`absolute top-0 left-0 h-full ${activity.color} rounded opacity-80`}
                              style={{
                                left: `${getDatePosition(activity.start_date).left / 12}%`,
                                width: `${(getDuration(activity.start_date, activity.end_date) / 31) * 100}%`
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

      {/* Modal para agregar actividad */}
      {showAddActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Agregar Actividad</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddActivity(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="activity-name" className="text-sm font-medium text-gray-700">
                    Nombre de la Actividad *
                  </Label>
                  <Input
                    id="activity-name"
                    value={activityForm.name}
                    onChange={(e) => handleActivityInputChange('name', e.target.value)}
                    placeholder="Ej: Planificación del proyecto"
                    className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="activity-description" className="text-sm font-medium text-gray-700">
                    Descripción
                  </Label>
                  <Input
                    id="activity-description"
                    value={activityForm.description}
                    onChange={(e) => handleActivityInputChange('description', e.target.value)}
                    placeholder="Descripción de la actividad"
                    className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="activity-start" className="text-sm font-medium text-gray-700">
                      Fecha de Inicio *
                    </Label>
                    <Input
                      id="activity-start"
                      type="date"
                      value={activityForm.startDate}
                      onChange={(e) => handleActivityInputChange('startDate', e.target.value)}
                      className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="activity-end" className="text-sm font-medium text-gray-700">
                      Fecha de Fin *
                    </Label>
                    <Input
                      id="activity-end"
                      type="date"
                      value={activityForm.endDate}
                      onChange={(e) => handleActivityInputChange('endDate', e.target.value)}
                      className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddActivity(false)}
                    className="px-4 py-2"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateActivity}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                  >
                    Crear Actividad
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal para agregar tarea */}
      {showAddTask && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Agregar Tarea a "{selectedActivity.name}"
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddTask(false);
                    setSelectedActivity(null);
                  }}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="task-name" className="text-sm font-medium text-gray-700">
                    Nombre de la Tarea *
                  </Label>
                  <Input
                    id="task-name"
                    value={taskForm.name}
                    onChange={(e) => handleTaskInputChange('name', e.target.value)}
                    placeholder="Ej: Definir objetivos del proyecto"
                    className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="task-start" className="text-sm font-medium text-gray-700">
                      Fecha de Inicio *
                    </Label>
                    <Input
                      id="task-start"
                      type="date"
                      value={taskForm.startDate}
                      onChange={(e) => handleTaskInputChange('startDate', e.target.value)}
                      className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="task-end" className="text-sm font-medium text-gray-700">
                      Fecha de Fin *
                    </Label>
                    <Input
                      id="task-end"
                      type="date"
                      value={taskForm.endDate}
                      onChange={(e) => handleTaskInputChange('endDate', e.target.value)}
                      className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddTask(false);
                      setSelectedActivity(null);
                    }}
                    className="px-4 py-2"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateTask}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                  >
                    Crear Tarea
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

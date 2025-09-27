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
  Target,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  const [showDeleteActivities, setShowDeleteActivities] = useState(false);
  const [showEditActivities, setShowEditActivities] = useState(false);
  const [showEditActivity, setShowEditActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  
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

  // Formulario de edición de actividad
  const [editActivityForm, setEditActivityForm] = useState({
    name: '',
    description: ''
  });

  // Usar el hook de Gantt con Supabase
  const {
    activities,
    loading: ganttLoading,
    error: ganttError,
    createActivity,
    updateActivity,
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

  // Manejar clic en editar actividad
  const handleEditActivityClick = (event: React.MouseEvent, activity: Activity) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPopupPosition({
      x: rect.right + 10, // Posicionar a la derecha del botón
      y: rect.top - 50    // Centrar verticalmente
    });
    setEditingActivity(activity);
    setEditActivityForm({
      name: activity.name,
      description: activity.description
    });
    setShowEditActivity(true);
  };

  // Manejar cambios en el formulario de edición
  const handleEditActivityInputChange = (field: string, value: string) => {
    setEditActivityForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Actualizar actividad
  const handleUpdateActivity = async () => {
    if (!editingActivity || !editActivityForm.name) {
      alert('Por favor completa el nombre de la actividad');
      return;
    }

    const { error } = await updateActivity(editingActivity.id, {
      name: editActivityForm.name,
      description: editActivityForm.description
    });

    if (error) {
      alert('Error al actualizar la actividad: ' + error);
    } else {
      setEditActivityForm({ name: '', description: '' });
      setShowEditActivity(false);
      setEditingActivity(null);
      alert('Actividad actualizada exitosamente');
    }
  };

  // Toggle descripción de actividad
  const toggleDescription = (activityId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  // Obtener posición de una fecha en el calendario para tareas
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

  // Obtener ancho de la barra basado en la duración para tareas
  const getBarWidth = (startDate: string, endDate: string) => {
    const duration = getDuration(startDate, endDate);
    const monthWidth = 100 / 12; // Cada mes ocupa 1/12 del ancho total
    const dayWidth = monthWidth / 31; // Cada día ocupa 1/31 del ancho del mes
    return duration * dayWidth;
  };

  // Obtener posición del día de hoy
  const getTodayPosition = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11
    const currentDay = today.getDate();
    
    // Si estamos en 2024, mostrar en enero de 2025
    // Si estamos en 2025, mostrar en el mes correspondiente
    let targetMonth = currentMonth;
    if (currentYear === 2024) {
      targetMonth = 0; // Enero 2025
    }
    
    // Calcular la posición basada en el mes (0-11) y el día del mes
    const monthWidth = 100 / 12; // Cada mes ocupa 1/12 del ancho total
    const dayWidth = monthWidth / 31; // Cada día ocupa 1/31 del ancho del mes
    
    const leftPosition = (targetMonth * monthWidth) + (currentDay * dayWidth);
    
    console.log('Today position calculation:', {
      currentYear,
      currentMonth,
      currentDay,
      targetMonth,
      leftPosition: `${leftPosition}%`
    });
    
    return {
      month: targetMonth,
      day: currentDay,
      left: leftPosition
    };
  };

  // Obtener posición en porcentaje para la línea roja - Enfoque directo por columna
  const getTodayPositionPercent = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11 (enero=0, septiembre=8)
    const currentDay = today.getDate();
    
    // Si estamos en 2024, mostrar en enero de 2025
    let targetMonth = currentMonth;
    if (currentYear === 2024) {
      targetMonth = 0; // Enero 2025
    }
    
    // PASO 1: Calcular la posición de la columna del mes
    const monthWidth = 100 / 12; // 8.33% por mes
    const monthStartPosition = targetMonth * monthWidth; // Posición de inicio del mes
    
    // PASO 2: Obtener cuántos días tiene el mes actual
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // PASO 3: Calcular la posición del día dentro del mes
    const dayWidth = monthWidth / daysInMonth; // Ancho por día basado en días reales del mes
    const dayPosition = (currentDay - 1) * dayWidth; // Día 1 = 0%, Día 27 = 86.67%
    
    // PASO 4: Posición final
    const leftPercent = monthStartPosition + dayPosition;
    
    console.log('Cálculo directo por columna:', {
      año: currentYear,
      mes: currentMonth,
      día: currentDay,
      mesObjetivo: targetMonth,
      díasEnMes: daysInMonth,
      posiciónMes: `${monthStartPosition.toFixed(2)}%`,
      anchoDía: `${dayWidth.toFixed(2)}%`,
      posiciónDía: `${dayPosition.toFixed(2)}%`,
      posiciónFinal: `${leftPercent.toFixed(2)}%`,
      columna: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][targetMonth]
    });
    
    return leftPercent;
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
    <TooltipProvider>
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
              <div className="overflow-x-auto relative">
                <div className="min-w-[1200px]">
                  
                  {/* Línea roja continua del día de hoy - atraviesa toda la tabla */}
                  <div
                    className="absolute top-0 w-0.5 bg-red-500 z-50 pointer-events-none"
                    style={{
                      left: `calc(256px + ${getTodayPositionPercent()}% * (100% - 256px) / 100%)`,
                      height: '100%'
                    }}
                  ></div>
                  
                  {/* Header del calendario */}
                  <div className="flex border-b border-gray-200">
                    <div className="w-64 p-4 border-r border-gray-200 bg-gray-50">
                      <div className="flex justify-center items-center">
                        <h3 className="font-semibold text-gray-900">Actividades</h3>
                      </div>
                    </div>
                    <div className="flex-1 flex relative">
                      {MONTHS.map((month, index) => (
                        <div key={month} className="flex-1 p-2 text-center border-r border-gray-200 bg-gray-50 flex items-center justify-center">
                          <div className="text-sm font-medium text-gray-700">{month}</div>
                        </div>
                      ))}
                      
                      {/* Indicador de "Hoy" */}
                      <div
                        className="absolute top-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full z-50 font-medium shadow-lg pointer-events-none"
                        style={{
                          left: `${getTodayPositionPercent()}%`,
                          transform: 'translateX(-50%)'
                        }}
                      >
                        Hoy
                      </div>
                    </div>
                  </div>
                  

                  {/* Filas de actividades y tareas */}
                  {activities.length === 0 ? (
                    <div className="flex">
                      <div className="w-64 p-4 border-r border-gray-200 bg-gray-50 flex justify-center">
                        <div className="relative group">
                          <Button
                            onClick={handleAddActivityClick}
                            variant="outline"
                            className="border-2 border-blue-500 text-blue-500 hover:bg-blue-100 hover:border-blue-600 hover:text-blue-600 rounded-full w-10 h-10 p-0 shadow-2xl hover:shadow-2xl transition-all duration-300"
                          >
                            <Plus className="h-6 w-6" />
                          </Button>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                            AGREGAR ACTIVIDAD
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 p-4 bg-gray-50"></div>
                    </div>
                  ) : (
                    <>
                      {activities.map((activity) => (
                        <div key={activity.id} className="border-b border-gray-200">
                          {/* Fila de la actividad con sus tareas en la misma línea */}
                          <div className="flex hover:bg-gray-50">
                            <div className="w-64 p-4 border-r border-gray-200 flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => toggleDescription(activity.id)}
                                    className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                  >
                                    {expandedDescriptions.has(activity.id) ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <h4 className="font-medium text-gray-900">{activity.name}</h4>
                                </div>
                                {expandedDescriptions.has(activity.id) && activity.description && (
                                  <p className="text-sm text-gray-500 mt-1 ml-6">{activity.description}</p>
                                )}
                              </div>
                              <div className="flex space-x-1 ml-2">
                                {showDeleteActivities && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteActivity(activity.id)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                                {showEditActivities && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => handleEditActivityClick(e, activity)}
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            {/* Área de Gantt con barras de tareas superpuestas */}
                            <div className="flex-1 relative p-2">
                              <div className="relative h-16 bg-gray-50 rounded">
                                {/* Botón para agregar tarea */}
                                <div className="absolute top-2 right-2 z-20">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => handleAddTaskClick(e, activity)}
                                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-full"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                                
                                {/* Barras de Gantt de las tareas superpuestas en la misma línea */}
                                {activity.tasks.map((task, index) => (
                                  <div key={task.id} className="absolute top-0 w-full">
                                    <div className="relative h-8 bg-gray-100 rounded" style={{ top: `${index * 8}px` }}>
                                      <div
                                        className={`absolute top-0 h-full ${task.completed ? 'bg-green-500' : 'bg-blue-500'} rounded shadow-sm border border-white/20`}
                                        style={{
                                          left: `${getDatePosition(task.start_date).left}%`,
                                          width: `${getBarWidth(task.start_date, task.end_date)}%`
                                        }}
                                      >
                                        {/* Porcentaje al final de la barra */}
                                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-medium text-white">
                                          {task.completed ? '✓' : '0%'}
                                        </div>
                                      </div>
                                      
                                      {/* Nombre de la tarea al inicio de la barra, a la izquierda exterior */}
                                      <div 
                                        className="absolute top-1/2 text-xs font-medium text-gray-700 z-10 bg-white px-2 py-1 rounded shadow-sm border"
                                        style={{
                                          left: `${getDatePosition(task.start_date).left - 2}%`,
                                          transform: 'translateY(-50%) translateX(-100%)'
                                        }}
                                      >
                                        {task.name}
                                      </div>
                                      
                                      {/* Controles al final de la barra */}
                                      <div 
                                        className="absolute top-1/2 flex items-center space-x-2 bg-white/90 rounded px-2 py-1 shadow-sm border"
                                        style={{
                                          left: `${getDatePosition(task.start_date).left + getBarWidth(task.start_date, task.end_date) + 1}%`,
                                          transform: 'translateY(-50%)'
                                        }}
                                      >
                                        <Checkbox
                                          checked={task.completed}
                                          onCheckedChange={() => handleToggleTaskCompletion(task.id)}
                                          className="h-4 w-4"
                                        />
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleDeleteTask(task.id)}
                                          className="h-4 w-4 p-0 text-red-500 hover:text-red-600"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Botones para agregar y eliminar actividades */}
                      <div className="flex">
                        <div className="w-64 p-4 border-r border-gray-200 bg-gray-50">
                          <div className="flex justify-center space-x-2">
                            {/* Botón agregar actividad */}
                            <div className="relative group">
                              <Button
                                onClick={handleAddActivityClick}
                                variant="outline"
                                className="border-2 border-blue-500 text-blue-500 hover:bg-blue-100 hover:border-blue-600 hover:text-blue-600 rounded-full w-10 h-10 p-0 shadow-2xl hover:shadow-2xl transition-all duration-300"
                              >
                                <Plus className="h-6 w-6" />
                              </Button>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                AGREGAR ACTIVIDAD
                              </div>
                            </div>
                            
                            {/* Botón eliminar actividades */}
                            <div className="relative group">
                              <Button
                                onClick={() => setShowDeleteActivities(!showDeleteActivities)}
                                variant="outline"
                                className={`border-2 rounded-full w-10 h-10 p-0 shadow-2xl transition-all duration-300 ${
                                  showDeleteActivities 
                                    ? 'border-red-500 text-red-500 hover:bg-red-100 hover:border-red-600 hover:text-red-500 hover:font-bold hover:shadow-3xl' 
                                    : 'border-gray-500 text-gray-500 hover:bg-gray-100 hover:border-gray-600 hover:text-gray-500 hover:font-bold hover:shadow-3xl'
                                }`}
                              >
                                <Trash2 className="h-6 w-6" />
                              </Button>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                {showDeleteActivities ? 'CANCELAR ELIMINAR' : 'ELIMINAR ACTIVIDADES'}
                              </div>
                            </div>
                            
                            {/* Botón editar actividades */}
                            <div className="relative group">
                              <Button
                                onClick={() => setShowEditActivities(!showEditActivities)}
                                variant="outline"
                                className={`border-2 rounded-full w-10 h-10 p-0 shadow-2xl transition-all duration-300 ${
                                  showEditActivities 
                                    ? 'border-blue-500 text-blue-500 hover:bg-blue-100 hover:border-blue-600 hover:text-blue-500 hover:font-bold hover:shadow-3xl' 
                                    : 'border-gray-500 text-gray-500 hover:bg-gray-100 hover:border-gray-600 hover:text-gray-500 hover:font-bold hover:shadow-3xl'
                                }`}
                              >
                                <Edit className="h-6 w-6" />
                              </Button>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                {showEditActivities ? 'CANCELAR EDITAR' : 'EDITAR ACTIVIDADES'}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 p-4 bg-gray-50"></div>
                      </div>
                    </>
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

      {/* Popup simple para editar actividad */}
      {showEditActivity && editingActivity && (
        <div 
          className="fixed z-50"
          style={{
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`
          }}
        >
          <Card className="w-96 shadow-2xl border-2">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Editar Actividad
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEditActivity(false);
                    setEditingActivity(null);
                  }}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Input
                    value={editActivityForm.name}
                    onChange={(e) => handleEditActivityInputChange('name', e.target.value)}
                    placeholder="Nombre de la actividad *"
                    className="w-full"
                    required
                  />
                </div>

                <div>
                  <textarea
                    value={editActivityForm.description}
                    onChange={(e) => handleEditActivityInputChange('description', e.target.value)}
                    placeholder="Descripción (opcional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:border-gray-400 resize-none text-sm"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEditActivity(false);
                      setEditingActivity(null);
                    }}
                    size="sm"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleUpdateActivity}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    Actualizar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </TooltipProvider>
  );
}

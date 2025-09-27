'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { 
  Calendar as CalendarIcon, 
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
  ChevronRight,
  Activity as ActivityIcon,
  CheckSquare,
  TrendingUp,
  Save
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';
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
  const [showEditActivity, setShowEditActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showCreateActivity, setShowCreateActivity] = useState(false);
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

  // Formulario de creación de actividad (sin fechas)
  const [createActivityForm, setCreateActivityForm] = useState({
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

  // Calcular estadísticas de actividades y tareas completadas
  const getProjectStats = () => {
    if (!selectedProject || !activities.length) {
      return { completedActivities: 0, totalActivities: 0, completedTasks: 0, totalTasks: 0 };
    }

    const totalActivities = activities.length;
    const completedActivities = activities.filter(activity => 
      activity.tasks.length > 0 && activity.tasks.every(task => task.completed)
    ).length;

    const allTasks = activities.flatMap(activity => activity.tasks);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(task => task.completed).length;

    return {
      completedActivities,
      totalActivities,
      completedTasks,
      totalTasks
    };
  };

  const stats = getProjectStats();

  // Función para cerrar todos los popups
  const closeAllPopups = () => {
    setShowAddActivity(false);
    setShowAddTask(false);
    setShowEditActivity(false);
    setShowCreateActivity(false);
    setSelectedActivity(null);
    setEditingActivity(null);
    setExpandedDescriptions(new Set());
    
    // Resetear formularios
    setActivityForm({ name: '', description: '', startDate: '', endDate: '' });
    setTaskForm({ name: '', startDate: '', endDate: '' });
    setEditActivityForm({ name: '', description: '' });
    setCreateActivityForm({ name: '', description: '' });
  };

  // Función para cerrar solo los popups de formularios (sin afectar descripciones expandidas ni modos)
  const closeFormPopups = () => {
    setShowAddActivity(false);
    setShowAddTask(false);
    setShowEditActivity(false);
    setShowCreateActivity(false);
    setSelectedActivity(null);
    setEditingActivity(null);
    
    // Resetear formularios
    setActivityForm({ name: '', description: '', startDate: '', endDate: '' });
    setTaskForm({ name: '', startDate: '', endDate: '' });
    setEditActivityForm({ name: '', description: '' });
    setCreateActivityForm({ name: '', description: '' });
  };


  // Cerrar todos los popups cuando cambie el proyecto seleccionado
  useEffect(() => {
    closeAllPopups();
  }, [selectedProject]);

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
    if (!selectedProject || !createActivityForm.name) {
      alert('Por favor completa el nombre de la actividad');
      return;
    }

    const { error } = await createActivity({
      name: createActivityForm.name,
      description: createActivityForm.description,
      start_date: null as any,
      end_date: null as any
    });

    if (error) {
      alert('Error al crear la actividad: ' + error);
    } else {
      setCreateActivityForm({ name: '', description: '' });
      setShowCreateActivity(false);
      alert('Actividad creada exitosamente');
    }
  };

  // Función para convertir fecha del formato chileno (DD/MM/YYYY o DD-MM-YYYY) a ISO (YYYY-MM-DD)
  const convertDateToISO = (dateString: string): string => {
    console.log('Convirtiendo fecha:', dateString);
    
    if (!dateString) {
      console.log('Fecha vacía, devolviendo cadena vacía');
      return '';
    }
    
    // Verificar si ya está en formato ISO (YYYY-MM-DD)
    const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (isoPattern.test(dateString)) {
      console.log('Ya está en formato ISO:', dateString);
      return dateString;
    }
    
    // Convertir desde formato DD/MM/YYYY a YYYY-MM-DD
    const slashParts = dateString.split('/');
    if (slashParts.length === 3) {
      const [day, month, year] = slashParts;
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      console.log('Fecha convertida desde DD/MM/YYYY a ISO:', isoDate);
      return isoDate;
    }
    
    // Convertir desde formato DD-MM-YYYY a YYYY-MM-DD
    const dashParts = dateString.split('-');
    if (dashParts.length === 3) {
      const [day, month, year] = dashParts;
      // Verificar si es formato DD-MM-YYYY (día y mes de 2 dígitos, año de 4)
      if (day.length <= 2 && month.length <= 2 && year.length === 4) {
        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        console.log('Fecha convertida desde DD-MM-YYYY a ISO:', isoDate);
        return isoDate;
      }
    }
    
    // Si no se puede convertir, intentar parsear como fecha y convertir
    console.log('Intentando parsear como fecha nativa:', dateString);
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const isoDate = date.toISOString().split('T')[0];
      console.log('Fecha parseada y convertida a ISO:', isoDate);
      return isoDate;
    }
    
    console.error('No se pudo convertir la fecha:', dateString);
    return dateString; // Devolver tal como está si no se puede convertir
  };

  // Crear nueva tarea
  const handleCreateTask = async () => {
    if (!selectedActivity || !taskForm.name || !taskForm.startDate || !taskForm.endDate) {
      alert('Por favor completa todos los campos obligatorios y selecciona una actividad');
      return;
    }

    console.log('Datos de la tarea antes de convertir:', {
      name: taskForm.name,
      startDate: taskForm.startDate,
      endDate: taskForm.endDate
    });

    const convertedStartDate = convertDateToISO(taskForm.startDate);
    const convertedEndDate = convertDateToISO(taskForm.endDate);

    console.log('Datos de la tarea después de convertir:', {
      name: taskForm.name,
      startDate: convertedStartDate,
      endDate: convertedEndDate
    });

    const { error } = await createTask(selectedActivity.id, {
      name: taskForm.name,
      description: '', // No se usa en la base de datos
      start_date: convertedStartDate,
      end_date: convertedEndDate
    });

    if (error) {
      console.error('Error al crear la tarea:', error);
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
    // Cerrar solo los popups de formularios antes de abrir el nuevo
    closeFormPopups();
    
    const rect = event.currentTarget.getBoundingClientRect();
    const popupWidth = 500; // Ancho del popup
    const popupHeight = 300; // Altura estimada del popup
    
    // Calcular posición horizontal: a la derecha del botón
    let x = rect.right + 10;
    
    // Si el popup se saldría por la derecha, posicionarlo a la izquierda del botón
    if (x + popupWidth > window.innerWidth) {
      x = rect.left - popupWidth - 10;
    }
    
    // Calcular posición vertical: centrar respecto al botón
    let y = rect.top + (rect.height / 2) - (popupHeight / 2);
    
    // Asegurar que el popup no se salga por arriba o abajo
    if (y < 10) {
      y = 10; // Margen mínimo desde arriba
    } else if (y + popupHeight > window.innerHeight - 10) {
      y = window.innerHeight - popupHeight - 10; // Margen mínimo desde abajo
    }
    
    setPopupPosition({ x, y });
    setShowCreateActivity(true);
  };

  // Manejar clic en agregar tarea
  const handleAddTaskClick = (event: React.MouseEvent) => {
    // Cerrar solo los popups de formularios antes de abrir el nuevo (pero mantener selectedActivity)
    setShowAddActivity(false);
    setShowAddTask(false);
    setShowEditActivity(false);
    setShowCreateActivity(false);
    setEditingActivity(null);
    
    // Resetear formularios
    setActivityForm({ name: '', description: '', startDate: '', endDate: '' });
    setTaskForm({ name: '', startDate: '', endDate: '' });
    setEditActivityForm({ name: '', description: '' });
    setCreateActivityForm({ name: '', description: '' });
    
    const rect = event.currentTarget.getBoundingClientRect();
    setPopupPosition({
      x: rect.right + 10, // Posicionar a la derecha del botón
      y: rect.top - 50    // Centrar verticalmente
    });
    setShowAddTask(true);
  };

  // Manejar clic en editar actividad
  const handleEditActivityClick = (event: React.MouseEvent, activity: Activity) => {
    // Cerrar solo los popups de formularios antes de abrir el nuevo
    closeFormPopups();
    
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

  // Manejar cambios en el formulario de creación de actividad
  const handleCreateActivityInputChange = (field: string, value: string) => {
    setCreateActivityForm(prev => ({
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
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const day = dateObj.getDate();
    
    // Solo mostrar fechas del año 2025 en el calendario
    if (year !== 2025) {
      // Si la fecha está fuera de 2025, posicionarla en los extremos
      if (year < 2025) {
        return { month: 0, day: 1, left: 0 }; // Enero 1
      } else {
        return { month: 11, day: 31, left: 100 }; // Diciembre 31
      }
    }
    
    // Calcular la posición basada en el mes (0-11) y el día del mes
    const monthWidth = 100 / 12; // Cada mes ocupa 1/12 del ancho total
    
    // Obtener el número real de días en el mes para un cálculo más preciso
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayWidth = monthWidth / daysInMonth; // Cada día ocupa 1/días_del_mes del ancho del mes
    
    // Calcular la posición del día dentro del mes (día 1 = 0%, último día = 100% del mes)
    const dayPosition = (day - 1) * dayWidth;
    
    // Calcular la posición total
    const leftPosition = (month * monthWidth) + dayPosition;
    
    // Limitar la posición al rango visible (0% a 100%)
    const clampedLeft = Math.max(0, Math.min(100, leftPosition));
    
    return {
      month: month,
      day: day,
      left: clampedLeft
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
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Obtener las posiciones de inicio y fin
    const startPos = getDatePosition(startDate);
    const endPos = getDatePosition(endDate);
    
    // Calcular el ancho basado en la diferencia de posiciones
    let width = endPos.left - startPos.left;
    
    // Si la tarea abarca todo el año (desde enero hasta diciembre de 2025)
    if (start.getFullYear() === 2025 && end.getFullYear() === 2025 && 
        start.getMonth() === 0 && start.getDate() === 1 && 
        end.getMonth() === 11 && end.getDate() === 31) {
      return 100; // Ocupar todo el ancho del calendario
    }
    
    // Si la tarea comienza antes de 2025 y termina en 2025
    if (start.getFullYear() < 2025 && end.getFullYear() === 2025) {
      return endPos.left; // Desde el inicio del calendario hasta la fecha de fin
    }
    
    // Si la tarea comienza en 2025 y termina después de 2025
    if (start.getFullYear() === 2025 && end.getFullYear() > 2025) {
      return 100 - startPos.left; // Desde la fecha de inicio hasta el final del calendario
    }
    
    // Si la tarea está completamente fuera del rango de 2025
    if (start.getFullYear() !== 2025 && end.getFullYear() !== 2025) {
      return 0; // No mostrar
    }
    
    // Si la tarea se extiende más allá del rango visible, ajustar el ancho
    if (startPos.left >= 100) {
      // La tarea comienza después de diciembre, no mostrar
      return 0;
    } else if (endPos.left > 100) {
      // La tarea se extiende más allá de diciembre, limitar al final del calendario
      width = 100 - startPos.left;
    }
    
    // Asegurar que el ancho mínimo sea al menos 1% para tareas de un día
    return Math.max(1, width);
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

  // Solo mostrar pantalla de carga completa para la carga inicial de proyectos
  if (proyectosLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando proyectos...</p>
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
      <div className="pt-0 px-4 pb-4 space-y-4">
      {/* Header */}
      <div className="space-y-4">
        {/* Selector de proyecto */}
        <div className="flex items-center space-x-4">
          <FolderKanban className="h-6 w-6 text-gray-600" />
          <div>
            <Label htmlFor="project-select" className="text-sm font-medium text-gray-700">
              Seleccionar Proyecto
            </Label>
            <div className="relative">
              <Select 
                value={selectedProject?.id || ''} 
                onValueChange={(value) => {
                  const project = proyectos.find(p => p.id === value);
                  setSelectedProject(project || null);
                }}
                disabled={ganttLoading}
              >
                <SelectTrigger className="mt-1 border-2 border-gray-300 rounded-lg focus:border-blue-500 w-80">
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
              {ganttLoading && selectedProject && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cards de resumen - Siempre visibles */}
        <div className="relative">
          {/* Botón Guardar Cambios - Posicionado absolutamente a la derecha */}
          {selectedProject && (
            <div className="absolute top-0 right-0 z-10">
              <Button
                onClick={handleSaveGantt}
                disabled={isSaving}
                className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 shadow-sm hover:shadow-md"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </Button>
            </div>
          )}
          
          {/* Contenedor de las tarjetas centrado respecto a toda la tabla Gantt */}
          <div className="flex justify-center">
            <div className="flex items-center space-x-4">
              {/* Card Actividades completadas */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 min-w-[280px] h-20 relative">
                <div className="flex items-center justify-between h-full">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-gray-100 rounded-md">
                      <ActivityIcon className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Actividades</p>
                      <p className="text-xs text-gray-500">completas</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <div className="flex items-baseline space-x-1">
                      <span className="text-xl font-bold text-gray-900">{stats.completedActivities}</span>
                      <span className="text-sm text-gray-400">/</span>
                      <span className="text-sm font-medium text-gray-600">{stats.totalActivities}</span>
                    </div>
                    <div className="w-20 bg-gray-100 rounded-full h-1">
                      <div 
                        className="bg-gray-600 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${stats.totalActivities > 0 ? (stats.completedActivities / stats.totalActivities) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Tareas completadas */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 min-w-[280px] h-20 relative">
                <div className="flex items-center justify-between h-full">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-gray-100 rounded-md">
                      <CheckSquare className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Tareas</p>
                      <p className="text-xs text-gray-500">completas</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <div className="flex items-baseline space-x-1">
                      <span className="text-xl font-bold text-gray-900">{stats.completedTasks}</span>
                      <span className="text-sm text-gray-400">/</span>
                      <span className="text-sm font-medium text-gray-600">{stats.totalTasks}</span>
                    </div>
                    <div className="w-20 bg-gray-100 rounded-full h-1">
                      <div 
                        className="bg-gray-600 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección de Progreso */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 min-w-[300px] h-20 relative">
                <div className="flex items-center justify-between h-full">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-gray-100 rounded-md">
                      <TrendingUp className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Progreso</p>
                      <p className="text-xs text-gray-500">del proyecto</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <div className="flex items-baseline space-x-1">
                      <span className="text-xl font-bold text-gray-900">{calculateProjectProgress()}%</span>
                    </div>
                    <div className="w-24 bg-gray-100 rounded-full h-1.5">
                      <div 
                        className="bg-gray-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${calculateProjectProgress()}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje de feedback compacto */}
      {saveMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className={`px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 ${
            saveMessage.includes('exitosamente') 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {saveMessage.includes('exitosamente') ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.818a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span className="text-sm font-medium">
              {saveMessage.includes('exitosamente') ? '¡Guardado!' : 'Error'}
            </span>
          </div>
        </div>
      )}



      {/* Calendario Gantt - Siempre visible */}
      <div className="space-y-6 mt-12">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto relative overflow-y-visible">
              <div className="min-w-[1272px]">
                
                {/* Línea roja continua del día de hoy - atraviesa toda la tabla */}
                <div
                  className="absolute top-0 w-0.5 bg-red-500 z-50 pointer-events-none"
                  style={{
                    left: `calc(392px + ${getTodayPositionPercent()}% * (100% - 392px) / 100%)`,
                    height: '100%'
                  }}
                ></div>
                
                  {/* Header del calendario */}
                  <div className="flex border-b border-gray-200">
                    <div className="w-80 p-4 border-r border-gray-200 bg-gray-50">
                      <div className="flex justify-center items-center space-x-2">
                        <h3 className="font-semibold text-gray-900">Actividades</h3>
                        {ganttLoading && selectedProject && (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                        )}
                      </div>
                    </div>
                  <div className="w-12 p-2 border-r border-gray-200 bg-gray-50">
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
                {!selectedProject ? (
                  /* Mensaje cuando no hay proyecto seleccionado */
                  <div className="flex">
                    <div className="w-80 p-4 border-r border-gray-200 bg-gray-50 flex justify-center items-center">
                      <div className="text-center">
                        <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm text-gray-500">Selecciona un proyecto</p>
                      </div>
                    </div>
                    <div className="w-12 p-2 border-r border-gray-200 bg-gray-50"></div>
                    <div className="flex-1 p-4 bg-gray-50 flex items-center justify-center">
                      <p className="text-sm text-gray-400">El calendario Gantt aparecerá aquí</p>
                    </div>
                  </div>
                ) : activities.length === 0 ? (
                  <div className="flex">
                    <div className="w-80 p-4 border-r border-gray-200 bg-gray-50 flex justify-center">
                      <div className="relative group">
                        <Button
                          onClick={handleAddActivityClick}
                          variant="outline"
                          className="border-2 border-gray-400 text-gray-500 hover:bg-blue-100 hover:border-blue-500 hover:text-blue-500 rounded-full w-10 h-10 p-0 shadow-2xl hover:shadow-2xl transition-all duration-300"
                        >
                          <Plus className="h-6 w-6" />
                        </Button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">
                          Agregar actividad
                        </div>
                      </div>
                    </div>
                    <div className="w-12 p-2 border-r border-gray-200 bg-gray-50"></div>
                    <div className="flex-1 p-4 bg-gray-50"></div>
                  </div>
                ) : (
                  <>
                    {activities.map((activity) => (
                      <div key={activity.id} className="border-b border-gray-200">
                        {/* Fila de la actividad con sus tareas en la misma línea */}
                        <div className="flex hover:bg-gray-50">
                          <div className="w-80 pl-2 pr-4 py-4 border-r border-gray-200 flex items-start justify-between overflow-hidden relative">
                            <div className="flex-1 min-w-0 max-w-full">
                              <div className="flex items-start space-x-2">
                                {/* Columna de botones a la izquierda */}
                                <div className="flex flex-col items-center space-y-1 flex-shrink-0">
                                  {/* Botón expandir/colapsar */}
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
                                  
                                  {/* Botones de acción - solo visibles cuando está expandido */}
                                  {expandedDescriptions.has(activity.id) && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => handleEditActivityClick(e, activity)}
                                        className="h-6 w-6 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteActivity(activity.id)}
                                        className="h-6 w-6 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                                
                                {/* Contenido de la actividad */}
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-gray-900 break-words min-w-0 leading-tight">{activity.name}</h4>
                                  {expandedDescriptions.has(activity.id) && activity.description && (
                                    <div className="mt-1" style={{ marginRight: '2px' }}>
                                      <p className="text-xs text-gray-500 break-words overflow-hidden whitespace-normal leading-relaxed word-break-all text-justify">{activity.description}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Columna de acciones - Botón agregar tarea */}
                          <div className="w-12 p-2 border-r border-gray-200 flex items-center justify-center">
                            <div className="relative group">
                              <Button
                                onClick={(e) => {
                                  setSelectedActivity(activity);
                                  handleAddTaskClick(e);
                                }}
                                variant="outline"
                                className="border-2 border-gray-400 text-gray-500 hover:bg-blue-100 hover:border-blue-500 hover:text-blue-500 rounded-full w-8 h-8 p-0 shadow-lg hover:shadow-xl transition-all duration-300"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <div 
                                className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[99999]"
                              >
                                Agregar tarea
                              </div>
                            </div>
                          </div>
                          
                          {/* Área de Gantt con barras de tareas apiladas verticalmente */}
                          <div 
                            className="flex-1 relative p-2"
                            style={{ 
                              height: `${Math.max(48, 16 + (activity.tasks.length * 40))}px` // Altura dinámica: mínimo 48px, 16px para botón + 40px por cada tarea
                            }}
                          >
                            
                            {/* Barras de Gantt de las tareas apiladas verticalmente */}
                            {activity.tasks.map((task, index) => {
                              const containerHeight = Math.max(48, 16 + (activity.tasks.length * 40));
                              const totalTasksHeight = activity.tasks.length * 40;
                              const availableHeight = containerHeight - 16; // Restar padding
                              const startOffset = (availableHeight - totalTasksHeight) / 2 + 4;
                              
                              // Verificar si la tarea está dentro del rango visible (enero a diciembre)
                              const startPos = getDatePosition(task.start_date);
                              const barWidth = getBarWidth(task.start_date, task.end_date);
                              
                              // Si la tarea no es visible (ancho 0), no renderizarla
                              if (barWidth === 0) {
                                return null;
                              }
                              
                              return (
                                <div key={task.id} className="absolute" style={{ width: 'calc(100% - 16px)', left: '8px', right: '8px' }}>
                                  <div 
                                    className="relative h-8" 
                                    style={{ 
                                      top: `${startOffset + (index * 40)}px`
                                    }}
                                  >
                                  <div
                                    className={`absolute top-0 h-full ${task.completed ? 'bg-green-500' : 'bg-blue-500'} rounded shadow-sm border border-white/20 z-10`}
                                    style={{
                                      left: `${startPos.left}%`,
                                      width: `${barWidth}%`
                                    }}
                                  >
                                    {/* Porcentaje al final de la barra */}
                                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-medium text-white">
                                      {task.completed ? '✓' : '0%'}
                                    </div>
                                  </div>
                                  
                                  {/* Nombre de la tarea - detectar desbordamiento y posicionar apropiadamente */}
                                  {(() => {
                                    // Detectar si el nombre se desbordaría hacia la izquierda
                                    const wouldOverflow = startPos.left < 5; // Si está muy cerca del borde izquierdo
                                    
                                    if (wouldOverflow) {
                                      // Colocar el nombre dentro de la barra cuando hay desbordamiento
                                      return (
                                        <div 
                                          className="absolute text-xs font-medium text-gray-700 z-20 bg-white px-2 py-1 rounded shadow-sm border"
                                          style={{
                                            left: `${startPos.left + 2}%`,
                                            top: '50%', // Centrar verticalmente en la barra
                                            transform: 'translateY(-50%)', // Centrar verticalmente
                                            maxWidth: `${Math.max(barWidth - 4, 20)}%`,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                          }}
                                        >
                                          {task.name}
                                        </div>
                                      );
                                    } else {
                                      // Posicionamiento normal a la izquierda de la barra
                                      return (
                                        <div 
                                          className="absolute top-1/2 text-xs font-medium text-gray-700 z-10 bg-white px-2 py-1 rounded shadow-sm border"
                                          style={{
                                            left: `${startPos.left - 2}%`,
                                            transform: 'translateY(-50%) translateX(-100%)'
                                          }}
                                        >
                                          {task.name}
                                        </div>
                                      );
                                    }
                                  })()}
                                  
                                  {/* Controles al final de la barra */}
                                  <div 
                                    className="absolute top-1/2 flex items-center space-x-2 bg-white/90 rounded px-2 py-1 shadow-sm border z-20"
                                    style={{
                                      left: `${startPos.left + barWidth + 1}%`,
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
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Botón para agregar actividad */}
                    <div className="flex">
                      <div className="w-80 p-4 border-r border-gray-200 bg-gray-50">
                        <div className="flex justify-center">
                          {/* Botón agregar actividad */}
                          <div className="relative group">
                            <Button
                              onClick={handleAddActivityClick}
                              variant="outline"
                              className="border-2 border-gray-400 text-gray-500 hover:bg-blue-100 hover:border-blue-500 hover:text-blue-500 rounded-full w-10 h-10 p-0 shadow-2xl hover:shadow-2xl transition-all duration-300"
                            >
                              <Plus className="h-6 w-6" />
                            </Button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">
                              Agregar actividad
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="w-12 p-2 border-r border-gray-200 bg-gray-50"></div>
                      <div className="flex-1 p-4 bg-gray-50"></div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">
                      Fecha de inicio *
                    </Label>
                    <Calendar
                      value={activityForm.startDate || undefined}
                      onChange={(date) => handleActivityInputChange('startDate', date)}
                      placeholder="Seleccionar fecha de inicio"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">
                      Fecha de término *
                    </Label>
                    <Calendar
                      value={activityForm.endDate || undefined}
                      onChange={(date) => handleActivityInputChange('endDate', date)}
                      placeholder="Seleccionar fecha de término"
                      className="w-full"
                      minDate={activityForm.startDate || undefined}
                    />
                  </div>
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
      {showAddTask && (
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
                  Nueva Tarea
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddTask(false);
                    setSelectedActivity(null);
                    setTaskForm({ name: '', startDate: '', endDate: '' });
                  }}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-3">
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
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">
                      Fecha de inicio *
                    </Label>
                    <Calendar
                      value={taskForm.startDate || undefined}
                      onChange={(date) => handleTaskInputChange('startDate', date)}
                      placeholder="Seleccionar fecha de inicio"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">
                      Fecha de término *
                    </Label>
                    <Calendar
                      value={taskForm.endDate || undefined}
                      onChange={(date) => handleTaskInputChange('endDate', date)}
                      placeholder="Seleccionar fecha de término"
                      className="w-full"
                      minDate={taskForm.startDate || undefined}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddTask(false);
                      setSelectedActivity(null);
                      setTaskForm({ name: '', startDate: '', endDate: '' });
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
          <Card className="w-[500px] shadow-2xl border-2">
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
                  className="h-10 w-10 p-0 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-105"
                >
                  <span className="text-lg font-semibold text-gray-600 hover:text-gray-800">×</span>
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
                    rows={5}
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

      {/* Popup para crear actividad */}
      {showCreateActivity && (
        <div 
          className="fixed z-50"
          style={{
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`
          }}
        >
          <Card className="w-[500px] shadow-2xl border-2">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Crear Actividad
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateActivity(false);
                    setCreateActivityForm({ name: '', description: '' });
                  }}
                  className="h-10 w-10 p-0 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-105"
                >
                  <span className="text-lg font-semibold text-gray-600 hover:text-gray-800">×</span>
                </Button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Input
                    value={createActivityForm.name}
                    onChange={(e) => handleCreateActivityInputChange('name', e.target.value)}
                    placeholder="Nombre de la actividad *"
                    className="w-full"
                    required
                  />
                </div>

                <div>
                  <textarea
                    value={createActivityForm.description}
                    onChange={(e) => handleCreateActivityInputChange('description', e.target.value)}
                    placeholder="Descripción (opcional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:border-gray-400 resize-none text-sm"
                    rows={5}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateActivity(false);
                      setCreateActivityForm({ name: '', description: '' });
                    }}
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
      </div>
    </TooltipProvider>
  );
}

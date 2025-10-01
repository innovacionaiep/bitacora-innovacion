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
  TrendingUp
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PeriodTimeline } from '@/components/ui/period-timeline';
import { Slider } from '@/components/ui/slider';
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [showEditActivity, setShowEditActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  
  // Estado unificado para el popup de actividad
  const [showActivityPopup, setShowActivityPopup] = useState(false);
  const [activityPopupMode, setActivityPopupMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedActivityForPopup, setSelectedActivityForPopup] = useState<Activity | null>(null);
  
  // Timer para ocultar el tooltip con delay
  const [tooltipTimer, setTooltipTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Estado para controlar el offset del timeline (meses desde enero 2025)
  const [timelineOffset, setTimelineOffset] = useState(0); // 0 = enero 2025, -12 = enero 2024, 12 = enero 2026
  
  // Estado para controlar el rango visible de meses (6-24 meses)
  const [visibleMonthsRange, setVisibleMonthsRange] = useState(12); // 12 meses por defecto

  // Generar los meses visibles basados en el offset y rango
  const getVisibleMonths = () => {
    const months = [];
    const startYear = 2025 + Math.floor(timelineOffset / 12);
    const startMonth = ((timelineOffset % 12) + 12) % 12; // Manejar valores negativos
    
    for (let i = 0; i < visibleMonthsRange; i++) {
      const monthIndex = (startMonth + i) % 12;
      const year = startYear + Math.floor((startMonth + i) / 12);
      
      // Determinar si necesitamos truncar el nombre del mes
      const shouldTruncate = visibleMonthsRange > 12;
      const monthName = shouldTruncate ? MONTHS[monthIndex].substring(0, 3) : MONTHS[monthIndex];
      
      months.push({
        name: monthName,
        fullName: MONTHS[monthIndex],
        year: year,
        monthIndex: monthIndex
      });
    }
    
    return months;
  };
  
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
    description: '',
    startDate: '',
    endDate: ''
  });

  // Formulario de edición de actividad
  const [editActivityForm, setEditActivityForm] = useState({
    name: '',
    description: ''
  });

  // Formulario unificado para el popup de actividad
  const [unifiedActivityForm, setUnifiedActivityForm] = useState({
    name: '',
    description: ''
  });

  // Estado para tareas temporales en el popup de crear actividad
  const [tempTasks, setTempTasks] = useState<Task[]>([]);

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
    calculateProjectProgress
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
    setShowActivityPopup(false);
    setSelectedActivity(null);
    setEditingActivity(null);
    setSelectedActivityForPopup(null);
    setExpandedDescriptions(new Set());
    
    // Resetear formularios
    setActivityForm({ name: '', description: '', startDate: '', endDate: '' });
    setTaskForm({ name: '', description: '', startDate: '', endDate: '' });
    setEditActivityForm({ name: '', description: '' });
    setUnifiedActivityForm({ name: '', description: '' });
    setTempTasks([]);
  };

  // Función para cerrar solo los popups de formularios (sin afectar descripciones expandidas ni modos)
  const closeFormPopups = () => {
    setShowAddActivity(false);
    setShowAddTask(false);
    setShowEditActivity(false);
    setShowActivityPopup(false);
    setSelectedActivity(null);
    setEditingActivity(null);
    setSelectedActivityForPopup(null);
    
    // Resetear formularios
    setActivityForm({ name: '', description: '', startDate: '', endDate: '' });
    setTaskForm({ name: '', description: '', startDate: '', endDate: '' });
    setEditActivityForm({ name: '', description: '' });
    setUnifiedActivityForm({ name: '', description: '' });
    setTempTasks([]);
  };


  // Cerrar todos los popups cuando cambie el proyecto seleccionado
  useEffect(() => {
    closeAllPopups();
  }, [selectedProject]);

  // Limpiar timer cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (tooltipTimer) {
        clearTimeout(tooltipTimer);
      }
    };
  }, [tooltipTimer]);


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

  // Crear nueva actividad (función legacy - ahora se usa handleUnifiedActivityAction)
  const handleCreateActivity = async () => {
    if (!selectedProject || !unifiedActivityForm.name) {
      alert('Por favor completa el nombre de la actividad');
      return;
    }

    const { error } = await createActivity({
      name: unifiedActivityForm.name,
      description: unifiedActivityForm.description
    });

    if (error) {
      alert('Error al crear la actividad: ' + error);
    } else {
      setUnifiedActivityForm({ name: '', description: '' });
      setShowActivityPopup(false);
      showSuccessMessage('Actividad creada exitosamente');
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

    // Si estamos en modo crear actividad o editando, agregar a la lista temporal
    if (activityPopupMode === 'create' || activityPopupMode === 'edit') {
      const newTask: Task = {
        id: `temp-${Date.now()}`, // ID temporal
        name: taskForm.name,
        description: taskForm.description,
        start_date: convertedStartDate,
        end_date: convertedEndDate,
        completed: false,
        activity_id: selectedActivity.id,
        progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setTempTasks(prev => [...prev, newTask]);
      setTaskForm({ name: '', description: '', startDate: '', endDate: '' });
      setShowAddTask(false);
      alert('Tarea agregada a la actividad');
      return;
    }

    // Si estamos creando tarea desde fuera del popup de actividad, crear inmediatamente
    const { error } = await createTask(selectedActivity.id, {
      name: taskForm.name,
      description: taskForm.description,
      start_date: convertedStartDate,
      end_date: convertedEndDate
    });

    if (error) {
      console.error('Error al crear la tarea:', error);
      alert('Error al crear la tarea: ' + error);
    } else {
      setTaskForm({ name: '', description: '', startDate: '', endDate: '' });
      setShowAddTask(false);
      setSelectedActivity(null);
      showSuccessMessage('Tarea creada exitosamente');
    }
  };

  // Toggle completar tarea
  const handleToggleTaskCompletion = (taskId: string) => {
    toggleTaskCompletion(taskId);
    showSuccessMessage('Tarea actualizada exitosamente');
  };

  // Eliminar actividad
  const handleDeleteActivity = async (activityId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta actividad y todas sus tareas?')) {
      const { error } = await deleteActivity(activityId);
      if (error) {
        alert('Error al eliminar la actividad: ' + error);
      } else {
        showSuccessMessage('Actividad eliminada exitosamente');
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
        showSuccessMessage('Tarea eliminada exitosamente');
      }
    }
  };

  // Mostrar mensaje de éxito
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Manejar clic en agregar actividad
  const handleAddActivityClick = (event: React.MouseEvent) => {
    // Cerrar solo los popups de formularios antes de abrir el nuevo
    closeFormPopups();
    openActivityPopup('create');
  };

  // Manejar clic en agregar tarea
  const handleAddTaskClick = (event: React.MouseEvent) => {
    // Cerrar solo los popups de formularios antes de abrir el nuevo (pero mantener selectedActivity)
    setShowAddActivity(false);
    setShowAddTask(false);
    setShowEditActivity(false);
    setShowActivityPopup(false);
    setEditingActivity(null);
    
    // Resetear formularios
    setActivityForm({ name: '', description: '', startDate: '', endDate: '' });
    setTaskForm({ name: '', description: '', startDate: '', endDate: '' });
    setEditActivityForm({ name: '', description: '' });
    setUnifiedActivityForm({ name: '', description: '' });
    
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
    openActivityPopup('edit', activity);
  };


  // Manejar cambios en el formulario de edición
  const handleEditActivityInputChange = (field: string, value: string) => {
    setEditActivityForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Manejar cambios en el formulario unificado
  const handleUnifiedActivityInputChange = (field: string, value: string) => {
    setUnifiedActivityForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Función para manejar la acción principal del popup (crear o guardar)
  const handleUnifiedActivityAction = async () => {
    if (!unifiedActivityForm.name) {
      alert('Por favor completa el nombre de la actividad');
      return;
    }

    // Validar longitud máxima del título (76 caracteres)
    if (unifiedActivityForm.name.length > 76) {
      alert('El nombre de la actividad no puede exceder los 76 caracteres');
      return;
    }

    if (activityPopupMode === 'create') {
      // Validar que haya al menos una tarea al crear una actividad
      if (tempTasks.length === 0) {
        alert('Error: Debes agregar al menos una tarea para crear la actividad');
        return;
      }

      // Crear nueva actividad
      const { error, data: newActivity } = await createActivity({
        name: unifiedActivityForm.name,
        description: unifiedActivityForm.description
      });

      if (error) {
        alert('Error al crear la actividad: ' + error);
      } else if (newActivity) {
        // Crear las tareas asociadas
        for (const task of tempTasks) {
          await createTask(newActivity.id, {
            name: task.name,
            description: '',
            start_date: task.start_date,
            end_date: task.end_date
          });
        }

        setUnifiedActivityForm({ name: '', description: '' });
        setTempTasks([]);
        setShowActivityPopup(false);
        setSelectedActivityForPopup(null);
        showSuccessMessage('Actividad creada exitosamente con sus tareas');
      }
    } else if (activityPopupMode === 'edit' && selectedActivityForPopup) {
      // Editar actividad existente
      const { error } = await updateActivity(selectedActivityForPopup.id, {
        name: unifiedActivityForm.name,
        description: unifiedActivityForm.description
      });

      if (error) {
        alert('Error al actualizar la actividad: ' + error);
      } else {
        // Crear las tareas temporales que se agregaron durante la edición
        for (const task of tempTasks) {
          await createTask(selectedActivityForPopup.id, {
            name: task.name,
            description: task.description,
            start_date: task.start_date,
            end_date: task.end_date
          });
        }

        // Actualizar la actividad seleccionada con los nuevos datos
        const updatedActivity = {
          ...selectedActivityForPopup,
          name: unifiedActivityForm.name,
          description: unifiedActivityForm.description
        };
        setSelectedActivityForPopup(updatedActivity);

        // Limpiar formulario y tareas temporales
        setUnifiedActivityForm({ name: '', description: '' });
        setTempTasks([]);
        
        // Volver al modo de información en lugar de cerrar el popup
        setActivityPopupMode('view');
        showSuccessMessage('Actividad actualizada exitosamente con sus nuevas tareas');
      }
    }
  };

  // Actualizar actividad
  const handleUpdateActivity = async () => {
    if (!editingActivity || !editActivityForm.name) {
      alert('Por favor completa el nombre de la actividad');
      return;
    }

    // Validar longitud máxima del título (76 caracteres)
    if (editActivityForm.name.length > 76) {
      alert('El nombre de la actividad no puede exceder los 76 caracteres');
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
      showSuccessMessage('Actividad actualizada exitosamente');
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
    
    // Calcular el offset de la fecha desde enero 2025
    const dateOffset = (year - 2025) * 12 + month;
    const visibleStartOffset = timelineOffset;
    const visibleEndOffset = timelineOffset + visibleMonthsRange - 1;
    
    // Si la fecha está completamente fuera del rango visible, ajustarla al borde del rango
    if (dateOffset < visibleStartOffset) {
      return { month: 0, day: 1, left: 0 }; // Ajustar al inicio del rango
    } else if (dateOffset > visibleEndOffset) {
      return { month: visibleMonthsRange - 1, day: 31, left: 100 }; // Ajustar al final del rango
    }
    
    // Calcular la posición relativa dentro del rango visible
    const relativeMonth = dateOffset - visibleStartOffset;
    
    // Calcular la posición basada en el mes relativo y el día del mes
    const monthWidth = 100 / visibleMonthsRange; // Cada mes ocupa 1/total_meses del ancho total
    
    // Obtener el número real de días en el mes para un cálculo más preciso
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayWidth = monthWidth / daysInMonth; // Cada día ocupa 1/días_del_mes del ancho del mes
    
    // Calcular la posición del día dentro del mes (día 1 = 0%, último día = 100% del mes)
    const dayPosition = (day - 1) * dayWidth;
    
    // Calcular la posición total usando el mes relativo
    const leftPosition = (relativeMonth * monthWidth) + dayPosition;
    
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

  // Formatear fecha para mostrar en tooltip
  const formatDateForTooltip = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('es-ES', { month: 'long' }).toLowerCase();
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };



  // Función para abrir el popup unificado en diferentes modos
  const openActivityPopup = (mode: 'create' | 'edit' | 'view', activity?: Activity) => {
    setActivityPopupMode(mode);
    setSelectedActivityForPopup(activity || null);
    
    if (mode === 'create') {
      setUnifiedActivityForm({ name: '', description: '' });
      setTempTasks([]);
    } else if (activity) {
      setUnifiedActivityForm({
        name: activity.name,
        description: activity.description || ''
      });
      // En modo editar, inicializar con tareas vacías para agregar nuevas
      // En modo view, mostrar las tareas existentes
      setTempTasks(mode === 'edit' ? [] : (activity.tasks || []));
    }
    
    setShowActivityPopup(true);
  };

  // Manejar el clic en la barra de actividad para mostrar popup
  const handleActivityBarClick = (activity: Activity) => {
    openActivityPopup('view', activity);
  };


  // Calcular el rango de fechas de una actividad basado en sus tareas
  const getActivityDateRange = (activity: Activity) => {
    if (!activity.tasks || activity.tasks.length === 0) {
      return null;
    }

    // Ordenar las tareas por fecha de inicio
    const sortedTasks = [...activity.tasks].sort((a, b) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    const firstTask = sortedTasks[0];
    const lastTask = sortedTasks[sortedTasks.length - 1];

    return {
      startDate: firstTask.start_date,
      endDate: lastTask.end_date
    };
  };

  // Calcular el progreso de una actividad basado en tareas completadas
  const getActivityProgress = (activity: Activity) => {
    if (!activity.tasks || activity.tasks.length === 0) {
      return 0;
    }

    const completedTasks = activity.tasks.filter(task => task.completed).length;
    const totalTasks = activity.tasks.length;
    
    return Math.round((completedTasks / totalTasks) * 100);
  };

  // Obtener ancho de la barra basado en la duración para tareas
  const getBarWidth = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Calcular los offsets de las fechas desde enero 2025
    const startOffset = (start.getFullYear() - 2025) * 12 + start.getMonth();
    const endOffset = (end.getFullYear() - 2025) * 12 + end.getMonth();
    const visibleStartOffset = timelineOffset;
    const visibleEndOffset = timelineOffset + visibleMonthsRange - 1;
    
    // Si la tarea está completamente fuera del rango visible, no mostrarla
    if (endOffset < visibleStartOffset || startOffset > visibleEndOffset) {
      return 0; // No mostrar la tarea
    }
    
    // Obtener las posiciones de inicio y fin
    const startPos = getDatePosition(startDate);
    const endPos = getDatePosition(endDate);
    
    // Calcular el ancho basado en la diferencia de posiciones
    let width = endPos.left - startPos.left;
    
    // Si la tarea se extiende más allá del rango visible, ajustar el ancho
    if (startPos.left >= 100) {
      // La tarea comienza después del rango visible, no mostrar
      return 0;
    } else if (endPos.left > 100) {
      // La tarea se extiende más allá del rango visible, limitar al final del rango
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
    
    // Calcular el offset de hoy desde enero 2025
    const todayOffset = (currentYear - 2025) * 12 + currentMonth;
    const visibleStartOffset = timelineOffset;
    const visibleEndOffset = timelineOffset + visibleMonthsRange - 1;
    
    // Solo mostrar la línea "Hoy" si está en el rango visible
    if (todayOffset < visibleStartOffset || todayOffset > visibleEndOffset) {
      return -1; // No mostrar la línea si no está en el rango visible
    }
    
    // Calcular la posición relativa dentro del rango visible
    const relativeMonth = todayOffset - visibleStartOffset;
    
    // PASO 1: Calcular la posición de la columna del mes
    const monthWidth = 100 / visibleMonthsRange; // Ancho por mes basado en el rango total
    const monthStartPosition = relativeMonth * monthWidth; // Posición de inicio del mes
    
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
      mesObjetivo: relativeMonth,
      díasEnMes: daysInMonth,
      posiciónMes: `${monthStartPosition.toFixed(2)}%`,
      anchoDía: `${dayWidth.toFixed(2)}%`,
      posiciónDía: `${dayPosition.toFixed(2)}%`,
      posiciónFinal: `${leftPercent.toFixed(2)}%`,
      columna: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][relativeMonth]
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
      
      <div className="pt-4 px-4 pb-4 space-y-4">
      {/* Header */}
      <div className="space-y-4">
        {/* Selector de proyecto y Progreso del proyecto alineados */}
        <div className="flex items-start justify-between w-full">
          {/* Selector de proyecto */}
          <div className="flex items-center space-x-5">
            <FolderKanban className="h-7 w-7 text-gray-600" />
            <div>
              <Label htmlFor="project-select" className="text-base font-medium text-gray-700">
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
                  <SelectTrigger className="mt-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 w-88 h-12 px-4 text-base">
                    <SelectValue placeholder="Selecciona un proyecto" />
                  </SelectTrigger>
                  <SelectContent className="text-base">
                    {proyectos.map((project) => (
                      <SelectItem key={project.id} value={project.id} className="py-3">
                        {project.proyecto} - {project.sede}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {ganttLoading && selectedProject && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Elementos de Progreso del proyecto - Alineados con el final de la tabla */}
          <div className="flex items-center justify-end pr-8">
            <div className="flex items-center space-x-8">
              <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg shadow-sm">
                <TrendingUp className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="flex items-center space-x-6">
                <div>
                  <p className="text-lg font-semibold text-gray-900">Progreso</p>
                  <p className="text-base text-gray-600">del proyecto</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-[416px] min-w-[200px] max-w-[400px] bg-gray-200 rounded-full h-3 shadow-inner">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-300 shadow-sm"
                      style={{ width: `${calculateProjectProgress()}%` }}
                    ></div>
                  </div>
                  <div className="text-5xl font-bold text-emerald-600 drop-shadow-sm">{calculateProjectProgress()}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje de éxito */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className="px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 bg-emerald-500 text-white">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">
              ¡Guardado!
            </span>
          </div>
        </div>
      )}



      {/* Calendario Gantt - Siempre visible */}
      <div className="space-y-6 mt-12">
        <Card>
          <CardContent className="p-0">
            <div className="gantt-container overflow-x-auto relative overflow-y-visible">
              <div className="w-full min-w-[800px]">
                
                {/* Línea roja continua del día de hoy - atraviesa toda la tabla - Solo visible si estamos en el rango actual */}
                {getTodayPositionPercent() >= 0 && (
                  <div
                    className="absolute top-0 w-0.5 bg-red-500 z-50 pointer-events-none"
                    style={{
                      left: `calc(416px + ${getTodayPositionPercent()}% * (100% - 416px) / 100%)`,
                      height: '100%'
                    }}
                  ></div>
                )}
                
                  {/* Header del calendario */}
                  <div className="flex border-b border-gray-200">
                    <div className="w-[416px] p-4 border-r border-gray-200 bg-gray-50" data-column="activities">
                      <div className="flex justify-center items-center space-x-2">
                        <h3 className="font-semibold text-gray-900">Actividades</h3>
                        {ganttLoading && selectedProject && (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                        )}
                      </div>
                    </div>
                  <div className="flex-1 flex relative">
                    {getVisibleMonths().map((month, index) => (
                      <div key={`${month.year}-${month.monthIndex}`} className="flex-1 p-2 text-center border-r border-gray-200 bg-gray-50 flex flex-col items-center justify-center">
                        <div className="text-sm font-medium text-gray-700">{month.name}</div>
                        <div className="text-xs text-gray-500 font-normal">{month.year}</div>
                      </div>
                    ))}
                    
                    {/* Indicador de "Hoy" - Solo visible si estamos en el rango actual */}
                    {getTodayPositionPercent() >= 0 && (
                      <div
                        className="absolute top-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full z-50 font-medium shadow-lg pointer-events-none"
                        style={{
                          left: `${getTodayPositionPercent()}%`,
                          transform: 'translateX(-50%)'
                        }}
                      >
                        Hoy
                      </div>
                    )}
                  </div>
                </div>
                

                {/* Filas de actividades y tareas */}
                {!selectedProject ? (
                  /* Mensaje cuando no hay proyecto seleccionado */
                  <div className="flex">
                    <div className="w-[416px] p-4 border-r border-gray-200 bg-gray-50 flex justify-center items-center" data-column="activities">
                      <div className="text-center">
                        <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm text-gray-500">Selecciona un proyecto</p>
                      </div>
                    </div>
                    <div className="flex-1 p-4 bg-gray-50 flex items-center justify-center">
                      <p className="text-sm text-gray-400">El calendario Gantt aparecerá aquí</p>
                    </div>
                  </div>
                ) : activities.length === 0 ? (
                  <div className="flex">
                    <div className="w-[416px] p-4 border-r border-gray-200 bg-gray-50 flex justify-center" data-column="activities">
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
                    <div className="flex-1 p-4 bg-gray-50"></div>
                  </div>
                ) : (
                  <>
                    {activities.map((activity) => (
                      <div key={activity.id} className="border-b border-gray-200">
                        {/* Fila de la actividad con sus tareas en la misma línea */}
                        <div className="flex hover:bg-gray-50 group relative">
                          <div 
                            className={`w-[416px] pl-2 pr-4 py-4 border-r border-gray-200 flex justify-between overflow-hidden relative ${
                              !expandedDescriptions.has(activity.id) ? 'items-center' : ''
                            }`}
                            data-column="activities"
                            style={{ 
                              height: `${expandedDescriptions.has(activity.id) 
                                ? Math.max(48, 4 + 40 + (activity.tasks.length * 22) + 17) // Altura completa cuando expandido: 4px superior + 40px barra actividad + 22px por tarea + 8px inferior
                                : Math.max(48, 4 + 40 + 12) // Solo barra de actividad cuando colapsado: 4px superior + 40px barra + 8px inferior
                              }px`
                            }}
                          >
                            <div className="flex-1 min-w-0 max-w-full">
                              <div className={`flex space-x-2 ${
                                !expandedDescriptions.has(activity.id) ? 'items-center' : 'items-start'
                              }`}>
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
                                        onClick={() => handleDeleteActivity(activity.id)}
                                        className="h-6 w-6 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                                
                                {/* Contenido de la actividad - solo visible cuando NO está expandido */}
                                {!expandedDescriptions.has(activity.id) && (
                                  <div className="flex-1 min-w-0 flex items-center relative">
                                    <h4 
                                      className="activity-title font-medium text-gray-900 break-words min-w-0 leading-tight cursor-pointer hover:text-blue-600 transition-colors duration-200" 
                                      style={{ 
                                        fontSize: '15px',
                                        lineHeight: activity.name.length > 50 ? '1.1' : '1.3'
                                      }}
                                      data-activity-id={activity.id}
                                      onClick={() => handleActivityBarClick(activity)}
                                      title="Haz clic para ver detalles de la actividad"
                                    >
                                      {activity.name}
                                    </h4>
                                  </div>
                                )}
                              </div>
                              
                              {/* Título de actividad posicionado a la altura de su barra cuando está expandido */}
                              {expandedDescriptions.has(activity.id) && (
                                <div className="absolute left-0 right-0 top-0 bottom-0 pointer-events-none">
                                  {(() => {
                                    const isExpanded = expandedDescriptions.has(activity.id);
                                    const taskSpacing = 22; // Espaciado entre tareas
                                    const containerHeight = isExpanded 
                                      ? Math.max(48, 16 + 40 + (activity.tasks.length * taskSpacing) + 16)
                                      : Math.max(48, 16 + 40);
                                    const totalItemsHeight = isExpanded ? 40 + (activity.tasks.length * taskSpacing) : 40;
                                    const availableHeight = containerHeight - 12; // Restar padding (4px superior + 8px inferior)
                                    const startOffset = 4; // Padding superior fijo para mantener consistencia entre estados
                                    
                                    // Estimar si el texto tendrá dos líneas basado en la longitud
                                    // Ajustar el umbral considerando el nuevo ancho de columna y tamaño de fuente
                                    const estimatedLines = activity.name.length > 50 ? 2 : 1;
                                    
                                    let topPosition;
                                    
                                    if (estimatedLines === 1) {
                                      // Para títulos de una línea, usar la posición original que ya funcionaba bien
                                      topPosition = startOffset + 14; // Ajustar 2px hacia arriba para coincidir exactamente con estado colapsado
                                    } else {
                                      // Para títulos de múltiples líneas, calcular el centrado especial
                                      // Usar valores empíricos basados en la observación visual
                                      const totalTextHeight = 17; // Altura aproximada de 2 líneas de 13px
                                      
                                      // Calcular el centro de la barra de actividad (32px de altura)
                                      const barCenter = startOffset + 16; // Centro de la barra de 32px
                                      
                                      // Calcular el centro del texto de dos líneas
                                      const textCenter = totalTextHeight / 2; // Centro del texto = 16px
                                      
                                      // Posicionar el texto para que su centro coincida con el centro de la barra
                                      topPosition = barCenter - textCenter;
                                    }
                                    
                                    return (
                                      <div 
                                        className="absolute font-medium text-gray-900 break-words leading-tight pointer-events-auto cursor-pointer hover:text-blue-600 transition-colors duration-200"
                                        style={{ 
                                          fontSize: '15px',
                                          lineHeight: activity.name.length > 50 ? '1.1' : '1.3',
                                          top: `${topPosition}px`,
                                          left: '40px', // Posición más a la izquierda para coincidir con títulos colapsados
                                          right: '20px',
                                          zIndex: 10
                                        }}
                                        onClick={() => handleActivityBarClick(activity)}
                                        title="Haz clic para ver detalles de la actividad"
                                      >
                                        <span 
                                          className="activity-title"
                                          data-activity-id={activity.id}
                                        >
                                          {activity.name}
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                              
                              {/* Nombres de tareas con checkboxes posicionados a la altura de sus barras */}
                              {expandedDescriptions.has(activity.id) && activity.tasks && activity.tasks.length > 0 && (
                                <div className="absolute left-0 right-0 top-0 bottom-0 pointer-events-none">
                                  {activity.tasks
                                    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                                    .map((task, index) => {
                                    const isExpanded = expandedDescriptions.has(activity.id);
                                    const taskSpacing = 22; // Espaciado entre tareas
                                    const containerHeight = isExpanded 
                                      ? Math.max(48, 16 + 40 + (activity.tasks.length * taskSpacing) + 16)
                                      : Math.max(48, 16 + 40);
                                    const totalItemsHeight = isExpanded ? 40 + (activity.tasks.length * taskSpacing) : 40;
                                    const availableHeight = containerHeight - 12; // Restar padding (4px superior + 8px inferior)
                                    const startOffset = 4; // Padding superior fijo para mantener consistencia entre estados
                                    
                                    return (
                                      <div 
                                        key={task.id} 
                                        className="absolute flex items-center space-x-2 text-sm text-gray-600 pointer-events-auto"
                                        style={{ 
                                          top: `${startOffset + 40 + (index * taskSpacing) + 12}px`, // 40 para la barra de actividad + espaciado + offset
                                          left: '60px', // Posición fija desde la izquierda
                                          right: '8px',
                                          zIndex: 10
                                        }}
                                      >
                                        {/* Checkbox moderno con color emerald-500 */}
                                        <div className="flex items-center">
                                          <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={task.completed}
                                              onChange={() => handleToggleTaskCompletion(task.id)}
                                              className="sr-only"
                                            />
                                            <div className={`w-4 h-4 border-2 rounded transition-all duration-200 ${
                                              task.completed 
                                                ? 'bg-emerald-500 border-emerald-500' 
                                                : 'bg-white border-gray-300 hover:border-emerald-400'
                                            }`}>
                                              {task.completed && (
                                                <svg 
                                                  className="w-3 h-3 text-white absolute top-0.5 left-0.5" 
                                                  fill="currentColor" 
                                                  viewBox="0 0 20 20"
                                                >
                                                  <path 
                                                    fillRule="evenodd" 
                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                                                    clipRule="evenodd" 
                                                  />
                                                </svg>
                                              )}
                                            </div>
                                          </label>
                                        </div>
                                        {/* Nombre de la tarea con punto al final del texto */}
                                        <span 
                                          className={`task-title flex-1 ${task.completed ? 'line-through text-gray-400' : 'text-gray-600'} relative`}
                                          data-task-id={task.id}
                                          style={{
                                            display: 'inline-block'
                                          }}
                                        >
                                          {task.name}
                                          {/* Punto gris al final del texto */}
                                          <span 
                                            className="w-2 h-2 bg-gray-400 rounded-full inline-block ml-1"
                                            style={{
                                              verticalAlign: 'middle'
                                            }}
                                          ></span>
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            
                          </div>
                          
                          {/* Área de Gantt con barras de tareas apiladas verticalmente */}
                          <div 
                            className="flex-1 relative p-2"
                            style={{ 
                              height: `${expandedDescriptions.has(activity.id) 
                                ? Math.max(48, 4 + 40 + (activity.tasks.length * 22) + 8) // Altura completa cuando expandido: 4px superior + 40px barra actividad + 22px por tarea + 8px inferior
                                : Math.max(48, 4 + 40 + 8) // Solo barra de actividad cuando colapsado: 4px superior + 40px barra + 8px inferior
                              }px`
                            }}
                          >
                            
                            {/* Barra de actividad - como primera "tarea" */}
                            {(() => {
                              const activityRange = getActivityDateRange(activity);
                              if (!activityRange) return null;

                              const startPos = getDatePosition(activityRange.startDate);
                              const barWidth = getBarWidth(activityRange.startDate, activityRange.endDate);
                              
                              // Si la actividad no es visible (ancho 0), no renderizarla
                              if (barWidth === 0) return null;

                              const isExpanded = expandedDescriptions.has(activity.id);
                              const taskSpacing = 22; // Espaciado reducido entre tareas
                              const containerHeight = isExpanded 
                                ? Math.max(48, 4 + 40 + (activity.tasks.length * taskSpacing) + 8) // 4px superior + 40px barra actividad + 22px por tarea + 8px inferior
                                : Math.max(48, 16 + 40);
                              const totalItemsHeight = isExpanded ? 40 + (activity.tasks.length * taskSpacing) : 40; // Solo barra de actividad cuando colapsado
                              const availableHeight = containerHeight - 12; // Restar padding (4px superior + 8px inferior)
                              const startOffset = 4; // Padding superior fijo para mantener consistencia entre estados

                              const activityProgress = getActivityProgress(activity);

                              return (
                                <div key={`activity-${activity.id}`} className="absolute" style={{ width: 'calc(100% - 16px)', left: '8px', right: '8px' }}>
                                  <div 
                                    className="relative h-8" 
                                    style={{ 
                                      top: `${startOffset}px`
                                    }}
                                  >
                                    {/* Barra de fondo gris con popup */}
                                    <div className="relative group h-8">
                                      <div
                                        className="activity-bar absolute top-0 h-8 bg-gray-400 rounded-xl shadow-sm z-10 cursor-pointer hover:bg-gray-500 hover:shadow-md transition-all duration-200"
                                        style={{
                                          left: `${startPos.left}%`,
                                          width: `${barWidth}%`
                                        }}
                                        data-activity-id={activity.id}
                                        onClick={() => handleActivityBarClick(activity)}
                                        title="Haz clic para ver detalles de la actividad"
                                      >
                                        {/* Barra de progreso verde - perfectamente alineada */}
                                        <div
                                          className="absolute bg-emerald-500 rounded-xl transition-all duration-300 z-20"
                                          style={{
                                            width: `${activityProgress}%`,
                                            top: '0px',
                                            left: '0px',
                                            height: '32px'
                                          }}
                                        ></div>
                                        
                                        {/* Porcentaje al final de la barra */}
                                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-medium text-white z-30">
                                          {activityProgress}%
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}


                            {/* Barras de Gantt de las tareas apiladas verticalmente - solo visibles cuando expandido */}
                            {expandedDescriptions.has(activity.id) && activity.tasks
                              .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                              .map((task, index) => {
                              const isExpanded = expandedDescriptions.has(activity.id);
                              const taskSpacing = 22; // Espaciado reducido entre tareas
                              const containerHeight = isExpanded 
                                ? Math.max(48, 4 + 40 + (activity.tasks.length * taskSpacing) + 8) // 4px superior + 40px barra actividad + 22px por tarea + 8px inferior
                                : Math.max(48, 16 + 40);
                              const totalItemsHeight = isExpanded ? 40 + (activity.tasks.length * taskSpacing) : 40; // Solo barra de actividad cuando colapsado
                              const availableHeight = containerHeight - 12; // Restar padding (4px superior + 8px inferior)
                              const startOffset = 4; // Padding superior fijo para mantener consistencia entre estados
                              
                              // Verificar si la tarea está dentro del rango visible (enero a diciembre)
                              const startPos = getDatePosition(task.start_date);
                              const barWidth = getBarWidth(task.start_date, task.end_date);
                              
                              // Si la tarea no es visible (ancho 0), no renderizarla
                                if (barWidth === 0) {
                                  return null;
                                }
                                
                                return (
                                <div key={task.id} className="absolute" style={{ width: 'calc(100% - 16px)', left: '0px', right: '8px' }}>
                                  <div 
                                    className="relative h-6" 
                                    style={{ 
                                      top: `${startOffset + 40 + (index * taskSpacing) + 1}px` // 40 para la barra de actividad + espaciado reducido entre tareas
                                    }}
                                  >
                                  {/* Línea de conexión desde el inicio hasta la barra */}
                                  <div
                                    className="absolute top-1/2 transform -translate-y-1/2 pointer-events-none z-10"
                                    style={{
                                      left: '0%',
                                      width: `${startPos.left}%`,
                                      height: '2px',
                                      backgroundColor: '#ef4444',
                                      opacity: 1
                                    }}
                                  ></div>
                                  
                                  <div
                                    className={`task-bar absolute top-1/2 transform -translate-y-1/2 h-3 ${task.completed ? 'bg-emerald-500' : 'bg-gray-300'} rounded-xl z-20 cursor-pointer hover:opacity-80 transition-opacity duration-200`}
                                    style={{
                                      left: `${startPos.left}%`,
                                      width: `${barWidth}%`
                                    }}
                                    data-task-id={task.id}
                                    title={`Tarea: ${task.name}`}
                                  >
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
                      <div className="w-[416px] p-4 border-r border-gray-200 bg-gray-50" data-column="activities">
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
                      <div className="flex-1 p-4 bg-gray-50"></div>
                    </div>
                  </>
                )}
              </div>
              
            </div>
          </CardContent>
        </Card>
        
        {/* Controles del timeline */}
        <div className="mt-4">
          <div className="flex items-center w-full">
            {/* Espaciador para alinear con la columna de actividades */}
            <div className="w-[416px] min-w-[200px] flex items-center justify-end pr-2">
              <span className="text-sm font-medium text-gray-700">Navegación:</span>
            </div>
            
            {/* Slider de navegación temporal - Alineado con el timeline */}
            <div className="flex items-center space-x-4 flex-1 min-w-[630px] max-w-[787px]">
              <Slider
                value={[timelineOffset]}
                onValueChange={(value) => setTimelineOffset(value[0])}
                min={-24}
                max={24}
                step={1}
                className="flex-1"
              />
              <Button
                onClick={() => setTimelineOffset(0)}
                variant="outline"
                size="sm"
                className="h-8 px-3"
              >
                Hoy
              </Button>
            </div>
            
            {/* Botones de rango de meses - Extremo derecho */}
            <div className="flex items-center space-x-4 ml-auto">
              <span className="text-sm font-medium text-gray-700">Rango:</span>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setVisibleMonthsRange(6)}
                  variant={visibleMonthsRange === 6 ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-3"
                >
                  6 meses
                </Button>
                <Button
                  onClick={() => setVisibleMonthsRange(12)}
                  variant={visibleMonthsRange === 12 ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-3"
                >
                  12 meses
                </Button>
                <Button
                  onClick={() => setVisibleMonthsRange(18)}
                  variant={visibleMonthsRange === 18 ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-3"
                >
                  18 meses
                </Button>
                <Button
                  onClick={() => setVisibleMonthsRange(24)}
                  variant={visibleMonthsRange === 24 ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-3"
                >
                  24 meses
                </Button>
              </div>
            </div>
          </div>
        </div>

        
      </div>


      {/* Popup simple para agregar tarea */}
      {showAddTask && (
        <div 
          className={`fixed ${
            showActivityPopup ? 'flex items-center justify-center inset-0 z-[60]' : 'z-50'
          }`}
          style={showActivityPopup ? {} : {
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`
          }}
        >
          <Card className={`w-96 shadow-2xl border-2 ${
            showActivityPopup ? 'ml-[380px]' : ''
          }`}>
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
                    setTaskForm({ name: '', description: '', startDate: '', endDate: '' });
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

                <div>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => handleTaskInputChange('description', e.target.value)}
                    placeholder="Descripción de la tarea (opcional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:border-gray-400 resize-none text-sm"
                    rows={3}
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
                      setTaskForm({ name: '', description: '', startDate: '', endDate: '' });
                    }}
                    size="sm"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateTask}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
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

      {/* Popup unificado de actividad */}
      {showActivityPopup && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
          onClick={() => {
            setShowActivityPopup(false);
            setSelectedActivityForPopup(null);
            setUnifiedActivityForm({ name: '', description: '' });
            setTempTasks([]);
          }}
        >
          <Card 
            className="w-[700px] max-h-[90vh] shadow-2xl border-2 mx-4 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {activityPopupMode === 'create' ? 'Crear Actividad' : 
                   activityPopupMode === 'edit' ? 'Editar Actividad' : 
                   'Información de Actividad'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowActivityPopup(false);
                    setSelectedActivityForPopup(null);
                    setUnifiedActivityForm({ name: '', description: '' });
                    setTempTasks([]);
                  }}
                  className="h-10 w-10 p-0 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-105"
                >
                  <span className="text-lg font-semibold text-gray-600 hover:text-gray-800">×</span>
                </Button>
              </div>
              
              <div className="space-y-4">
                {/* Formulario de nombre y descripción */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-gray-700">Nombre</h4>
                    {activityPopupMode !== 'view' && (
                      <span className={`text-xs ${unifiedActivityForm.name.length > 76 ? 'text-red-500' : unifiedActivityForm.name.length > 60 ? 'text-yellow-500' : 'text-gray-400'}`}>
                        {unifiedActivityForm.name.length}/76
                      </span>
                    )}
                  </div>
                  {activityPopupMode === 'view' ? (
                    <p className="text-base text-gray-900 bg-gray-50 p-3 rounded-md">
                      {selectedActivityForPopup?.name}
                    </p>
                  ) : (
                  <Input
                      value={unifiedActivityForm.name}
                      onChange={(e) => handleUnifiedActivityInputChange('name', e.target.value)}
                    placeholder="Nombre de la actividad *"
                    className={`w-full ${unifiedActivityForm.name.length > 76 ? 'border-red-500 focus:border-red-500' : ''}`}
                    maxLength={76}
                    required
                  />
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Descripción</h4>
                  {activityPopupMode === 'view' ? (
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md whitespace-pre-wrap min-h-[60px]">
                      {selectedActivityForPopup?.description || 'Sin descripción'}
                    </p>
                  ) : (
                  <textarea
                      value={unifiedActivityForm.description}
                      onChange={(e) => handleUnifiedActivityInputChange('description', e.target.value)}
                    placeholder="Descripción (opcional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:border-gray-400 resize-none text-sm"
                    rows={5}
                  />
                  )}
                </div>

                {/* Período - siempre visible */}
                {(() => {
                  const activityRange = selectedActivityForPopup ? getActivityDateRange(selectedActivityForPopup) : null;
                  if (!activityRange && activityPopupMode === 'view') return null;

                  return (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Período</h4>
                      <div className="bg-gray-50 p-4 rounded-md">
                        {activityRange ? (
                          <PeriodTimeline 
                            startDate={activityRange.startDate}
                            endDate={activityRange.endDate}
                          />
                        ) : (
                          <div className="text-sm text-gray-500 italic text-center py-4">
                            {activityPopupMode === 'create' 
                              ? 'El período se calculará automáticamente basado en las tareas que agregues'
                              : 'Sin tareas definidas'
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Progreso - solo en modo view */}
                {activityPopupMode === 'view' && selectedActivityForPopup && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Progreso</h4>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Completado</span>
                        <span className="text-sm font-medium text-gray-900">
                          {getActivityProgress(selectedActivityForPopup)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getActivityProgress(selectedActivityForPopup)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tareas - siempre visible */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      Tareas {(() => {
                        if (activityPopupMode === 'view') {
                          return selectedActivityForPopup?.tasks ? `(${selectedActivityForPopup.tasks.length})` : '(0)';
                        } else if (activityPopupMode === 'edit') {
                          const existingTasks = selectedActivityForPopup?.tasks || [];
                          return `(${existingTasks.length + tempTasks.length})`;
                        } else {
                          return `(${tempTasks.length})`;
                        }
                      })()}
                    </h4>
                    {activityPopupMode !== 'view' && (
                      <Button
                        onClick={() => {
                          // Crear una actividad temporal para poder usar el popup de crear tarea
                          const tempActivity: Activity = selectedActivityForPopup || {
                            id: 'temp-activity',
                            name: unifiedActivityForm.name || 'Actividad temporal',
                            description: unifiedActivityForm.description || '',
                            progress: 0,
                            tasks: tempTasks,
                            project_id: selectedProject?.id || '',
                            color: '#3B82F6',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                          };
                          setSelectedActivity(tempActivity);
                          setShowAddTask(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar Tarea
                      </Button>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md max-h-40 overflow-y-auto">
                    {(() => {
                      let tasksToShow = [];
                      if (activityPopupMode === 'view') {
                        tasksToShow = selectedActivityForPopup?.tasks || [];
                      } else if (activityPopupMode === 'edit') {
                        // En modo editar, mostrar tareas existentes + tareas temporales
                        const existingTasks = selectedActivityForPopup?.tasks || [];
                        tasksToShow = [...existingTasks, ...tempTasks];
                      } else {
                        // En modo crear, solo tareas temporales
                        tasksToShow = tempTasks;
                      }
                      
                      return tasksToShow.length > 0 ? (
                        <div className="space-y-2">
                          {tasksToShow
                            .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                            .map((task, index) => (
                            <div key={task.id} className="flex items-start justify-between p-2 bg-white rounded border">
                              <div className="flex items-start space-x-2 flex-1 min-w-0">
                                <span className="text-xs text-gray-500">{index + 1}.</span>
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={async () => {
                                    if (task.id.startsWith('temp-')) {
                                      // Actualizar tarea temporal
                                      setTempTasks(prev => prev.map(t => 
                                        t.id === task.id ? { ...t, completed: !t.completed } : t
                                      ));
                                    } else {
                                      // Actualizar tarea existente en la base de datos
                                      handleToggleTaskCompletion(task.id);
                                      // Actualizar la actividad para reflejar el cambio
                                      if (selectedActivityForPopup) {
                                        const updatedActivity = {
                                          ...selectedActivityForPopup,
                                          tasks: selectedActivityForPopup.tasks?.map(t => 
                                            t.id === task.id ? { ...t, completed: !t.completed } : t
                                          ) || []
                                        };
                                        setSelectedActivityForPopup(updatedActivity);
                                      }
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className={`text-sm ${task.completed ? 'line-through text-gray-500' : 'text-gray-700'} break-words max-w-[200px]`}>
                                  {task.name}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                                <span className="text-xs text-gray-500">
                                  {formatDateForTooltip(task.start_date)} - {formatDateForTooltip(task.end_date)}
                                </span>
                                <div className={`w-2 h-2 rounded-full ${task.completed ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                                {activityPopupMode !== 'view' && (
                <Button
                  size="sm"
                                    variant="ghost"
                                    onClick={async () => {
                                      if (activityPopupMode === 'create') {
                                        setTempTasks(prev => prev.filter(t => t.id !== task.id));
                                      } else if (activityPopupMode === 'edit') {
                                        // En modo editar, eliminar tareas temporales o existentes
                                        if (task.id.startsWith('temp-')) {
                                          setTempTasks(prev => prev.filter(t => t.id !== task.id));
                                        } else {
                                          // Confirmar eliminación antes de proceder
                                          const confirmed = window.confirm('¿Estás seguro de que deseas eliminar esta tarea?');
                                          if (confirmed) {
                                            // Eliminar tarea existente de la base de datos
                                            handleDeleteTask(task.id);
                                            // Actualizar la actividad para reflejar el cambio
                                            if (selectedActivityForPopup) {
                                              const updatedActivity = {
                                                ...selectedActivityForPopup,
                                                tasks: selectedActivityForPopup.tasks?.filter(t => t.id !== task.id) || []
                                              };
                                              setSelectedActivityForPopup(updatedActivity);
                                            }
                                          }
                                        }
                                      } else {
                                        handleDeleteTask(task.id);
                                      }
                                    }}
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 className="h-3 w-3" />
                </Button>
                                )}
              </div>
                </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-500">
                            {activityPopupMode === 'create' 
                              ? 'Agrega al menos una tarea para crear la actividad'
                              : 'No hay tareas definidas'
                            }
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex justify-end space-x-2 pt-4">
                  {activityPopupMode === 'view' && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Cambiar al modo de edición
                        setActivityPopupMode('edit');
                        setUnifiedActivityForm({
                          name: selectedActivityForPopup?.name || '',
                          description: selectedActivityForPopup?.description || ''
                        });
                        setTempTasks([]);
                      }}
                      size="sm"
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (activityPopupMode === 'view') {
                        // Si está en modo vista, cerrar el popup completamente
                        setShowActivityPopup(false);
                        setSelectedActivityForPopup(null);
                        setUnifiedActivityForm({ name: '', description: '' });
                        setTempTasks([]);
                        setActivityPopupMode('view');
                      } else {
                        // Si está en modo edición, volver al modo vista
                        setActivityPopupMode('view');
                        setUnifiedActivityForm({ name: '', description: '' });
                        setTempTasks([]);
                      }
                    }}
                    size="sm"
                  >
                    {activityPopupMode === 'view' ? 'Cerrar' : 'Cancelar'}
                  </Button>
                  
                  {activityPopupMode !== 'view' && (
                  <Button
                      onClick={handleUnifiedActivityAction}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                      {activityPopupMode === 'create' ? 'Crear Actividad' : 'Guardar Cambios'}
                  </Button>
                  )}
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



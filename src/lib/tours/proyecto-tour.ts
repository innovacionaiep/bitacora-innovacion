import type { DriveStep } from 'driver.js';
import {
  BITACORA_TOUR_BUTTONS,
  BITACORA_TOUR_POPOVER_CLASS,
} from '@/lib/tours/tour-shared';

export const PROYECTO_TOUR_POPOVER_CLASS = BITACORA_TOUR_POPOVER_CLASS;
export const PROYECTO_TOUR_BUTTONS = BITACORA_TOUR_BUTTONS;

/** Tabs del detalle de proyecto que tienen tour (sin Resumen). */
export type ProyectoTourTab =
  | 'Convenio'
  | 'General'
  | 'Participantes'
  | 'Gantt'
  | 'Indicadores'
  | 'Presupuesto'
  | 'Seguimiento'
  | 'Historial';

function step(
  element: string,
  title: string,
  description: string,
  options?: {
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
  }
): DriveStep {
  return {
    element,
    popover: {
      title,
      description,
      side: options?.side ?? 'bottom',
      align: options?.align ?? 'start',
    },
  };
}

const TABS_NAV_STEP = step(
  '[data-tour="proyecto-tabs-nav"]',
  'Secciones del proyecto',
  'Estas pestañas cambian de sección. El tutorial explica la que tienes abierta ahora; cambia de tab y pulsa Tutorial de nuevo para ver otra.'
);

const STEPS_BY_TAB: Record<ProyectoTourTab, DriveStep[]> = {
  Convenio: [
    TABS_NAV_STEP,
    step(
      '#tour-convenio-intro',
      'Convenio',
      'Aquí gestionas el convenio del proyecto: formato descargable y el documento firmado cuando corresponda.'
    ),
    step(
      '#tour-convenio-formato',
      'Formato',
      'Descarga la plantilla o formato oficial del convenio para completar y firmar fuera de la plataforma.'
    ),
    step(
      '#tour-convenio-documento',
      'Documento firmado',
      'Estado del convenio (firmado o pendiente). Cuando esté cargado, verás el documento y su estado aquí.'
    ),
    step(
      '#tour-convenio-acciones',
      'Acciones',
      'Visualiza, descarga, reemplaza o elimina el documento firmado; si aún no hay uno, sube el archivo desde aquí.'
    ),
    step(
      '[data-tour="proyecto-tab-Convenio"]',
      'Tab Convenio',
      'Si el convenio está pendiente, el tab puede resaltarse para recordarte completar esta sección.'
    ),
  ],
  General: [
    TABS_NAV_STEP,
    step(
      '#tour-general-meta-linea',
      'Datos del proyecto',
      'Línea bajo el título con fondo, línea, sede, escuela, foco y otros datos clave de la ficha. Puedes editarlos desde aquí si tienes permisos.'
    ),
    step(
      '#tour-general-indice',
      'Índice',
      'Panel de navegación a cada bloque del contenido (objetivo general, objetivos específicos, video y secciones técnicas).'
    ),
    step(
      '#tour-general-objetivo',
      'Objetivo general',
      'Describe el propósito central del proyecto. Puedes editarlo si tienes permisos.'
    ),
    step(
      '#tour-general-oes',
      'Objetivos específicos',
      'Desglose de resultados esperados. Suelen alimentar indicadores y el seguimiento del avance.'
    ),
    step(
      '#tour-general-video',
      'Video',
      'Enlace o video de presentación del proyecto para compartir el contexto con el equipo.'
    ),
    step(
      '#tour-general-meta-rail',
      'Información del proyecto',
      'Panel derecho con socios, sedes, escuelas, carreras y otros datos de clasificación del proyecto.'
    ),
  ],
  Participantes: [
    TABS_NAV_STEP,
    step(
      '#tour-participantes-conteos',
      'Resumen por rol',
      'Conteo rápido de encargados, coordinadores, colaboradores, docentes, estudiantes, beneficiarios y socios.'
    ),
    step(
      '#tour-participantes-toolbar',
      'Herramientas',
      'Edita socios, exporta el listado o carga participantes de forma masiva según tus permisos.'
    ),
    step(
      '#tour-participantes-tabla',
      'Tabla de participantes',
      'Listado completo con filtros por columna. Aquí ves el rol de cada persona en este proyecto.'
    ),
    step(
      '#tour-participantes-agregar',
      'Agregar participante',
      'Añade una persona al proyecto y asígnale un rol de participación (distinto de los roles de tu cuenta).'
    ),
    step(
      '#tour-participantes-conteos',
      'Roles en el proyecto',
      'El rol en cada proyecto define qué puedes hacer aquí (compromisos, presupuesto, etc.), aparte de los roles habilitados de tu cuenta.'
    ),
  ],
  Gantt: [
    TABS_NAV_STEP,
    step(
      '#tour-gantt-vista-toggle',
      'Vista Gantt / Kanban',
      'Cambia entre línea de tiempo (Gantt) y tablero Kanban según cómo prefieras planificar las actividades.'
    ),
    step(
      '#tour-gantt-progreso',
      'Progreso del proyecto',
      'Porcentaje de avance calculado a partir del estado de las actividades.'
    ),
    step(
      '#tour-gantt-board',
      'Actividades',
      'Timeline o columnas con las actividades y tareas. Expande filas para ver el detalle.'
    ),
    step(
      '#tour-gantt-agregar',
      'Agregar actividad',
      'Crea una nueva actividad en el plan. Completa fechas, responsables y evidencias según corresponda.'
    ),
    step(
      '#tour-gantt-footer',
      'Controles y carga masiva',
      'Ajusta el zoom/rango del timeline y, si tienes permiso, importa actividades en lote.'
    ),
    step(
      '#tour-gantt-fullscreen',
      'Pantalla completa',
      'Amplía el tablero para trabajar con más espacio; vuelve a salir con el mismo botón.'
    ),
  ],
  Indicadores: [
    TABS_NAV_STEP,
    step(
      '#tour-indicadores-og',
      'Objetivo general',
      'Cabecera con el objetivo general y su progreso agregado a partir de los indicadores.'
    ),
    step(
      '#tour-indicadores-lista',
      'Objetivos e indicadores',
      'Lista de objetivos específicos y sus indicadores de medición con avance.'
    ),
    step(
      '#tour-indicadores-agregar-oe',
      'Agregar objetivo específico',
      'Crea un nuevo objetivo específico cuando aún no hay ninguno o desde las acciones del panel.'
    ),
    step(
      '#tour-indicadores-agregar-ind',
      'Agregar indicador',
      'En cada objetivo específico puedes añadir indicadores (meta, unidad, avance).'
    ),
    step(
      '#tour-indicadores-carga',
      'Carga masiva',
      'Importa varios indicadores de una vez si tu rol lo permite.'
    ),
    step(
      '#tour-indicadores-lista',
      'Lectura de avance',
      'Revisa el porcentaje o valor actual frente a la meta para saber qué indicadores van al día.'
    ),
  ],
  Presupuesto: [
    TABS_NAV_STEP,
    step(
      '#tour-presupuesto-chips',
      'Resumen financiero',
      'Saldo disponible, presupuesto adjudicado y progreso de ejecución de un vistazo.'
    ),
    step(
      '#tour-presupuesto-cuentas',
      'Resumen por cuenta',
      'Distribución del presupuesto por cuentas o categorías para ver dónde está el gasto.'
    ),
    step(
      '#tour-presupuesto-tabla',
      'Líneas de presupuesto',
      'Detalle de ítems, montos y gastos asociados. Desde aquí abres el detalle de cada línea.'
    ),
    step(
      '#tour-presupuesto-agregar',
      'Agregar línea',
      'Crea una nueva línea de gasto o ítem presupuestario.'
    ),
    step(
      '#tour-presupuesto-gasto',
      'Registrar / ver gasto',
      'Consulta o registra gastos sobre una línea (comprobantes, montos y fechas).'
    ),
    step(
      '#tour-presupuesto-carga',
      'Carga masiva',
      'Importa varias líneas de presupuesto de una vez cuando esté habilitado.'
    ),
    step(
      '#tour-presupuesto-fullscreen',
      'Pantalla completa',
      'Amplía la vista de presupuesto para trabajar cómodamente con tablas largas.'
    ),
  ],
  Seguimiento: [
    TABS_NAV_STEP,
    step(
      '#tour-seguimiento-compromisos',
      'Compromisos',
      'Muro de compromisos pendientes del proyecto. Aquí se acuerda y da seguimiento a lo acordado en reuniones.'
    ),
    step(
      '#tour-seguimiento-estados',
      'Estado del compromiso',
      'Marca como realizado (p. ej. encargado) y revisa el estado visual de cada post-it.'
    ),
    step(
      '#tour-seguimiento-reuniones',
      'Reuniones',
      'Historial de reuniones de seguimiento del proyecto: fechas, temas y compromisos derivados.'
    ),
    step(
      '#tour-seguimiento-agregar-reunion',
      'Agregar reunión',
      'Registra una nueva reunión de seguimiento y asocia compromisos si corresponde.'
    ),
    step(
      '#tour-seguimiento-compromisos',
      'Alertas del portal',
      'Los compromisos pendientes también pueden aparecer en Inicio (alertas), para no perderlos de vista.'
    ),
  ],
  Historial: [
    TABS_NAV_STEP,
    step(
      '#tour-historial-titulo',
      'Historial',
      'Registro de actualizaciones del proyecto: quién cambió qué y cuándo.'
    ),
    step(
      '#tour-historial-filtro-fechas',
      'Filtro por fechas',
      'Acota el historial a un rango de fechas para investigar un periodo concreto.'
    ),
    step(
      '#tour-historial-filtro-persona',
      'Filtro por persona',
      'Muestra solo cambios hechos por una persona del equipo.'
    ),
    step(
      '#tour-historial-filtro-tipo',
      'Filtro por acción',
      'Filtra por tipo de acción (creación, edición, etc.) para encontrar cambios específicos.'
    ),
    step(
      '#tour-historial-lista',
      'Entradas',
      'Lista cronológica de eventos. Úsala para auditar o retomar el hilo de cambios recientes.'
    ),
  ],
};

/**
 * Construye los pasos del tour del detalle de proyecto para el tab activo.
 * Los pasos cuya ancla no exista o no sea visible se filtran en runtime.
 */
export function buildProyectoTourSteps(tab: string): DriveStep[] {
  if (!(tab in STEPS_BY_TAB)) return [TABS_NAV_STEP];
  return STEPS_BY_TAB[tab as ProyectoTourTab];
}

import type { DriveStep } from 'driver.js';
import type { PermissionKey } from '@/lib/permissions/catalog';
import {
  BITACORA_TOUR_BUTTONS,
  BITACORA_TOUR_POPOVER_CLASS,
} from '@/lib/tours/tour-shared';

export const INICIO_TOUR_POPOVER_CLASS = BITACORA_TOUR_POPOVER_CLASS;
export const INICIO_TOUR_BUTTONS = BITACORA_TOUR_BUTTONS;

type NavTourItem = {
  tourId: string;
  viewKey: PermissionKey;
  title: string;
  description: string;
};

const SIDEBAR_TOUR_ITEMS: NavTourItem[] = [
  {
    tourId: 'nav-inicio',
    viewKey: 'view.inicio',
    title: 'Inicio',
    description:
      'Tu portal personal: resume todos los proyectos en los que participas, alertas y compromisos.',
  },
  {
    tourId: 'nav-dashboard',
    viewKey: 'view.dashboard',
    title: 'Dashboard',
    description:
      'Vista agregada de indicadores y avances para seguir el estado general de los proyectos.',
  },
  {
    tourId: 'nav-fondos',
    viewKey: 'view.fondos',
    title: 'Fondos',
    description:
      'Gestión a nivel de fondos: catálogo, herramientas masivas y operación transversal.',
  },
  {
    tourId: 'nav-proyectos',
    viewKey: 'view.proyectos',
    title: 'Proyectos',
    description:
      'Listado de proyectos: busca, filtra y entra al detalle de cada uno.',
  },
  {
    tourId: 'nav-reportes',
    viewKey: 'view.reportes',
    title: 'Reportes',
    description:
      'Reportes del sistema para consultar y exportar información consolidada.',
  },
  {
    tourId: 'nav-ajustes',
    viewKey: 'view.ajustes',
    title: 'Ajustes',
    description:
      'Configuración de la plataforma: usuarios, roles, permisos y catálogos.',
  },
];

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

/**
 * Construye los pasos del tour de Inicio.
 * Los ítems del sidebar solo se incluyen si `can(viewKey)` es true.
 */
export function buildInicioTourSteps(
  can: (key: PermissionKey) => boolean
): DriveStep[] {
  const steps: DriveStep[] = [];

  for (const item of SIDEBAR_TOUR_ITEMS) {
    if (!can(item.viewKey)) continue;
    steps.push(
      step(`[data-tour="${item.tourId}"]`, item.title, item.description)
    );
  }

  steps.push(
    step(
      '#tour-roles-habilitados',
      'Roles habilitados',
      'Son los roles asignados a tu cuenta. Definen qué secciones y acciones puedes usar en la plataforma (menú, ajustes, reportes, etc.). Si necesitas otro rol, solicítalo a un administrador.'
    ),
    step(
      '#tour-mis-proyectos',
      'Mis proyectos',
      'Todos los proyectos en los que participas, con tu rol en cada uno. Desde aquí entras al detalle o creas uno nuevo.'
    ),
    step(
      '#tour-historial',
      'Historial reciente',
      'Últimas acciones relevantes en tus proyectos para retomar el hilo rápido.'
    ),
    step(
      '#tour-alertas',
      'Alertas y compromisos',
      'Pendientes de todos tus proyectos: evidencias, presupuesto, atrasos y compromisos (según tu rol en cada uno).'
    ),
    step(
      '#tour-chat-soporte',
      'Chat de soporte',
      'Botón flotante para escribir al equipo de soporte si tienes dudas o problemas con la plataforma. Te responden por este mismo chat.',
      { side: 'left', align: 'end' }
    )
  );

  return steps;
}

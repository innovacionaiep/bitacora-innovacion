'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requirePermission, requireSession } from '@/lib/authz/guards';
import {
  LINEA_TAB_FIELD,
  flagsToOptionalTabs,
  isOptionalProjectTab,
  type LineaModuloCatalogItem,
  type LineaTabFlags,
  type OptionalProjectTab,
} from '@/lib/linea-modulos';

const CONFIG_PATH = '/configuracion/lineas';

const LINEA_TAB_SELECT = {
  tabConvenioEnabled: true,
  tabParticipantesEnabled: true,
  tabActividadesEnabled: true,
  tabIndicadoresEnabled: true,
  tabPresupuestoEnabled: true,
  tabSeguimientoEnabled: true,
  tabEscalamientoEnabled: true,
} as const;

function toFlags(row: LineaTabFlags): LineaTabFlags {
  return {
    tabConvenioEnabled: row.tabConvenioEnabled,
    tabParticipantesEnabled: row.tabParticipantesEnabled,
    tabActividadesEnabled: row.tabActividadesEnabled,
    tabIndicadoresEnabled: row.tabIndicadoresEnabled,
    tabPresupuestoEnabled: row.tabPresupuestoEnabled,
    tabSeguimientoEnabled: row.tabSeguimientoEnabled,
    tabEscalamientoEnabled: row.tabEscalamientoEnabled,
  };
}

export type LineasModulosMatrixLinea = {
  id: string;
  nombre: string;
  orden: number;
  tabs: Record<OptionalProjectTab, boolean>;
};

export type LineasModulosMatrixFondo = {
  id: string;
  nombre: string;
  orden: number;
  lineas: LineasModulosMatrixLinea[];
};

export type LineasModulosMatrixDtSub = {
  id: string;
  nombre: string;
  orden: number;
  excludedLineaIds: string[];
};

export type LineasModulosMatrixDtCat = {
  id: string;
  nombre: string;
  orden: number;
  subcategorias: LineasModulosMatrixDtSub[];
};

export type LineasModulosMatrix = {
  fondos: LineasModulosMatrixFondo[];
  dtCategorias: LineasModulosMatrixDtCat[];
};

export async function getLineasTabsCatalog(): Promise<{
  success: boolean;
  data: LineaModuloCatalogItem[];
  error?: string;
}> {
  const gate = await requireSession();
  if (!gate.ok) {
    return { success: false, data: [], error: gate.error };
  }
  try {
    const lineas = await prisma.linea.findMany({
      select: {
        id: true,
        nombre: true,
        fondo: { select: { nombre: true } },
        ...LINEA_TAB_SELECT,
      },
    });
    return {
      success: true,
      data: lineas.map((l) => ({
        id: l.id,
        nombre: l.nombre,
        fondoNombre: l.fondo.nombre,
        ...toFlags(l),
      })),
    };
  } catch (e) {
    console.error('[getLineasTabsCatalog]', e);
    return { success: false, data: [], error: 'Error al cargar líneas' };
  }
}

export async function getLineasModulosMatrix(): Promise<{
  success: boolean;
  data: LineasModulosMatrix;
  error?: string;
}> {
  const empty: LineasModulosMatrix = { fondos: [], dtCategorias: [] };
  const gate = await requirePermission('view.ajustes');
  if (!gate.ok) {
    return { success: false, data: empty, error: gate.error };
  }
  try {
    const [fondos, dtCategorias] = await Promise.all([
      prisma.fondo.findMany({
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        select: {
          id: true,
          nombre: true,
          orden: true,
          lineas: {
            orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
            select: {
              id: true,
              nombre: true,
              orden: true,
              ...LINEA_TAB_SELECT,
            },
          },
        },
      }),
      prisma.desarrolloTecnicoCategoria.findMany({
        orderBy: { orden: 'asc' },
        select: {
          id: true,
          nombre: true,
          orden: true,
          subcategorias: {
            orderBy: { orden: 'asc' },
            select: {
              id: true,
              nombre: true,
              orden: true,
              lineasExcluidas: { select: { lineaId: true } },
            },
          },
        },
      }),
    ]);
    return {
      success: true,
      data: {
        fondos: fondos.map((f) => ({
          id: f.id,
          nombre: f.nombre,
          orden: f.orden,
          lineas: f.lineas.map((l) => ({
            id: l.id,
            nombre: l.nombre,
            orden: l.orden,
            tabs: flagsToOptionalTabs(l),
          })),
        })),
        dtCategorias: dtCategorias.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          orden: c.orden,
          subcategorias: c.subcategorias.map((s) => ({
            id: s.id,
            nombre: s.nombre,
            orden: s.orden,
            excludedLineaIds: s.lineasExcluidas.map((e) => e.lineaId),
          })),
        })),
      },
    };
  } catch (e) {
    console.error('[getLineasModulosMatrix]', e);
    return {
      success: false,
      data: empty,
      error: 'Error al cargar la matriz',
    };
  }
}

export async function setLineaTabEnabled(
  lineaId: string,
  tabKey: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const gate = await requirePermission('view.ajustes');
  if (!gate.ok) return { success: false, error: gate.error };

  if (!lineaId.trim() || !isOptionalProjectTab(tabKey)) {
    return { success: false, error: 'Datos incompletos' };
  }

  try {
    const linea = await prisma.linea.findUnique({
      where: { id: lineaId },
      select: { id: true },
    });
    if (!linea) return { success: false, error: 'Línea no encontrada' };

    await prisma.linea.update({
      where: { id: lineaId },
      data: { [LINEA_TAB_FIELD[tabKey]]: enabled },
    });

    revalidatePath(CONFIG_PATH);
    revalidatePath('/configuracion/convenios');
    revalidatePath('/configuracion/escalamiento');
    revalidatePath('/proyectos');
    revalidatePath('/dashboard');
    revalidatePath('/fondos');
    return { success: true };
  } catch (e) {
    console.error('[setLineaTabEnabled]', e);
    return { success: false, error: 'Error al actualizar' };
  }
}

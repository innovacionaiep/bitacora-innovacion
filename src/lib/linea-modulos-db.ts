import prisma from '@/lib/prisma';
import type { LineaTabFlags } from '@/lib/linea-modulos';

const LINEA_TAB_SELECT = {
  tabConvenioEnabled: true,
  tabParticipantesEnabled: true,
  tabActividadesEnabled: true,
  tabIndicadoresEnabled: true,
  tabPresupuestoEnabled: true,
  tabSeguimientoEnabled: true,
  tabEscalamientoEnabled: true,
} as const;

export async function getLineaTabFlagsForProyecto(
  fondoNombre: string,
  lineaNombre: string | null | undefined
): Promise<LineaTabFlags | null> {
  const fondo = fondoNombre?.trim();
  const linea = lineaNombre?.trim();
  if (!fondo || !linea) return null;
  const row = await prisma.linea.findFirst({
    where: { nombre: linea, fondo: { nombre: fondo } },
    select: LINEA_TAB_SELECT,
  });
  if (!row) return null;
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

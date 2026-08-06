'use server';

import { getProyecto } from '@/lib/actions/proyectos';
import { getIndicadoresByProyecto } from '@/lib/actions/indicadores';
import { getHistorialProyecto } from '@/lib/actions/historial';
import { getActivities } from '@/lib/actions/gantt';
import { getResumenPresupuestoProyecto } from '@/lib/actions/presupuesto';
import {
  getCompromisosProyecto,
} from '@/lib/actions/seguimiento';
import { sendEmail } from '@/lib/actions/email';
import {
  buildHtmlReporteResumen,
  getReporteResumenInlineAttachments,
  type DatosResumenProyecto,
} from '@/lib/utils/reporte-email';
import { requireProjectAccess } from '@/lib/authz/guards';

const HISTORIAL_LIMIT = 10;

/**
 * Obtiene todos los datos del tab Resumen del proyecto (mismo contenido que la página).
 */
export async function getDatosResumenProyecto(proyectoId: string): Promise<{
  success: boolean;
  data?: DatosResumenProyecto;
  error?: string;
}> {
  const [
    proyectoResult,
    indicadoresResult,
    historialResult,
    activitiesResult,
    resumenPresupuestoResult,
    compromisosResult,
  ] = await Promise.all([
    getProyecto(proyectoId, {
      includeActivities: false,
      includeParticipantes: true,
    }),
    getIndicadoresByProyecto(proyectoId),
    getHistorialProyecto(proyectoId, undefined, HISTORIAL_LIMIT),
    getActivities(proyectoId),
    getResumenPresupuestoProyecto(proyectoId),
    getCompromisosProyecto(proyectoId),
  ]);

  if (!proyectoResult.success || !proyectoResult.data) {
    return {
      success: false,
      error: proyectoResult.error ?? 'Proyecto no encontrado',
    };
  }
  if (!indicadoresResult.success || !indicadoresResult.data) {
    return {
      success: false,
      error: indicadoresResult.error ?? 'Error al cargar indicadores',
    };
  }
  if (!historialResult.success || !historialResult.data) {
    return {
      success: false,
      error: historialResult.error ?? 'Error al cargar historial',
    };
  }
  if (!activitiesResult.success || !activitiesResult.data) {
    return {
      success: false,
      error: activitiesResult.error ?? 'Error al cargar actividades',
    };
  }
  if (!resumenPresupuestoResult.success || !resumenPresupuestoResult.data) {
    return {
      success: false,
      error:
        resumenPresupuestoResult.error ?? 'Error al cargar resumen presupuesto',
    };
  }

  const compromisos =
    compromisosResult.success && compromisosResult.data
      ? compromisosResult.data
      : [];

  const activities = activitiesResult.data.map((act) => ({
    id: act.id,
    name: act.name,
    progress: act.progress,
    status: act.status,
    tasks: (act.tasks ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      endDate: t.endDate,
      completed: t.completed,
    })),
  }));

  return {
    success: true,
    data: {
      proyecto: proyectoResult.data,
      indicadores: indicadoresResult.data,
      historial: historialResult.data,
      activities,
      resumenPresupuesto: resumenPresupuestoResult.data,
      compromisos: compromisos.map((c) => ({
        id: c.id,
        titulo: c.titulo ?? null,
        descripcion: c.descripcion ?? null,
        completado: c.completado ?? false,
      })),
    },
  };
}

/**
 * Genera el HTML del reporte (contenido del tab Resumen), envía el correo y retorna el resultado.
 */
export async function sendReporteProyecto(
  proyectoId: string,
  to: string,
  subject?: string
): Promise<{ success: boolean; error?: string }> {
  const gate = await requireProjectAccess(proyectoId, 'view.proyectos');
  if (!gate.ok) return { success: false, error: gate.error };

  const trimmedTo = to.trim();
  if (!trimmedTo) {
    return { success: false, error: 'Indica al menos un destinatario.' };
  }

  const datosResult = await getDatosResumenProyecto(proyectoId);
  if (!datosResult.success || !datosResult.data) {
    return {
      success: false,
      error: datosResult.error ?? 'Error al cargar datos del proyecto.',
    };
  }

  const attachments = await getReporteResumenInlineAttachments();
  const html = buildHtmlReporteResumen(datosResult.data, { useCid: true });
  const finalSubject =
    subject?.trim() || `Reporte: ${datosResult.data.proyecto.proyecto}`;

  return sendEmail({
    to: trimmedTo,
    html,
    subject: finalSubject,
    attachments,
  });
}

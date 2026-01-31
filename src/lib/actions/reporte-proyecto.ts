'use server';

import { getProyecto } from '@/lib/actions/proyectos';
import { getIndicadoresByProyecto } from '@/lib/actions/indicadores';
import { getHistorialProyecto } from '@/lib/actions/historial';
import { sendEmail } from '@/lib/actions/email';
import { buildHtmlReporteProyecto, type DatosReporteProyecto } from '@/lib/utils/reporte-email';

const HISTORIAL_LIMIT = 20;

/**
 * Obtiene todos los datos necesarios para el reporte de un proyecto.
 */
export async function getDatosReporteProyecto(
  proyectoId: string
): Promise<{ success: boolean; data?: DatosReporteProyecto; error?: string }> {
  const [proyectoResult, indicadoresResult, historialResult] = await Promise.all([
    getProyecto(proyectoId),
    getIndicadoresByProyecto(proyectoId),
    getHistorialProyecto(proyectoId),
  ]);

  if (!proyectoResult.success || !proyectoResult.data) {
    return { success: false, error: proyectoResult.error ?? 'Proyecto no encontrado' };
  }
  if (!indicadoresResult.success || !indicadoresResult.data) {
    return { success: false, error: indicadoresResult.error ?? 'Error al cargar indicadores' };
  }
  if (!historialResult.success || !historialResult.data) {
    return { success: false, error: historialResult.error ?? 'Error al cargar historial' };
  }

  const historial = historialResult.data.slice(0, HISTORIAL_LIMIT);

  return {
    success: true,
    data: {
      proyecto: proyectoResult.data,
      indicadores: indicadoresResult.data,
      historial,
    },
  };
}

/**
 * Genera el HTML del reporte, envía el correo y retorna el resultado.
 */
export async function sendReporteProyecto(
  proyectoId: string,
  to: string,
  subject?: string
): Promise<{ success: boolean; error?: string }> {
  const trimmedTo = to.trim();
  if (!trimmedTo) {
    return { success: false, error: 'Indica al menos un destinatario.' };
  }

  const datosResult = await getDatosReporteProyecto(proyectoId);
  if (!datosResult.success || !datosResult.data) {
    return { success: false, error: datosResult.error ?? 'Error al cargar datos del proyecto.' };
  }

  const html = buildHtmlReporteProyecto(datosResult.data);
  const finalSubject = subject?.trim() || `Reporte: ${datosResult.data.proyecto.proyecto}`;

  return sendEmail({
    to: trimmedTo,
    html,
    subject: finalSubject,
  });
}

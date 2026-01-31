import type { ProyectoWithRelations } from '@/types/proyecto';
import type { IndicadoresProyectoData } from '@/lib/actions/indicadores';

/** Datos agregados para construir el HTML del reporte */
export type DatosReporteProyecto = {
  proyecto: ProyectoWithRelations;
  indicadores: IndicadoresProyectoData;
  historial: Array<{
    id: string;
    accion: string;
    tabProyecto: string;
    elementoEspecifico: string;
    cambioGenerado: string;
    fecha: Date;
    user: { id: string; name: string | null; email: string; image: string | null };
  }>;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function progressBarHtml(label: string, percent: number, barColor: string): string {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  return `
    <div style="margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; color: #374151;">
        <span style="font-weight: 500;">${escapeHtml(label)}</span>
        <span style="font-weight: 700; color: #111;">${pct}%</span>
      </div>
      <div style="width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
        <div style="width: ${pct}%; height: 100%; background: ${barColor}; border-radius: 4px;"></div>
      </div>
    </div>`;
}

/**
 * Construye el HTML del correo del reporte (estilos inline para clientes de email).
 */
export function buildHtmlReporteProyecto(datos: DatosReporteProyecto): string {
  const { proyecto, indicadores, historial } = datos;

  const presupuestoPct =
    proyecto.presupuestoTotal > 0
      ? Math.round((proyecto.presupuestoUsado / proyecto.presupuestoTotal) * 100)
      : 0;
  const avanceIndicadores = indicadores.progresoGeneral ?? proyecto.objetivos ?? 0;

  const activities = proyecto.activities ?? [];
  const pendientes: Array<{ actividad: string; tarea?: string; estado: string }> = [];
  activities.forEach((act) => {
    const statusLabel =
      act.status === 'DONE'
        ? 'Completada'
        : act.status === 'IN_PROGRESS'
          ? 'En progreso'
          : act.status === 'WAITING'
            ? 'En espera'
            : 'Pendiente';
    if (act.status !== 'DONE') {
      pendientes.push({
        actividad: act.name,
        estado: statusLabel,
      });
    }
    (act.tasks ?? []).forEach((task) => {
      if (!task.completed) {
        pendientes.push({
          actividad: act.name,
          tarea: task.name,
          estado: 'Tarea pendiente',
        });
      }
    });
  });

  const sectionStyle =
    'margin: 0 0 24px 0; padding: 16px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #10b981;';
  const h2Style =
    'font-size: 16px; font-weight: 700; color: #065f46; margin: 0 0 12px 0;';
  const tableStyle =
    'width: 100%; border-collapse: collapse; font-size: 13px; color: #374151;';
  const thStyle =
    'text-align: left; padding: 8px 12px; background: #e5e7eb; font-weight: 600; border: 1px solid #d1d5db;';
  const tdStyle = 'padding: 8px 12px; border: 1px solid #e5e7eb;';

  let html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Reporte de proyecto</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 24px; color: #111; max-width: 640px;">
  <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #10b981;">
    <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 8px 0; color: #065f46;">Reporte de proyecto</h1>
    <p style="font-size: 18px; font-weight: 600; margin: 0 0 4px 0;">${escapeHtml(proyecto.proyecto)}</p>
    <p style="font-size: 12px; color: #6b7280; margin: 0;">Generado el ${formatDate(new Date())}</p>
  </div>

  <div style="${sectionStyle}">
    <h2 style="${h2Style}">Avances generales</h2>
    ${progressBarHtml('Avance Gantt', proyecto.avanceGantt, '#10b981')}
    ${progressBarHtml('Avance indicadores', avanceIndicadores, '#3b82f6')}
    ${progressBarHtml('Presupuesto', presupuestoPct, '#f97316')}
    <p style="font-size: 11px; color: #6b7280; margin: 8px 0 0 0;">
      Presupuesto: $${proyecto.presupuestoUsado.toLocaleString('es-CL')} / $${proyecto.presupuestoTotal.toLocaleString('es-CL')}
    </p>
  </div>

  <div style="${sectionStyle}">
    <h2 style="${h2Style}">Actividades y tareas</h2>
    <table style="${tableStyle}">
      <thead><tr>
        <th style="${thStyle}">Actividad</th>
        <th style="${thStyle}">Progreso</th>
        <th style="${thStyle}">Estado</th>
      </tr></thead>
      <tbody>
  `;
  activities.forEach((act) => {
    const statusLabel =
      act.status === 'DONE'
        ? 'Completada'
        : act.status === 'IN_PROGRESS'
          ? 'En progreso'
          : act.status === 'WAITING'
            ? 'En espera'
            : 'Pendiente';
    html += `
        <tr>
          <td style="${tdStyle}">${escapeHtml(act.name)}</td>
          <td style="${tdStyle}">${act.progress}%</td>
          <td style="${tdStyle}">${statusLabel}</td>
        </tr>`;
  });
  if (activities.length === 0) {
    html += `<tr><td colspan="3" style="${tdStyle}">Sin actividades registradas.</td></tr>`;
  }
  html += `
      </tbody>
    </table>
  `;

  if (pendientes.length > 0) {
    html += `
    <h3 style="font-size: 14px; font-weight: 600; margin: 16px 0 8px 0; color: #374151;">Pendientes</h3>
    <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
      ${pendientes
        .map(
          (p) =>
            `<li>${escapeHtml(p.actividad)}${p.tarea ? ` – ${escapeHtml(p.tarea)}` : ''} (${p.estado})</li>`
        )
        .join('')}
    </ul>
  `;
  }
  html += `</div>`;

  html += `
  <div style="${sectionStyle}">
    <h2 style="${h2Style}">Indicadores</h2>
    <p style="font-size: 13px; margin: 0 0 12px 0;">Progreso general: <strong>${Math.round(avanceIndicadores)}%</strong></p>
  `;
  indicadores.objetivosGenerales.forEach((og) => {
    og.objetivosEspecificos.forEach((oe) => {
      oe.indicadores.forEach((ind) => {
        html += `
    <div style="margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">
        <span style="font-weight: 500;">${escapeHtml(ind.nombre)}</span>
        <span>${escapeHtml(String(ind.resultadoAlcanzado))} / ${escapeHtml(String(ind.resultadoEsperado))} · ${Math.round(ind.porcentajeAvance)}%</span>
      </div>
      <div style="width: 100%; height: 6px; background: #e5e7eb; border-radius: 3px;">
        <div style="width: ${Math.min(100, Math.round(ind.porcentajeAvance))}%; height: 100%; background: #3b82f6; border-radius: 3px;"></div>
      </div>
    </div>`;
      });
    });
  });
  if (
    indicadores.objetivosGenerales.length === 0 ||
    indicadores.objetivosGenerales.every(
      (og) => !og.objetivosEspecificos.some((oe) => oe.indicadores.length > 0)
    )
  ) {
    html += `<p style="font-size: 13px; color: #6b7280;">Sin indicadores registrados.</p>`;
  }
  html += `</div>`;

  html += `
  <div style="${sectionStyle}">
    <h2 style="${h2Style}">Historial de cambios (últimas ${historial.length} entradas)</h2>
    <table style="${tableStyle}">
      <thead><tr>
        <th style="${thStyle}">Fecha</th>
        <th style="${thStyle}">Usuario</th>
        <th style="${thStyle}">Acción</th>
        <th style="${thStyle}">Sección</th>
        <th style="${thStyle}">Detalle</th>
      </tr></thead>
      <tbody>
  `;
  historial.forEach((h) => {
    const userLabel = h.user?.name || h.user?.email || '—';
    html += `
        <tr>
          <td style="${tdStyle}">${formatDate(h.fecha)}</td>
          <td style="${tdStyle}">${escapeHtml(userLabel)}</td>
          <td style="${tdStyle}">${escapeHtml(h.accion)}</td>
          <td style="${tdStyle}">${escapeHtml(h.tabProyecto)}</td>
          <td style="${tdStyle}">${escapeHtml(h.elementoEspecifico)}${h.cambioGenerado ? ': ' + escapeHtml(h.cambioGenerado) : ''}</td>
        </tr>`;
  });
  if (historial.length === 0) {
    html += `<tr><td colspan="5" style="${tdStyle}">Sin registros en el historial.</td></tr>`;
  }
  html += `
      </tbody>
    </table>
  </div>

  <p style="font-size: 11px; color: #9ca3af; margin: 24px 0 0 0;">Reporte generado por Bitácora – Gestor de Proyectos</p>
</body>
</html>`;

  return html;
}

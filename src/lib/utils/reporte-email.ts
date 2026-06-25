import type { ProyectoWithRelations } from '@/types/proyecto';
import type { IndicadoresProyectoData } from '@/lib/actions/indicadores';
import type { ResumenPresupuesto } from '@/types/presupuesto';
import type { CuentaPresupuesto } from '@prisma/client';

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
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  }>;
};

/** Datos del tab Resumen para construir el reporte por correo (mismo contenido que la página) */
export type DatosResumenProyecto = {
  proyecto: ProyectoWithRelations;
  indicadores: IndicadoresProyectoData;
  historial: Array<{
    id: string;
    accion: string;
    tabProyecto: string;
    elementoEspecifico: string;
    cambioGenerado: string;
    fecha: Date;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  }>;
  activities: Array<{
    id: string;
    name: string;
    progress: number;
    status: string;
    tasks: Array<{
      id: string;
      name: string;
      endDate: Date | string;
      completed: boolean;
    }>;
  }>;
  resumenPresupuesto: ResumenPresupuesto;
  compromisos: Array<{
    id: string;
    titulo: string | null;
    descripcion: string | null;
    completado: boolean;
  }>;
};

const CUENTA_LABEL: Record<CuentaPresupuesto, string> = {
  RRHH: 'RRHH',
  OPERACION: 'Operación',
  INVERSION: 'Inversión',
};

const ACTIVITY_STATUS_LABEL: Record<string, string> = {
  TODO: 'Por hacer',
  WAITING: 'En espera',
  IN_PROGRESS: 'En proceso',
  DONE: 'Finalizada',
};

/** Color emerald-600 para iconos (igual que el tab Resumen) */
const ICON_COLOR = '#059669';

/**
 * Iconos Lucide como SVG inline (Outlook no los muestra; solo para clientes que soporten SVG).
 */
function iconSvg(
  name: string,
  sizePx: number,
  color: string = ICON_COLOR
): string {
  const content = LUCIDE_ICONS[name as keyof typeof LUCIDE_ICONS];
  if (!content) return '';
  const attrs = `xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  return `<svg ${attrs}>${content}</svg>`;
}

/** Content-ID para adjunto inline: sin guiones; "map-pin" usa cid alternativo (Outlook puede filtrar "map") */
function iconCid(name: string): string {
  if (name === 'map-pin') return 'iconsedes';
  return 'icon' + name.replace(/-/g, '');
}

/**
 * Icono como <img>. useCid: adjunto inline (Outlook); baseUrl: URL pública; si no, data URI.
 */
function iconImg(
  name: string,
  sizePx: number,
  baseUrl?: string,
  useCid?: boolean
): string {
  const content = LUCIDE_ICONS[name as keyof typeof LUCIDE_ICONS];
  if (!content) return '';
  const attrs = `width="${sizePx}" height="${sizePx}" alt="" style="vertical-align: middle; display: inline-block;"`;
  if (useCid) {
    return `<img src="cid:${iconCid(name)}" ${attrs} />`;
  }
  if (baseUrl && baseUrl.trim()) {
    const src = `${baseUrl.replace(/\/$/, '')}/email-icons/${name}.svg`;
    return `<img src="${src}" ${attrs} />`;
  }
  const svg = iconSvg(name, sizePx, ICON_COLOR);
  const base64 = Buffer.from(svg, 'utf-8').toString('base64');
  const src = `data:image/svg+xml;base64,${base64}`;
  return `<img src="${src}" ${attrs} />`;
}

/** Nombres de iconos usados en el reporte Resumen (mismo orden que LUCIDE_ICONS para cid) */
const REPORTE_ICON_NAMES = [
  'file-text',
  'chart-column',
  'dollar-sign',
  'target',
  'list-checks',
  'calendar',
  'list-todo',
  'history',
  'map-pin',
  'graduation-cap',
  'users',
  'crown',
  'crosshair',
] as const;

/**
 * Adjuntos inline (cid) para el reporte Resumen. Outlook bloquea SVG; usamos PNG para que se vean.
 */
export async function getReporteResumenInlineAttachments(): Promise<
  Array<{ filename: string; content: Buffer; cid: string }>
> {
  try {
    const sharp = (await import('sharp')).default;
    const result: Array<{ filename: string; content: Buffer; cid: string }> =
      [];
    for (const name of REPORTE_ICON_NAMES) {
      const svg = iconSvg(name, 24, ICON_COLOR);
      const png = await sharp(Buffer.from(svg, 'utf-8'))
        .resize(24, 24)
        .png()
        .toBuffer();
      result.push({
        filename: `${name}.png`,
        content: png,
        cid: iconCid(name),
      });
    }
    return result;
  } catch {
    return REPORTE_ICON_NAMES.map((name) => ({
      filename: `${name}.svg`,
      content: Buffer.from(iconSvg(name, 24, ICON_COLOR), 'utf-8'),
      cid: iconCid(name),
    }));
  }
}

const LUCIDE_ICONS: Record<string, string> = {
  'file-text':
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  'chart-column':
    '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  'dollar-sign':
    '<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  target:
    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  'list-checks':
    '<path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/>',
  calendar:
    '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  'list-todo':
    '<path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><rect x="3" y="4" width="6" height="6" rx="1"/>',
  history:
    '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  'map-pin':
    '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  'graduation-cap':
    '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  crown:
    '<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>',
  crosshair:
    '<circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/>',
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

function formatFechaCorta(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function progressBarHtml(
  label: string,
  percent: number,
  barColor: string
): string {
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

/** Barra de progreso al estilo del tab Resumen (SimpleBarChart): label arriba, barra + valor a la derecha */
function progressBarResumenHtml(
  label: string,
  value: number,
  barColor: string
): string {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-bottom: 12px;">
      <tr>
        <td style="font-size: 14px; color: #374151; font-weight: 500;">${escapeHtml(label)}</td>
      </tr>
      <tr>
        <td style="padding-top: 4px;">
          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
            <tr>
              <td style="vertical-align: middle; padding-right: 8px;">
                <div style="height: 16px; background: #d1d5db; border-radius: 9999px; overflow: hidden;">
                  <div style="height: 100%; width: ${pct}%; background: ${barColor}; border-radius: 9999px;"></div>
                </div>
              </td>
              <td style="vertical-align: middle; text-align: right; font-weight: 700; font-size: 14px; color: #111; white-space: nowrap;">${pct}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

/**
 * Construye el HTML del correo del reporte (estilos inline para clientes de email).
 */
export function buildHtmlReporteProyecto(datos: DatosReporteProyecto): string {
  const { proyecto, indicadores, historial } = datos;

  const presupuestoPct =
    proyecto.presupuestoTotal > 0
      ? Math.round(
          (proyecto.presupuestoUsado / proyecto.presupuestoTotal) * 100
        )
      : 0;
  const avanceIndicadores =
    indicadores.progresoGeneral ?? proyecto.objetivos ?? 0;

  const activities = proyecto.activities ?? [];
  const pendientes: Array<{
    actividad: string;
    tarea?: string;
    estado: string;
  }> = [];
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

/**
 * Construye el HTML del reporte igual al tab "Resumen" del proyecto (estilos inline para email).
 * baseUrl: URL pública de la app (ej. NEXTAUTH_URL) para que los iconos se carguen por URL en Outlook.
 */
export function buildHtmlReporteResumen(
  datos: DatosResumenProyecto,
  options?: { baseUrl?: string; useCid?: boolean }
): string {
  const {
    proyecto,
    indicadores,
    historial,
    activities,
    resumenPresupuesto,
    compromisos,
  } = datos;
  const baseUrl = options?.baseUrl?.trim() ?? '';
  const useCid = options?.useCid ?? false;

  const pctActividades =
    activities.length > 0
      ? Math.round(
          activities.reduce((s, a) => s + a.progress, 0) / activities.length
        )
      : 0;
  const pctIndicadores = indicadores.progresoGeneral ?? 0;
  const pctPresupuesto = resumenPresupuesto.pctGlobalAvance ?? 0;

  const objetivoGeneral = proyecto.objetivos_rel?.find(
    (obj) => obj.tipo === 'General'
  );
  const encargados =
    proyecto.participantes_rel?.filter((p) => p.rol === 'Encargado') ?? [];
  const coordinadores =
    proyecto.participantes_rel?.filter((p) => p.rol === 'Coordinador') ?? [];

  const indicadoresFlat: Array<{ nombre: string; resultadoAlcanzado: string }> =
    [];
  indicadores.objetivosGenerales.forEach((og) => {
    og.objetivosEspecificos.forEach((oe) => {
      oe.indicadores.forEach((ind) => {
        indicadoresFlat.push({
          nombre: ind.nombre,
          resultadoAlcanzado: ind.resultadoAlcanzado ?? '',
        });
      });
    });
  });

  const cardStyle =
    'margin: 0 0 24px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #fff; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05);';
  const cardHeaderStyle =
    'padding: 6px 12px; border-bottom: 1px solid #e5e7eb; background: #e5e7eb; font-weight: 600; color: #4b5563; font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em;';
  const cardContentStyle = 'padding: 12px 16px;';
  const subsectionLabelStyle =
    'font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px 0;';
  const tableStyle =
    'width: 100%; border-collapse: collapse; font-size: 13px; color: #374151; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;';
  const thStyle =
    'text-align: left; padding: 8px 12px; background: #f3f4f6; font-weight: 600; border: 1px solid #e5e7eb; font-size: 13px;';
  const tdStyle =
    'padding: 8px 12px; border: 1px solid #e5e7eb; font-size: 13px;';
  const tdStyleAlt = tdStyle + ' background: #f9fafb;';

  let html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Reporte de estado - Resumen</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 24px; color: #111827; background: #f9fafb; max-width: 640px;">
  <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #059669;">
    <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 8px 0; color: #065f46;">Reporte de estado</h1>
    <p style="font-size: 18px; font-weight: 600; margin: 0 0 4px 0; color: #111827;">${escapeHtml(proyecto.proyecto)}</p>
    <p style="font-size: 12px; color: #6b7280; margin: 0;">Contenido del tab Resumen · Generado el ${formatDate(new Date())}</p>
  </div>

  <div style="${cardStyle}">
    <div style="${cardHeaderStyle}"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 8px; vertical-align: middle;">${iconImg('file-text', 20, baseUrl, useCid)}</td><td style="vertical-align: middle;">Información General</td></tr></table></div>
    <div style="${cardContentStyle}">
  `;
  if (objetivoGeneral) {
    html += `
      <p style="${subsectionLabelStyle}">${iconImg('crosshair', 16, baseUrl, useCid)} Objetivo General</p>
      <div style="margin: 0 0 12px 0; padding: 8px 12px; background: #ecfdf5; border-left: 4px solid #059669; border-radius: 0 8px 8px 0;">
        <p style="font-size: 13px; margin: 0; color: #1f2937; line-height: 1.5;">${escapeHtml(objetivoGeneral.descripcion)}</p>
      </div>`;
  }
  html += `
      <p style="${subsectionLabelStyle}">${iconImg('map-pin', 16, baseUrl, useCid)} Sedes</p>
      <p style="margin: 0 0 12px 0;">`;
  if (proyecto.sede) {
    html += `<span style="display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${escapeHtml(proyecto.sede)}</span>`;
  } else {
    html += `<span style="font-size: 12px; color: #6b7280;">Sin sede</span>`;
  }
  html += `</p>
      <p style="${subsectionLabelStyle}">${iconImg('graduation-cap', 16, baseUrl, useCid)} Escuelas</p>
      <p style="margin: 0 0 12px 0;">`;
  if (proyecto.escuelas?.length) {
    proyecto.escuelas.forEach((e) => {
      html += `<span style="display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 6px; margin-bottom: 4px;">${escapeHtml(e.escuela.nombre)}</span>`;
    });
  } else {
    html += `<span style="font-size: 12px; color: #6b7280;">Sin escuelas asignadas</span>`;
  }
  html += `</p>
      <p style="${subsectionLabelStyle}">${iconImg('users', 16, baseUrl, useCid)} Encargados y coordinadores</p>`;
  encargados.forEach((p) => {
    const nombre = p.user?.name ?? p.nombre ?? 'Sin nombre';
    const cargo = p.cargo ?? '';
    html += `
      <div style="padding: 6px 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 6px;">
        <span style="vertical-align: middle;">${iconImg('crown', 14, baseUrl, useCid)}</span>
        <span style="font-size: 14px; color: #111827; font-weight: 500; margin-left: 6px;">${escapeHtml(nombre)}${cargo ? ' <span style="color: #6b7280; font-size: 12px;">· ' + escapeHtml(cargo) + '</span>' : ''}</span>
        <span style="display: inline-block; background: #ffedd5; color: #9a3412; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 8px;">Encargado</span>
      </div>`;
  });
  coordinadores.forEach((p) => {
    const nombre = p.user?.name ?? p.nombre ?? 'Sin nombre';
    const cargo = p.cargo ?? '';
    html += `
      <div style="padding: 6px 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 6px;">
        <span style="vertical-align: middle;">${iconImg('users', 14, baseUrl, useCid)}</span>
        <span style="font-size: 14px; color: #111827; font-weight: 500; margin-left: 6px;">${escapeHtml(nombre)}${cargo ? ' <span style="color: #6b7280; font-size: 12px;">· ' + escapeHtml(cargo) + '</span>' : ''}</span>
        <span style="display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 8px;">Coordinador</span>
      </div>`;
  });
  if (encargados.length === 0 && coordinadores.length === 0) {
    html += `<p style="font-size: 12px; color: #6b7280; margin: 0;">No hay encargados ni coordinadores</p>`;
  }
  html += `
    </div>
  </div>`;

  html += `
  <div style="${cardStyle}">
    <div style="${cardHeaderStyle}"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 8px; vertical-align: middle;">${iconImg('chart-column', 20, baseUrl, useCid)}</td><td style="vertical-align: middle;">Avances</td></tr></table></div>
    <div style="${cardContentStyle}">
    ${progressBarResumenHtml('Actividades', pctActividades, '#10b981')}
    ${progressBarResumenHtml('Indicadores', pctIndicadores, '#3b82f6')}
    ${progressBarResumenHtml('Presupuesto', pctPresupuesto, '#f59e0b')}
    </div>
  </div>`;

  html += `
  <div style="${cardStyle}">
    <div style="${cardHeaderStyle}"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 8px; vertical-align: middle;">${iconImg('dollar-sign', 20, baseUrl, useCid)}</td><td style="vertical-align: middle;">Presupuesto</td></tr></table></div>
    <div style="${cardContentStyle}">
    <table style="${tableStyle}">
      <thead><tr>
        <th style="${thStyle}">Cuenta</th>
        <th style="${thStyle}; text-align: right;">Monto</th>
        <th style="${thStyle}; text-align: right;">Solicitado</th>
        <th style="${thStyle}; text-align: right;">En pedido</th>
        <th style="${thStyle}; text-align: right;">Ejecutado</th>
      </tr></thead>
      <tbody>`;
  (resumenPresupuesto.porCuenta ?? []).forEach((row, idx) => {
    const label = CUENTA_LABEL[row.cuenta] ?? row.cuenta;
    const rowTd = idx % 2 === 1 ? tdStyleAlt : tdStyle;
    html += `
        <tr>
          <td style="${rowTd}">${escapeHtml(label)}</td>
          <td style="${rowTd}; text-align: right;">$${row.monto.toLocaleString('es-CL')}</td>
          <td style="${rowTd}; text-align: right;">$${row.montoSolicitado.toLocaleString('es-CL')}</td>
          <td style="${rowTd}; text-align: right;">$${row.montoEnPedido.toLocaleString('es-CL')}</td>
          <td style="${rowTd}; text-align: right;">$${row.montoEjecutado.toLocaleString('es-CL')}</td>
        </tr>`;
  });
  const presupuestoAdjudicado = proyecto.presupuestoAdjudicado ?? 0;
  if (presupuestoAdjudicado > 0) {
    html += `
        <tr style="background: #ecfdf5;">
          <td style="${tdStyle}; font-weight: 600;">Presupuesto adjudicado</td>
          <td style="${tdStyle}; text-align: right; font-weight: 600;">$${presupuestoAdjudicado.toLocaleString('es-CL')}</td>
          <td style="${tdStyle}; text-align: right; color: #9ca3af;">—</td>
          <td style="${tdStyle}; text-align: right; color: #9ca3af;">—</td>
          <td style="${tdStyle}; text-align: right; color: #9ca3af;">—</td>
        </tr>`;
  }
  html += `
        <tr style="background: #f3f4f6;">
          <td style="${tdStyle}; font-weight: 600;">TOTALES</td>
          <td style="${tdStyle}; text-align: right; font-weight: 600;">$${(resumenPresupuesto.totalMonto ?? 0).toLocaleString('es-CL')}</td>
          <td style="${tdStyle}; text-align: right; font-weight: 600;">$${(resumenPresupuesto.totalSolicitado ?? 0).toLocaleString('es-CL')}</td>
          <td style="${tdStyle}; text-align: right; font-weight: 600;">$${(resumenPresupuesto.totalEnPedido ?? 0).toLocaleString('es-CL')}</td>
          <td style="${tdStyle}; text-align: right; font-weight: 600;">$${(resumenPresupuesto.totalEjecutado ?? 0).toLocaleString('es-CL')}</td>
        </tr>
      </tbody>
    </table>
    </div>
  </div>`;

  html += `
  <div style="${cardStyle}">
    <div style="${cardHeaderStyle}"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 8px; vertical-align: middle;">${iconImg('target', 20, baseUrl, useCid)}</td><td style="vertical-align: middle;">Indicadores</td></tr></table></div>
    <div style="${cardContentStyle}">`;
  if (indicadoresFlat.length === 0) {
    html += `<p style="font-size: 13px; color: #6b7280; margin: 0;">No hay indicadores</p>`;
  } else {
    html += `
    <table style="${tableStyle}">
      <thead><tr>
        <th style="${thStyle}">Nombre indicador</th>
        <th style="${thStyle}">Resultado alcanzado</th>
      </tr></thead>
      <tbody>`;
    indicadoresFlat.forEach((ind, idx) => {
      const rowTd = idx % 2 === 1 ? tdStyleAlt : tdStyle;
      html += `
        <tr>
          <td style="${rowTd}">${escapeHtml(ind.nombre)}</td>
          <td style="${rowTd}">${escapeHtml(ind.resultadoAlcanzado.trim() ? ind.resultadoAlcanzado : 'Sin registrar')}</td>
        </tr>`;
    });
    html += `</tbody></table>`;
  }
  html += `
    </div>
  </div>`;

  html += `
  <div style="${cardStyle}">
    <div style="${cardHeaderStyle}"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 8px; vertical-align: middle;">${iconImg('list-checks', 20, baseUrl, useCid)}</td><td style="vertical-align: middle;">Actividades</td></tr></table></div>
    <div style="${cardContentStyle}">`;
  if (activities.length === 0) {
    html += `<p style="font-size: 13px; color: #6b7280; margin: 0;">No hay actividades</p>`;
  } else {
    activities.forEach((act) => {
      const statusLabel = ACTIVITY_STATUS_LABEL[act.status] ?? act.status;
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const maxEnd = act.tasks.reduce<Date | null>((acc, t) => {
        try {
          const d = new Date(t.endDate);
          return !acc ? d : d > acc ? d : acc;
        } catch {
          return acc;
        }
      }, null);
      const fueraDePlazo =
        act.status !== 'DONE' && maxEnd != null && maxEnd < today;
      html += `
      <div style="padding: 8px 12px; background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; margin-bottom: 8px;">
        <span style="font-size: 13px; color: #111827;">${escapeHtml(act.name)}</span>
        <span style="display: inline-block; background: #e5e7eb; color: #374151; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px;">${statusLabel}</span>
        ${fueraDePlazo ? '<span style="display: inline-block; background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 6px;">Fuera de plazo</span>' : ''}
      </div>`;
    });
  }
  html += `
    </div>
  </div>`;

  html += `
  <div style="${cardStyle}">
    <div style="${cardHeaderStyle}"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 8px; vertical-align: middle;">${iconImg('calendar', 20, baseUrl, useCid)}</td><td style="vertical-align: middle;">Seguimiento</td></tr></table></div>
    <div style="${cardContentStyle}">
      <p style="${subsectionLabelStyle}">${iconImg('list-todo', 16, baseUrl, useCid)} Compromisos asignados</p>`;
  if (compromisos.length === 0) {
    html += `<p style="font-size: 13px; color: #6b7280; margin: 0;">No hay compromisos</p>`;
  } else {
    compromisos.forEach((c) => {
      const titulo =
        c.titulo ?? c.descripcion?.substring(0, 60) ?? 'Sin título';
      const completado = c.completado;
      html += `
      <div style="padding: 6px 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 6px;">
        <span style="font-size: 13px; color: #111827;">${escapeHtml(titulo)}${titulo.length >= 60 ? '…' : ''}</span>
        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; margin-left: 8px; background: ${completado ? '#d1fae5' : '#e5e7eb'}; color: ${completado ? '#065f46' : '#374151'};">${completado ? 'Realizado' : 'Pendiente'}</span>
      </div>`;
    });
  }
  html += `
    </div>
  </div>`;

  html += `
  <div style="${cardStyle}">
    <div style="${cardHeaderStyle}"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 8px; vertical-align: middle;">${iconImg('history', 20, baseUrl, useCid)}</td><td style="vertical-align: middle;">Últimas 10 actualizaciones</td></tr></table></div>
    <div style="${cardContentStyle}">`;
  if (historial.length === 0) {
    html += `<p style="font-size: 13px; color: #6b7280; margin: 0;">No hay registros en el historial</p>`;
  } else {
    historial.forEach((entry) => {
      const f = formatFechaCorta(entry.fecha);
      const desc =
        entry.cambioGenerado?.trim() ||
        entry.elementoEspecifico ||
        entry.accion;
      html += `
      <div style="padding: 6px 8px; background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 4px; margin-bottom: 6px; font-size: 13px; color: #374151;">
        ${f}: ${escapeHtml(entry.accion)} (${escapeHtml(entry.tabProyecto)}) — ${escapeHtml(desc)}
      </div>`;
    });
  }
  html += `
    </div>
  </div>`;

  html += `
  <p style="font-size: 11px; color: #9ca3af; margin: 24px 0 0 0;">Reporte generado por Bitácora – Gestor de Proyectos (tab Resumen)</p>
</body>
</html>`;

  return html;
}

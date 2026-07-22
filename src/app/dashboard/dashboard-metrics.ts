import type { ProyectoConVariaciones } from '@/types/proyecto';

export type Project = ProyectoConVariaciones;

export type ProyectoEstado = 'Finalizado' | 'En Ejecución' | 'Atrasado';

export type AnalisisDimension =
  | 'sede'
  | 'escuela'
  | 'carrera'
  | 'comuna'
  | 'grupos-interes';

export type DistributionItem = {
  label: string;
  value: number;
  percentOfTotal: number;
  color?: string;
};

export type MatrixRow = {
  dimension: string;
  proyectos: number;
  comunas: number;
  escuelas: number;
  carreras: number;
  avanceGanttProm: number;
  avanceObjetivosProm: number;
  avancePresupuestoProm: number;
  participantes: number;
  sociosComunitarios: number;
  presupuestoTotal: number;
  presupuestoUsado: number;
  proyectosNombres: string[];
  comunasNombres: string[];
  escuelasNombres: string[];
  carrerasNombres: string[];
  sociosNombres: string[];
};

export const ROLES_ORDEN = [
  'Encargado',
  'Coordinador',
  'Colaborador',
  'Docente',
  'Estudiante',
  'Beneficiario',
] as const;

/** Parsea el string de sede (varias separadas por coma, punto o pipe). */
export function parseSedeString(sede: string): string[] {
  if (!sede?.trim()) return [];
  return sede
    .split(/[,.|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function presupuestoPercent(p: Project): number {
  if (typeof p.avancePresupuesto === 'number') {
    return Math.round(p.avancePresupuesto);
  }
  if (!p.presupuestoTotal || p.presupuestoTotal <= 0) return 0;
  return Math.round((p.presupuestoUsado / p.presupuestoTotal) * 100);
}

/** Presupuesto completo: sin presupuesto no bloquea; si hay, avance al 100%. */
export function isPresupuestoCompleto(p: Project): boolean {
  const hasBudget =
    (p.presupuestoTotal ?? 0) > 0 || (p.presupuestoAdjudicado ?? 0) > 0;
  if (!hasBudget) return true;
  return presupuestoPercent(p) === 100;
}

/** Terminado = Gantt 100% + indicadores 100% + presupuesto completo. */
export function isProyectoTerminado(p: Project): boolean {
  return (
    p.avanceGantt === 100 && p.objetivos === 100 && isPresupuestoCompleto(p)
  );
}

export function hasTareasAtrasadas(p: Project, hoy = startOfToday()): boolean {
  return (
    p.activities?.some((activity) =>
      activity.tasks?.some((task) => {
        if (!task.endDate) return false;
        const fechaFin = new Date(task.endDate);
        fechaFin.setHours(0, 0, 0, 0);
        return fechaFin < hoy && task.progress < 100;
      })
    ) || false
  );
}

function startOfToday(): Date {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return hoy;
}

/**
 * Atrasado tiene prioridad sobre Finalizado.
 * Finalizado = terminado (3 ejes). En ejecución = resto.
 */
export function calcularEstadoProyecto(p: Project): ProyectoEstado {
  if (hasTareasAtrasadas(p)) return 'Atrasado';
  if (isProyectoTerminado(p)) return 'Finalizado';
  return 'En Ejecución';
}

export function calcularFechasProyecto(p: Project): {
  fechaInicio: string | null;
  fechaFin: string | null;
} {
  const todasLasTareas =
    p.activities?.flatMap((activity) => activity.tasks || []) || [];

  if (todasLasTareas.length === 0) {
    return { fechaInicio: null, fechaFin: null };
  }

  const fechasInicio = todasLasTareas
    .map((t) => t.startDate)
    .filter(Boolean)
    .map((fecha) => new Date(fecha));

  const fechasFin = todasLasTareas
    .map((t) => t.endDate)
    .filter(Boolean)
    .map((fecha) => new Date(fecha));

  if (fechasInicio.length === 0 || fechasFin.length === 0) {
    return { fechaInicio: null, fechaFin: null };
  }

  const fechaInicio = new Date(
    Math.min(...fechasInicio.map((d) => d.getTime()))
  );
  const fechaFin = new Date(Math.max(...fechasFin.map((d) => d.getTime())));

  return {
    fechaInicio: fechaInicio.toISOString().split('T')[0],
    fechaFin: fechaFin.toISOString().split('T')[0],
  };
}

/** Formatea YYYY-MM-DD sin shift de timezone. */
export function formatearFecha(fecha: string | null): string {
  if (!fecha) return 'N/A';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (match) {
    return `${match[3]}.${match[2]}.${match[1]}`;
  }
  try {
    const date = new Date(fecha);
    const dia = String(date.getUTCDate()).padStart(2, '0');
    const mes = String(date.getUTCMonth() + 1).padStart(2, '0');
    const año = date.getUTCFullYear();
    return `${dia}.${mes}.${año}`;
  } catch {
    return 'N/A';
  }
}

export function formatPresupuesto(n: number): string {
  const abs = Math.abs(n).toLocaleString('es-CL');
  return n < 0 ? `-$${abs}` : `$${abs}`;
}

function toDistribution(
  grouped: Record<string, number>,
  totalProyectos: number
): DistributionItem[] {
  return Object.entries(grouped)
    .map(([label, value]) => ({
      label,
      value,
      percentOfTotal:
        totalProyectos > 0
          ? Math.round((value / totalProyectos) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export function countByFondo(proyectos: Project[]): DistributionItem[] {
  const grouped: Record<string, number> = {};
  proyectos.forEach((p) => {
    const k = p.fondo?.trim() || 'Sin fondo';
    grouped[k] = (grouped[k] || 0) + 1;
  });
  return toDistribution(grouped, proyectos.length);
}

export function countBySede(proyectos: Project[]): DistributionItem[] {
  const grouped: Record<string, number> = {};
  proyectos.forEach((p) => {
    const sedes = parseSedeString(p.sede);
    if (sedes.length === 0) {
      const k = p.sede?.trim() || 'Sin sede';
      grouped[k] = (grouped[k] || 0) + 1;
    } else {
      sedes.forEach((sedeNombre) => {
        grouped[sedeNombre] = (grouped[sedeNombre] || 0) + 1;
      });
    }
  });
  return toDistribution(grouped, proyectos.length);
}

export function countByEscuela(proyectos: Project[]): DistributionItem[] {
  const grouped: Record<string, number> = {};
  proyectos.forEach((p) => {
    if (!p.escuelas?.length) {
      grouped['Sin escuela'] = (grouped['Sin escuela'] || 0) + 1;
      return;
    }
    p.escuelas.forEach((rel) => {
      const nombre = rel.escuela.nombre;
      grouped[nombre] = (grouped[nombre] || 0) + 1;
    });
  });
  return toDistribution(grouped, proyectos.length);
}

export function countByFocalizacion(proyectos: Project[]): DistributionItem[] {
  const grouped: Record<string, number> = {};
  proyectos.forEach((p) => {
    const focalizacion = p.focalizacion || 'Sin focalización';
    grouped[focalizacion] = (grouped[focalizacion] || 0) + 1;
  });
  return toDistribution(grouped, proyectos.length).map((item) => ({
    ...item,
    color:
      item.label === 'Productiva'
        ? '#3b82f6'
        : item.label === 'Social'
          ? '#eab308'
          : item.label === 'Ambiental'
            ? '#10b981'
            : '#9ca3af',
  }));
}

export type PortfolioMetrics = {
  totalProyectos: number;
  terminados: number;
  enEjecucion: number;
  atrasados: number;
  totalParticipantes: number;
  desgloseRoles: { rol: string; cantidad: number }[];
  avanceGanttProm: number;
  indicadoresProm: number;
  presupuestoUsado: number;
  presupuestoTotal: number;
  presupuestoPercent: number;
};

export function computePortfolioMetrics(
  proyectos: Project[]
): PortfolioMetrics {
  const totalProyectos = proyectos.length;
  let terminados = 0;
  let atrasados = 0;
  let enEjecucion = 0;

  proyectos.forEach((p) => {
    const estado = calcularEstadoProyecto(p);
    if (estado === 'Finalizado') terminados += 1;
    else if (estado === 'Atrasado') atrasados += 1;
    else enEjecucion += 1;
  });

  const roleCounts: Record<string, number> = {};
  let totalParticipantes = 0;
  proyectos.forEach((p) => {
    p.participantes_rel?.forEach((participante) => {
      totalParticipantes += 1;
      const rol = participante.rol || 'Otros';
      roleCounts[rol] = (roleCounts[rol] || 0) + 1;
    });
  });

  const known = new Set<string>(ROLES_ORDEN);
  const desgloseRoles: { rol: string; cantidad: number }[] = [
    ...ROLES_ORDEN.map((rol) => ({
      rol,
      cantidad: roleCounts[rol] || 0,
    })),
  ];
  const otros = Object.entries(roleCounts)
    .filter(([rol]) => !known.has(rol))
    .reduce((s, [, n]) => s + n, 0);
  if (otros > 0) desgloseRoles.push({ rol: 'Otros', cantidad: otros });

  const avanceGanttProm =
    totalProyectos > 0
      ? Math.round(
          proyectos.reduce((sum, p) => sum + p.avanceGantt, 0) / totalProyectos
        )
      : 0;
  const indicadoresProm =
    totalProyectos > 0
      ? Math.round(
          proyectos.reduce((sum, p) => sum + p.objetivos, 0) / totalProyectos
        )
      : 0;
  const presupuestoUsado = proyectos.reduce(
    (sum, p) => sum + (p.presupuestoUsado || 0),
    0
  );
  const presupuestoTotal = proyectos.reduce(
    (sum, p) => sum + (p.presupuestoTotal || 0),
    0
  );
  const presupuestoPercentAvg =
    totalProyectos > 0
      ? Math.round(
          proyectos.reduce((sum, p) => sum + presupuestoPercent(p), 0) /
            totalProyectos
        )
      : 0;

  return {
    totalProyectos,
    terminados,
    enEjecucion,
    atrasados,
    totalParticipantes,
    desgloseRoles,
    avanceGanttProm,
    indicadoresProm,
    presupuestoUsado,
    presupuestoTotal,
    presupuestoPercent: presupuestoPercentAvg,
  };
}

export function metricsFromProjects(
  projects: Project[]
): Omit<MatrixRow, 'dimension'> {
  const n = projects.length;
  const comunasSet = new Map<string, string>();
  projects.forEach((p) =>
    p.comunas?.forEach((rel) => {
      const c = rel.comuna;
      comunasSet.set(c.id, `${c.nombre} (${c.region})`);
    })
  );
  const escuelasSet = new Map<string, string>();
  projects.forEach((p) =>
    p.escuelas?.forEach((rel) =>
      escuelasSet.set(rel.escuela.id, rel.escuela.nombre)
    )
  );
  const carrerasSet = new Map<string, string>();
  projects.forEach((p) =>
    p.carreras?.forEach((rel) =>
      carrerasSet.set(rel.carrera.id, rel.carrera.nombre)
    )
  );
  const avanceGanttProm = n
    ? projects.reduce((s, p) => s + p.avanceGantt, 0) / n
    : 0;
  const avanceObjetivosProm = n
    ? projects.reduce((s, p) => s + p.objetivos, 0) / n
    : 0;
  const avancePresupuestoProm = n
    ? projects.reduce((s, p) => s + presupuestoPercent(p), 0) / n
    : 0;
  const participantes = projects.reduce(
    (s, p) => s + (p.participantes_rel?.length ?? 0),
    0
  );
  const sociosComunitarios = projects.reduce(
    (s, p) => s + (p.sociosComunitarios?.length ?? 0),
    0
  );
  const presupuestoTotal = projects.reduce(
    (s, p) => s + (p.presupuestoTotal ?? 0),
    0
  );
  const presupuestoUsado = projects.reduce(
    (s, p) => s + (p.presupuestoUsado ?? 0),
    0
  );
  const proyectosNombres = projects.map((p) => p.proyecto);
  const comunasNombres = Array.from(comunasSet.values());
  const escuelasNombres = Array.from(escuelasSet.values());
  const carrerasNombres = Array.from(carrerasSet.values());
  const sociosNombres = projects.flatMap((p) =>
    (p.sociosComunitarios ?? []).map((rel) => rel.socioComunitario.nombre)
  );
  const sociosNombresUnicos = Array.from(new Set(sociosNombres));
  return {
    proyectos: n,
    comunas: comunasNombres.length,
    escuelas: escuelasNombres.length,
    carreras: carrerasNombres.length,
    avanceGanttProm,
    avanceObjetivosProm,
    avancePresupuestoProm,
    participantes,
    sociosComunitarios,
    presupuestoTotal,
    presupuestoUsado,
    proyectosNombres,
    comunasNombres,
    escuelasNombres,
    carrerasNombres,
    sociosNombres: sociosNombresUnicos,
  };
}

export function computeMatrixRows(
  proyectos: Project[],
  dimension: AnalisisDimension
): MatrixRow[] {
  const byId = new Map<string, Project>();
  proyectos.forEach((p) => byId.set(p.id, p));

  if (dimension === 'sede') {
    const groups = new Map<string, Project[]>();
    proyectos.forEach((p) => {
      const sedes = parseSedeString(p.sede);
      if (sedes.length === 0) {
        const k = p.sede?.trim() || 'Sin sede';
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(p);
      } else {
        sedes.forEach((sedeNombre) => {
          if (!groups.has(sedeNombre)) groups.set(sedeNombre, []);
          groups.get(sedeNombre)!.push(p);
        });
      }
    });
    return Array.from(groups.entries())
      .map(([sede, projs]) => ({
        dimension: sede,
        ...metricsFromProjects(projs),
      }))
      .sort((a, b) => b.proyectos - a.proyectos);
  }

  if (dimension === 'escuela') {
    const nameToIds = new Map<string, Set<string>>();
    proyectos.forEach((p) => {
      p.escuelas?.forEach((rel) => {
        const n = rel.escuela.nombre;
        if (!nameToIds.has(n)) nameToIds.set(n, new Set());
        nameToIds.get(n)!.add(p.id);
      });
    });
    return Array.from(nameToIds.entries())
      .map(([nombre, ids]) => {
        const projs = Array.from(ids)
          .map((id) => byId.get(id)!)
          .filter(Boolean);
        return { dimension: nombre, ...metricsFromProjects(projs) };
      })
      .sort((a, b) => b.proyectos - a.proyectos);
  }

  if (dimension === 'carrera') {
    const nameToIds = new Map<string, Set<string>>();
    proyectos.forEach((p) => {
      p.carreras?.forEach((rel) => {
        const n = rel.carrera.nombre;
        if (!nameToIds.has(n)) nameToIds.set(n, new Set());
        nameToIds.get(n)!.add(p.id);
      });
    });
    return Array.from(nameToIds.entries())
      .map(([nombre, ids]) => {
        const projs = Array.from(ids)
          .map((id) => byId.get(id)!)
          .filter(Boolean);
        return { dimension: nombre, ...metricsFromProjects(projs) };
      })
      .sort((a, b) => b.proyectos - a.proyectos);
  }

  if (dimension === 'comuna') {
    const keyToIds = new Map<string, Set<string>>();
    const keyToLabel = new Map<string, string>();
    proyectos.forEach((p) => {
      p.comunas?.forEach((rel) => {
        const c = rel.comuna;
        const k = c.id;
        const label = `${c.nombre} (${c.region})`;
        if (!keyToIds.has(k)) {
          keyToIds.set(k, new Set());
          keyToLabel.set(k, label);
        }
        keyToIds.get(k)!.add(p.id);
      });
    });
    return Array.from(keyToIds.entries())
      .map(([k, ids]) => {
        const projs = Array.from(ids)
          .map((id) => byId.get(id)!)
          .filter(Boolean);
        return {
          dimension: keyToLabel.get(k) ?? k,
          ...metricsFromProjects(projs),
        };
      })
      .sort((a, b) => b.proyectos - a.proyectos);
  }

  if (dimension === 'grupos-interes') {
    const nameToIds = new Map<string, Set<string>>();
    proyectos.forEach((p) => {
      p.gruposInteres?.forEach((rel) => {
        const n = rel.grupoInteres.nombre;
        if (!nameToIds.has(n)) nameToIds.set(n, new Set());
        nameToIds.get(n)!.add(p.id);
      });
    });
    return Array.from(nameToIds.entries())
      .map(([nombre, ids]) => {
        const projs = Array.from(ids)
          .map((id) => byId.get(id)!)
          .filter(Boolean);
        return { dimension: nombre, ...metricsFromProjects(projs) };
      })
      .sort((a, b) => b.proyectos - a.proyectos);
  }

  return [];
}

export type ParticipantesFiltro =
  | 'Rol'
  | 'Cargo'
  | 'Sede'
  | 'Escuela'
  | 'Carrera'
  | 'Socio Comunitario';

/** Agrupa participantes por atributo del participante (no del proyecto). */
export function countParticipantesByFiltro(
  proyectos: Project[],
  filtro: ParticipantesFiltro
): DistributionItem[] {
  const grouped: Record<string, number> = {};
  let total = 0;

  proyectos.forEach((p) => {
    p.participantes_rel?.forEach((participante) => {
      total += 1;
      let key = '';
      switch (filtro) {
        case 'Rol':
          key = participante.rol || 'Sin rol';
          break;
        case 'Cargo':
          key = participante.cargo?.trim() || 'Sin cargo';
          break;
        case 'Sede':
          key = participante.sede?.nombre || 'Sin sede';
          break;
        case 'Escuela':
          key = participante.escuela?.nombre || 'Sin escuela';
          break;
        case 'Carrera':
          key = participante.carrera?.nombre || 'Sin carrera';
          break;
        case 'Socio Comunitario':
          key =
            participante.socioComunitario?.nombre || 'Sin socio comunitario';
          break;
      }
      if (key) grouped[key] = (grouped[key] || 0) + 1;
    });
  });

  return Object.entries(grouped)
    .map(([label, value]) => ({
      label,
      value,
      percentOfTotal: total > 0 ? Math.round((value / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

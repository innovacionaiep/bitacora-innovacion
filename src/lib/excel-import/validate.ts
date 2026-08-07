import {
  CUENTAS_PRESUPUESTO,
  FOCALIZACIONES,
  FORMATOS_NUMERO,
  PROYECTOS_BASE_HEADERS,
  ROLES_PARTICIPANTE,
  isLegacyDtCampoKey,
  type ActividadImportRow,
  type CatalogMaps,
  type DtHeaderTarget,
  type FocalizacionImport,
  type IndicadorImportRow,
  type ParticipanteImportRow,
  type PresupuestoImportRow,
  type PreviewRowResult,
  type ProyectoImportRow,
} from './types';
import { cell, type RawSheetRow } from './parse';
import {
  isValidEmail,
  normKey,
  parseFlexibleDate,
  resolveNames,
  splitList,
  truncateToLimit,
} from './utils';

/** Límites de BD / UI para nombres en carga masiva de actividades. */
const ACTIVIDAD_NOMBRE_MAX = 70;
const TAREA_NOMBRE_MAX = 70;

const PROYECTO_NON_DT_HEADERS = new Set(
  PROYECTOS_BASE_HEADERS.map((h) => normKey(h))
);

export function validateProyectoRow(
  row: RawSheetRow,
  catalogs: CatalogMaps,
  existingNames: Set<string>,
  namesInFile: Set<string>,
  dtByHeader: Map<string, DtHeaderTarget>
): PreviewRowResult<ProyectoImportRow> {
  const errors: string[] = [];
  const nombre = cell(row, 'Nombre');
  const objetivoGeneral = cell(row, 'ObjetivoGeneral');
  const fondo = cell(row, 'Fondo');
  const linea = cell(row, 'Linea');
  const focalizacionRaw = cell(row, 'Focalizacion');
  const youtubeUrl = cell(row, 'YoutubeUrl');

  if (!nombre) errors.push('Nombre es obligatorio');
  else {
    const key = normKey(nombre);
    if (existingNames.has(key)) {
      errors.push(`Ya existe un proyecto con el nombre "${nombre}"`);
    }
    if (namesInFile.has(key)) {
      errors.push(`Nombre duplicado en el archivo: "${nombre}"`);
    } else {
      namesInFile.add(key);
    }
  }
  if (!objetivoGeneral) errors.push('ObjetivoGeneral es obligatorio');

  let focalizacion: FocalizacionImport | null = null;
  if (focalizacionRaw) {
    const match = FOCALIZACIONES.find(
      (f) => normKey(f) === normKey(focalizacionRaw)
    );
    if (!match) {
      errors.push(
        `Focalizacion inválida (use: ${FOCALIZACIONES.join(', ')})`
      );
    } else {
      focalizacion = match;
    }
  }

  if (fondo) {
    if (!catalogs.fondosByName.has(normKey(fondo))) {
      errors.push(`Fondo no encontrado: "${fondo}"`);
    }
  }
  let lineaFinal: string | null = null;
  if (linea) {
    const candidates = catalogs.lineasByName.get(normKey(linea)) ?? [];
    if (candidates.length === 0) {
      errors.push(`Línea no encontrada: "${linea}"`);
    } else if (fondo) {
      const forFondo = candidates.find(
        (c) => normKey(c.fondoNombre) === normKey(fondo)
      );
      if (!forFondo) {
        errors.push(`La línea "${linea}" no pertenece al fondo "${fondo}"`);
      } else {
        lineaFinal = forFondo.nombre;
      }
    } else {
      lineaFinal = candidates[0].nombre;
    }
  }

  const sedes = resolveNames(
    splitList(cell(row, 'Sedes')),
    catalogs.sedesByName,
    'Sede'
  );
  const escuelas = resolveNames(
    splitList(cell(row, 'Escuelas')),
    catalogs.escuelasByName,
    'Escuela'
  );
  const comunas = resolveNames(
    splitList(cell(row, 'Comunas')),
    catalogs.comunasByName,
    'Comuna'
  );
  const carreras = resolveNames(
    splitList(cell(row, 'Carreras')),
    catalogs.carrerasByName,
    'Carrera'
  );
  // Asignaturas: dropdown o texto libre. Match/create en confirm.
  const asignaturasNombres = splitList(cell(row, 'Asignaturas'));
  const grupos = resolveNames(
    splitList(cell(row, 'GruposInteres')),
    catalogs.gruposByName,
    'Grupo de interés'
  );
  // Socios: texto libre (varios con ;). Match/create en confirm, no exige catálogo.
  const sociosNombres = splitList(cell(row, 'SociosComunitarios'));
  errors.push(
    ...sedes.errors,
    ...escuelas.errors,
    ...comunas.errors,
    ...carreras.errors,
    ...grupos.errors
  );
  if (sedes.ids.length === 0) errors.push('Al menos una Sede es obligatoria');
  if (escuelas.ids.length === 0) {
    errors.push('Al menos una Escuela es obligatoria');
  }

  const desarrolloTecnico: Record<string, string> = {};
  const desarrolloTecnicoValores: { subcategoriaId: string; valor: string }[] =
    [];
  const seenValorIds = new Set<string>();

  for (const [headerKey, value] of Object.entries(row.cells)) {
    if (!value) continue;
    if (PROYECTO_NON_DT_HEADERS.has(headerKey)) continue;

    let target = dtByHeader.get(headerKey);
    // Compat: plantillas antiguas con prefijo "DT:" o "DT — "
    if (!target && headerKey.startsWith('dt:')) {
      target = dtByHeader.get(headerKey.slice(3).trim());
    }
    if (!target && headerKey.startsWith('dt — ')) {
      target = dtByHeader.get(headerKey.slice(5).trim());
    }
    if (!target) continue;

    if (isLegacyDtCampoKey(target.campoKey)) {
      desarrolloTecnico[target.campoKey!] = value;
    } else if (!seenValorIds.has(target.subcategoriaId)) {
      seenValorIds.add(target.subcategoriaId);
      desarrolloTecnicoValores.push({
        subcategoriaId: target.subcategoriaId,
        valor: value,
      });
    }
  }

  const sedeNombres = sedes.ids
    .map((id) => {
      for (const s of catalogs.sedesByName.values()) {
        if (s.id === id) return s.nombre;
      }
      return '';
    })
    .filter(Boolean);

  const data: ProyectoImportRow = {
    nombre,
    fondo: fondo
      ? catalogs.fondosByName.get(normKey(fondo))?.nombre ?? fondo
      : '',
    linea: lineaFinal,
    focalizacion,
    sedesIds: sedes.ids,
    sedeNombres,
    comunasIds: comunas.ids,
    escuelasIds: escuelas.ids,
    carrerasIds: carreras.ids,
    asignaturasNombres,
    gruposInteresIds: grupos.ids,
    sociosComunitariosNombres: sociosNombres,
    objetivoGeneral,
    objetivosEspecificos: splitList(cell(row, 'ObjetivosEspecificos')),
    youtubeUrl: youtubeUrl || null,
    desarrolloTecnico,
    desarrolloTecnicoValores,
  };

  return {
    rowNumber: row.rowNumber,
    status: errors.length ? 'error' : 'ok',
    errors,
    data: errors.length ? undefined : data,
    summary: nombre || `Fila ${row.rowNumber}`,
  };
}

export function validateParticipanteRow(
  row: RawSheetRow,
  catalogs: CatalogMaps,
  sociosDelProyecto?: Set<string>
): PreviewRowResult<ParticipanteImportRow> {
  const errors: string[] = [];
  const rolRaw = cell(row, 'Rol');
  const nombre = cell(row, 'Nombre');
  const email = cell(row, 'Email');
  const rut = cell(row, 'Rut');
  const cargo = cell(row, 'Cargo');
  const labor = cell(row, 'Labor');

  const rol = ROLES_PARTICIPANTE.find((r) => normKey(r) === normKey(rolRaw));
  if (!rol) errors.push('Rol inválido o vacío');
  if (!nombre) errors.push('Nombre es obligatorio');
  if (!email) errors.push('Email es obligatorio');
  else if (!isValidEmail(email)) errors.push('Email inválido');

  if (rol === 'Docente' || rol === 'Estudiante') {
    if (!rut) errors.push('RUT es obligatorio para Docente/Estudiante');
  }

  const resolveOne = (
    value: string,
    map: Map<string, { id: string; nombre: string }>,
    label: string
  ): string | null => {
    if (!value) return null;
    const found = map.get(normKey(value));
    if (!found) {
      errors.push(`${label} no encontrado: "${value}"`);
      return null;
    }
    return found.id;
  };

  const sedeId = resolveOne(cell(row, 'Sede'), catalogs.sedesByName, 'Sede');
  const escuelaId = resolveOne(
    cell(row, 'Escuela'),
    catalogs.escuelasByName,
    'Escuela'
  );
  const carreraId = resolveOne(
    cell(row, 'Carrera'),
    catalogs.carrerasByName,
    'Carrera'
  );
  const asignaturaId = resolveOne(
    cell(row, 'Asignatura'),
    catalogs.asignaturasByName,
    'Asignatura'
  );
  const socioName = cell(row, 'SocioComunitario');
  let socioComunitarioId: string | null = null;
  if (socioName) {
    const found = catalogs.sociosByName.get(normKey(socioName));
    if (!found) {
      errors.push(`Socio comunitario no encontrado: "${socioName}"`);
    } else if (sociosDelProyecto && !sociosDelProyecto.has(found.id)) {
      errors.push(
        `El socio "${socioName}" no está asociado a este proyecto`
      );
    } else {
      socioComunitarioId = found.id;
    }
  }

  if (rol === 'Estudiante') {
    if (!carreraId) errors.push('Carrera es obligatoria para Estudiante');
    if (!asignaturaId) errors.push('Asignatura es obligatoria para Estudiante');
  }
  if (rol === 'Beneficiario' && !socioComunitarioId) {
    errors.push('SocioComunitario es obligatorio para Beneficiario');
  }

  const data: ParticipanteImportRow = {
    rol: rol ?? 'Colaborador',
    nombre,
    email,
    rut: rut || null,
    cargo: cargo || null,
    sedeId,
    escuelaId,
    carreraId,
    asignaturaId,
    socioComunitarioId,
    laborEnProyecto: labor || null,
  };

  return {
    rowNumber: row.rowNumber,
    status: errors.length ? 'error' : 'ok',
    errors,
    data: errors.length ? undefined : data,
    summary: `${rolRaw || '?'} — ${nombre || email || row.rowNumber}`,
  };
}

export function validateActividadRow(
  row: RawSheetRow,
  activityNamesInFile: Set<string>
): PreviewRowResult<ActividadImportRow> {
  const errors: string[] = [];
  const tipoRaw = cell(row, 'Tipo');
  const tipo =
    normKey(tipoRaw) === 'actividad'
      ? 'Actividad'
      : normKey(tipoRaw) === 'tarea'
        ? 'Tarea'
        : null;
  const nombreRaw = cell(row, 'Nombre');
  const descripcion = cell(row, 'Descripcion');
  const actividadPadreRaw = cell(row, 'Actividad');
  const ordenRaw = cell(row, 'Orden');
  const fechaInicioRaw = cell(row, 'FechaInicio');
  const fechaFinRaw = cell(row, 'FechaFin');

  if (!tipo) errors.push('Tipo debe ser Actividad o Tarea');
  if (!nombreRaw) errors.push('Nombre es obligatorio');

  if (tipo === 'Actividad') {
    // Truncar al límite en vez de rechazar (nombres largos del Excel)
    const nombre = truncateToLimit(nombreRaw, ACTIVIDAD_NOMBRE_MAX);
    if (activityNamesInFile.has(normKey(nombre))) {
      errors.push(`Actividad duplicada en el archivo: "${nombre}"`);
    } else if (nombre) {
      activityNamesInFile.add(normKey(nombre));
    }
    const orden = ordenRaw ? Number(ordenRaw) : 0;
    if (ordenRaw && Number.isNaN(orden)) {
      errors.push('Orden debe ser numérico');
    }
    // Las actividades no llevan fechas; si vinieran en formato legacy, se ignoran.
    const data: ActividadImportRow = {
      tipo: 'Actividad',
      nombre,
      descripcion,
      orden: Number.isFinite(orden) ? orden : 0,
    };
    return {
      rowNumber: row.rowNumber,
      sheetName: row.sheetName,
      status: errors.length ? 'error' : 'ok',
      errors,
      data: errors.length ? undefined : data,
      summary: `Actividad: ${nombre}`,
    };
  }

  if (tipo === 'Tarea') {
    const nombre = truncateToLimit(nombreRaw, TAREA_NOMBRE_MAX);
    // Misma truncación que en Actividades para que el vínculo por nombre coincida
    const actividadPadre = truncateToLimit(
      actividadPadreRaw,
      ACTIVIDAD_NOMBRE_MAX
    );
    if (!actividadPadre) {
      errors.push(
        'Actividad es obligatoria: elige un nombre de la hoja Actividades'
      );
    } else if (!activityNamesInFile.has(normKey(actividadPadre))) {
      errors.push(
        `La actividad "${actividadPadreRaw}" no está en la hoja Actividades`
      );
    }
    const fechaInicio = parseFlexibleDate(fechaInicioRaw);
    const fechaFin = parseFlexibleDate(fechaFinRaw);
    if (!fechaInicio) {
      errors.push(
        'FechaInicio inválida (use DD/MM/YYYY o YYYY-MM-DD)'
      );
    }
    if (!fechaFin) {
      errors.push('FechaFin inválida (use DD/MM/YYYY o YYYY-MM-DD)');
    }
    const data: ActividadImportRow = {
      tipo: 'Tarea',
      actividadPadre,
      nombre,
      descripcion,
      fechaInicio: fechaInicio ?? fechaInicioRaw,
      fechaFin: fechaFin ?? fechaFinRaw,
    };
    return {
      rowNumber: row.rowNumber,
      sheetName: row.sheetName,
      status: errors.length ? 'error' : 'ok',
      errors,
      data: errors.length ? undefined : data,
      summary: `Tarea → ${actividadPadre || '?'}: ${nombre}`,
    };
  }

  return {
    rowNumber: row.rowNumber,
    sheetName: row.sheetName,
    status: 'error',
    errors: errors.length ? errors : ['Fila inválida'],
    summary: `Fila ${row.rowNumber}`,
  };
}

/** Two-pass: collect activity names first, then validate all rows.
 * Luego exige ≥1 tarea por cada actividad del archivo.
 */
export function validateActividadesRows(
  rows: RawSheetRow[]
): PreviewRowResult<ActividadImportRow>[] {
  const activityNames = new Set<string>();
  for (const row of rows) {
    if (normKey(cell(row, 'Tipo')) === 'actividad') {
      const n = truncateToLimit(cell(row, 'Nombre'), ACTIVIDAD_NOMBRE_MAX);
      if (n) activityNames.add(normKey(n));
    }
  }

  const tasksPerActivity = new Map<string, number>();
  for (const row of rows) {
    if (normKey(cell(row, 'Tipo')) !== 'tarea') continue;
    const padre = truncateToLimit(
      cell(row, 'Actividad'),
      ACTIVIDAD_NOMBRE_MAX
    );
    if (!padre) continue;
    const key = normKey(padre);
    tasksPerActivity.set(key, (tasksPerActivity.get(key) ?? 0) + 1);
  }

  const seenActs = new Set<string>();
  const results = rows.map((row) => {
    const tipo = normKey(cell(row, 'Tipo'));
    if (tipo === 'tarea') {
      return validateActividadRow(row, activityNames);
    }
    return validateActividadRow(row, seenActs);
  });

  return results.map((r, idx) => {
    const row = rows[idx];
    if (normKey(cell(row, 'Tipo')) !== 'actividad') return r;
    const nombre = truncateToLimit(cell(row, 'Nombre'), ACTIVIDAD_NOMBRE_MAX);
    if (!nombre) return r;
    const count = tasksPerActivity.get(normKey(nombre)) ?? 0;
    if (count > 0) return r;
    return {
      ...r,
      sheetName: r.sheetName ?? row.sheetName,
      status: 'error' as const,
      errors: [
        ...r.errors,
        `La actividad "${nombre}" no tiene tareas asociadas en la hoja Tareas`,
      ],
      data: undefined,
    };
  });
}

export function validateIndicadorRow(
  row: RawSheetRow
): PreviewRowResult<IndicadorImportRow> {
  const errors: string[] = [];
  const objetivoEspecifico = cell(row, 'ObjetivoEspecifico');
  const nombre = cell(row, 'Nombre');
  const descripcion = cell(row, 'Descripcion');
  const formaCalculo = cell(row, 'FormaCalculo');
  const resultadoEsperado = cell(row, 'ResultadoEsperado');
  const formatoRaw = cell(row, 'Formato') || 'Porcentaje';
  const fechaInicioRaw = cell(row, 'FechaInicio');
  const fechaFinRaw = cell(row, 'FechaFin');

  if (!objetivoEspecifico) errors.push('ObjetivoEspecifico es obligatorio');
  if (!nombre) errors.push('Nombre es obligatorio');
  if (!descripcion) errors.push('Descripcion es obligatoria');
  if (!formaCalculo) errors.push('FormaCalculo es obligatoria');
  if (!resultadoEsperado) errors.push('ResultadoEsperado es obligatorio');

  const formato = FORMATOS_NUMERO.find(
    (f) => normKey(f) === normKey(formatoRaw)
  );
  if (!formato) {
    errors.push(`Formato inválido (use: ${FORMATOS_NUMERO.join(', ')})`);
  }
  const fechaInicio = fechaInicioRaw
    ? parseFlexibleDate(fechaInicioRaw)
    : null;
  const fechaFin = fechaFinRaw ? parseFlexibleDate(fechaFinRaw) : null;
  if (fechaInicioRaw && !fechaInicio) {
    errors.push('FechaInicio inválida (use DD/MM/YYYY o YYYY-MM-DD)');
  }
  if (fechaFinRaw && !fechaFin) {
    errors.push('FechaFin inválida (use DD/MM/YYYY o YYYY-MM-DD)');
  }

  const data: IndicadorImportRow = {
    objetivoEspecifico,
    nombre,
    descripcion,
    formaCalculo,
    resultadoEsperado,
    formatoNumero: formato ?? 'Porcentaje',
    fechaInicio,
    fechaFin,
  };

  return {
    rowNumber: row.rowNumber,
    status: errors.length ? 'error' : 'ok',
    errors,
    data: errors.length ? undefined : data,
    summary: nombre || `Fila ${row.rowNumber}`,
  };
}

export function validatePresupuestoRow(
  row: RawSheetRow
): PreviewRowResult<PresupuestoImportRow> {
  const errors: string[] = [];
  const cuentaRaw = cell(row, 'Cuenta');
  const item = cell(row, 'Item');
  const detalle = cell(row, 'Detalle');
  const montoRaw = cell(row, 'Monto').replace(/\./g, '').replace(',', '.');

  const cuenta = CUENTAS_PRESUPUESTO.find(
    (c) => normKey(c) === normKey(cuentaRaw)
  );
  if (!cuenta) {
    errors.push(`Cuenta inválida (use: ${CUENTAS_PRESUPUESTO.join(', ')})`);
  }
  if (!item) errors.push('Item es obligatorio');
  const monto = Number(montoRaw);
  if (!montoRaw || Number.isNaN(monto) || monto <= 0) {
    errors.push('Monto debe ser un número mayor a 0');
  }

  const data: PresupuestoImportRow = {
    cuenta: cuenta ?? 'OPERACION',
    item,
    detalle: detalle || null,
    monto: Math.round(monto),
  };

  return {
    rowNumber: row.rowNumber,
    status: errors.length ? 'error' : 'ok',
    errors,
    data: errors.length ? undefined : data,
    summary: item || `Fila ${row.rowNumber}`,
  };
}

import ExcelJS from 'exceljs';
import {
  ACTIVIDAD_SHEET_HEADERS,
  CUENTAS_PRESUPUESTO,
  FOCALIZACIONES,
  FORMATOS_NUMERO,
  INDICADORES_HEADERS,
  PARTICIPANTES_HEADERS,
  PRESUPUESTO_HEADERS,
  PROYECTOS_BASE_HEADERS,
  ROLES_PARTICIPANTE,
  TAREA_SHEET_HEADERS,
  type DtTemplateColumn,
  type ImportTemplateTipo,
} from './types';

export type TemplateCatalogData = {
  sedes: string[];
  escuelas: string[];
  carreras: string[];
  asignaturas: string[];
  comunas: string[];
  gruposInteres: string[];
  sociosComunitarios: string[];
  fondos: string[];
  lineas: string[];
  /** Columnas DT en orden de config; header = nombre actual (sin prefijo DT:) */
  dtColumns: DtTemplateColumn[];
};

function addCatalogSheet(
  wb: ExcelJS.Workbook,
  catalogs: Record<string, string[]>
): ExcelJS.Worksheet {
  const sheet = wb.addWorksheet('_catalogos', { state: 'hidden' });
  const keys = Object.keys(catalogs);
  keys.forEach((key, colIdx) => {
    const col = colIdx + 1;
    sheet.getCell(1, col).value = key;
    const values = catalogs[key] ?? [];
    values.forEach((v, i) => {
      sheet.getCell(i + 2, col).value = v;
    });
  });
  return sheet;
}

function catalogRange(colLetter: string, count: number): string {
  // Excel needs at least 2 rows in the range for list validation
  const end = Math.max(count + 1, 2);
  return `'_catalogos'!$${colLetter}$2:$${colLetter}$${end}`;
}

function colLetter(n: number): string {
  let s = '';
  let num = n;
  while (num > 0) {
    const rem = (num - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}

function applyListValidation(
  sheet: ExcelJS.Worksheet,
  colIndex: number,
  formula: string,
  opts?: { maxRows?: number; strict?: boolean }
) {
  const maxRows = opts?.maxRows ?? 500;
  const strict = opts?.strict ?? true;
  for (let r = 2; r <= maxRows + 1; r++) {
    sheet.getCell(r, colIndex).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [formula],
      // Multi-valor (A; B): no bloquear en Excel; la app valida en preview
      showErrorMessage: strict,
      errorTitle: 'Valor inválido',
      error: 'Selecciona un valor de la lista',
      showInputMessage: !strict,
      promptTitle: !strict ? 'Varios valores' : undefined,
      prompt: !strict
        ? 'Puedes elegir de la lista o escribir varios separados por ;'
        : undefined,
    };
  }
}

function styleHeader(sheet: ExcelJS.Worksheet, colCount: number) {
  const row = sheet.getRow(1);
  row.font = { bold: true };
  row.commit();
  for (let c = 1; c <= colCount; c++) {
    sheet.getColumn(c).width = Math.min(
      40,
      Math.max(14, String(sheet.getCell(1, c).value ?? '').length + 4)
    );
  }
}

function catalogValues(
  catalogs: TemplateCatalogData,
  catKey: string
): string[] {
  switch (catKey) {
    case 'fondos':
      return catalogs.fondos;
    case 'lineas':
      return catalogs.lineas;
    case 'focalizaciones':
      return [...FOCALIZACIONES];
    case 'sedes':
      return catalogs.sedes;
    case 'comunas':
      return catalogs.comunas;
    case 'escuelas':
      return catalogs.escuelas;
    case 'carreras':
      return catalogs.carreras;
    case 'asignaturas':
      return catalogs.asignaturas;
    case 'gruposInteres':
      return catalogs.gruposInteres;
    case 'sociosComunitarios':
      return catalogs.sociosComunitarios;
    default:
      return [];
  }
}

export async function buildImportTemplate(
  tipo: ImportTemplateTipo,
  catalogs: TemplateCatalogData
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Bitácora';
  wb.created = new Date();

  if (tipo === 'proyectos') {
    const baseHeaders = [...PROYECTOS_BASE_HEADERS];
    const baseKeys = new Set(baseHeaders.map((h) => h.trim().toLowerCase()));
    const dtHeaders = catalogs.dtColumns.map((col) => {
      // Evitar colisión con columnas base (muy raro); si ocurre, prefijo suave
      if (baseKeys.has(col.nombre.trim().toLowerCase())) {
        return `DT — ${col.nombre}`;
      }
      return col.nombre;
    });
    const headers = [...baseHeaders, ...dtHeaders];
    // Sin socios: campo de texto libre (crear/match por nombre al importar)
    const catKeys = [
      'fondos',
      'lineas',
      'focalizaciones',
      'sedes',
      'comunas',
      'escuelas',
      'carreras',
      'asignaturas',
      'gruposInteres',
    ];
    addCatalogSheet(wb, {
      fondos: catalogs.fondos,
      lineas: catalogs.lineas,
      focalizaciones: [...FOCALIZACIONES],
      sedes: catalogs.sedes,
      comunas: catalogs.comunas,
      escuelas: catalogs.escuelas,
      carreras: catalogs.carreras,
      asignaturas: catalogs.asignaturas,
      gruposInteres: catalogs.gruposInteres,
    });
    const sheet = wb.addWorksheet('Proyectos');
    sheet.addRow(headers);
    styleHeader(sheet, headers.length);

    const dropdownCols: {
      header: string;
      catKey: string;
      /** false = permite "A; B" tipado a mano */
      strict: boolean;
    }[] = [
      { header: 'Fondo', catKey: 'fondos', strict: true },
      { header: 'Linea', catKey: 'lineas', strict: true },
      { header: 'Focalizacion', catKey: 'focalizaciones', strict: true },
      { header: 'Sedes', catKey: 'sedes', strict: false },
      { header: 'Comunas', catKey: 'comunas', strict: false },
      { header: 'Escuelas', catKey: 'escuelas', strict: false },
      { header: 'Carreras', catKey: 'carreras', strict: false },
      { header: 'Asignaturas', catKey: 'asignaturas', strict: false },
      { header: 'GruposInteres', catKey: 'gruposInteres', strict: false },
    ];
    for (const { header, catKey, strict } of dropdownCols) {
      const colIdx = headers.indexOf(header as (typeof headers)[number]) + 1;
      if (colIdx < 1) continue;
      const catCol = catKeys.indexOf(catKey) + 1;
      const values = catalogValues(catalogs, catKey);
      applyListValidation(
        sheet,
        colIdx,
        catalogRange(colLetter(catCol), values.length),
        { strict }
      );
    }

    const help = wb.addWorksheet('Instrucciones');
    help.getColumn(1).width = 100;
    const helpLines = [
      'Plantilla de carga masiva de proyectos (archivo con macros .xlsm)',
      '',
      '1) Al abrir el archivo en Excel, elige "Habilitar contenido" / habilitar macros.',
      '2) Completa la hoja "Proyectos" (una fila = un proyecto).',
      '3) Selección múltiple (Sedes, Comunas, Escuelas, Carreras, Asignaturas, GruposInteres):',
      '   - Elige un valor del desplegable; se agrega a la celda.',
      '   - Vuelve a abrir el desplegable y elige otro valor; se concatena con "; ".',
      '   - Si eliges un valor que ya está en la celda, se quita (toggle).',
      '4) Desarrollo técnico: columnas en el mismo orden que Ajustes → Desarrollo técnico (categoría y subcategoría).',
      '5) Asignaturas: también puedes escribir texto libre. Si no existe en el sistema, se crea al importar.',
      '6) SociosComunitarios: escribe libremente (varios con ;). Si el nombre ya existe en la app, se reutiliza.',
      '7) Encargado/Coordinador no van en esta plantilla; se pueden asignar después en el proyecto.',
      '8) Guarda el archivo y súbelo en Bitácora (Carga masiva).',
    ];
    helpLines.forEach((line, i) => {
      help.getCell(i + 1, 1).value = line;
    });
    help.getRow(1).font = { bold: true };
  } else if (tipo === 'participantes') {
    addCatalogSheet(wb, {
      roles: [...ROLES_PARTICIPANTE],
      sedes: catalogs.sedes,
      escuelas: catalogs.escuelas,
      carreras: catalogs.carreras,
      asignaturas: catalogs.asignaturas,
      sociosComunitarios: catalogs.sociosComunitarios,
    });
    const sheet = wb.addWorksheet('Participantes');
    sheet.addRow([...PARTICIPANTES_HEADERS]);
    styleHeader(sheet, PARTICIPANTES_HEADERS.length);
    const map: { header: string; catCol: number; count: number }[] = [
      { header: 'Rol', catCol: 1, count: ROLES_PARTICIPANTE.length },
      { header: 'Sede', catCol: 2, count: catalogs.sedes.length },
      { header: 'Escuela', catCol: 3, count: catalogs.escuelas.length },
      { header: 'Carrera', catCol: 4, count: catalogs.carreras.length },
      { header: 'Asignatura', catCol: 5, count: catalogs.asignaturas.length },
      {
        header: 'SocioComunitario',
        catCol: 6,
        count: catalogs.sociosComunitarios.length,
      },
    ];
    for (const m of map) {
      const colIdx =
        PARTICIPANTES_HEADERS.indexOf(
          m.header as (typeof PARTICIPANTES_HEADERS)[number]
        ) + 1;
      applyListValidation(
        sheet,
        colIdx,
        catalogRange(colLetter(m.catCol), m.count),
        { strict: true }
      );
    }
  } else if (tipo === 'actividades') {
    const MAX = 500;
    const actSheet = wb.addWorksheet('Actividades');
    // Nombre | Descripcion | Orden | Alerta
    actSheet.addRow([...ACTIVIDAD_SHEET_HEADERS]);
    styleHeader(actSheet, ACTIVIDAD_SHEET_HEADERS.length);
    actSheet.getColumn(1).width = 32;
    actSheet.getColumn(2).width = 40;
    actSheet.getColumn(3).width = 10;
    actSheet.getColumn(4).width = 24;

    const taskSheet = wb.addWorksheet('Tareas');
    // Actividad | Nombre | Descripcion | FechaInicio | FechaFin
    taskSheet.addRow([...TAREA_SHEET_HEADERS]);
    styleHeader(taskSheet, TAREA_SHEET_HEADERS.length);
    taskSheet.getColumn(1).width = 32;
    taskSheet.getColumn(2).width = 28;
    taskSheet.getColumn(3).width = 36;
    taskSheet.getColumn(4).width = 14;
    taskSheet.getColumn(5).width = 14;

    // Dropdown Actividad ← nombres de hoja Actividades (columna A)
    for (let r = 2; r <= MAX + 1; r++) {
      taskSheet.getCell(r, 1).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Actividades!$A$2:$A$${MAX + 1}`],
        showErrorMessage: true,
        errorTitle: 'Actividad',
        error: 'Elige una actividad de la hoja Actividades',
      };
    }

    // Alerta en Actividades: sin fechas (solo tareas las tienen)
    for (let r = 2; r <= MAX + 1; r++) {
      actSheet.getCell(r, 4).value = {
        formula: `IF(A${r}="","",IF(COUNTIF(Tareas!$A$2:$A$${MAX + 1},A${r})=0,"Sin tareas asociadas","OK"))`,
      };
    }

    actSheet.addConditionalFormatting({
      ref: `A2:D${MAX + 1}`,
      rules: [
        {
          type: 'expression',
          priority: 1,
          formulae: [`$D2="Sin tareas asociadas"`],
          style: {
            fill: {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFCCCC' },
            },
            font: { color: { argb: 'FF991B1B' }, bold: true },
          },
        },
      ],
    });

    // Ejemplo
    actSheet.getCell(2, 1).value = 'Diseño del prototipo';
    actSheet.getCell(2, 2).value = 'Fase de diseño';
    actSheet.getCell(2, 3).value = 1;
    taskSheet.getCell(2, 1).value = 'Diseño del prototipo';
    taskSheet.getCell(2, 2).value = 'Wireframes';
    taskSheet.getCell(2, 3).value = 'Bocetos iniciales';
    taskSheet.getCell(2, 4).value = '2026-03-01';
    taskSheet.getCell(2, 5).value = '2026-03-15';
    taskSheet.getCell(3, 1).value = 'Diseño del prototipo';
    taskSheet.getCell(3, 2).value = 'Validación con usuarios';
    taskSheet.getCell(3, 4).value = '2026-03-16';
    taskSheet.getCell(3, 5).value = '2026-03-31';

    const help = wb.addWorksheet('Instrucciones');
    help.getColumn(1).width = 110;
    const helpLines = [
      'Plantilla de carga masiva — Actividades y Tareas (2 hojas)',
      '',
      'Hoja Actividades',
      '- Columnas: Nombre, Descripcion, Orden, Alerta.',
      '- Las actividades NO tienen fechas; las fechas viven solo en las tareas.',
      '- La columna Alerta se calcula sola: si una actividad no tiene tareas en la hoja Tareas,',
      '  muestra "Sin tareas asociadas" y la fila se marca en rojo.',
      '',
      'Hoja Tareas',
      '- Columnas: Actividad, Nombre, Descripcion, FechaInicio, FechaFin.',
      '- Fechas: acepta DD/MM/YYYY (ej. 03/08/2026) o YYYY-MM-DD.',
      '- En Actividad usa el desplegable: se alimenta con los Nombres de la hoja Actividades.',
      '- Así cada tarea queda vinculada automáticamente a su actividad.',
      '- Cada actividad debe tener al menos una tarea (si no, la vista previa en Bitácora también lo rechaza).',
      '- Nombres largos se truncan al límite al importar (actividad 60, tarea 60 caracteres).',
      '',
      'Al importar: primero se crean las actividades y luego las tareas enlazadas por nombre.',
      'Solo se agregan elementos nuevos (no edita actividades ya existentes).',
    ];
    helpLines.forEach((line, i) => {
      help.getCell(i + 1, 1).value = line;
    });
    help.getRow(1).font = { bold: true };
    help.getRow(3).font = { bold: true };
    help.getRow(9).font = { bold: true };
  } else if (tipo === 'indicadores') {
    addCatalogSheet(wb, { formatos: [...FORMATOS_NUMERO] });
    const sheet = wb.addWorksheet('Indicadores');
    sheet.addRow([...INDICADORES_HEADERS]);
    styleHeader(sheet, INDICADORES_HEADERS.length);
    applyListValidation(
      sheet,
      INDICADORES_HEADERS.indexOf('Formato') + 1,
      catalogRange('A', FORMATOS_NUMERO.length),
      { strict: true }
    );
  } else if (tipo === 'presupuesto') {
    addCatalogSheet(wb, { cuentas: [...CUENTAS_PRESUPUESTO] });
    const sheet = wb.addWorksheet('Presupuesto');
    sheet.addRow([...PRESUPUESTO_HEADERS]);
    styleHeader(sheet, PRESUPUESTO_HEADERS.length);
    applyListValidation(
      sheet,
      1,
      catalogRange('A', CUENTAS_PRESUPUESTO.length),
      { strict: true }
    );
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

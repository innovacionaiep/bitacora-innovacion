export type ImportTemplateTipo =
  | 'proyectos'
  | 'participantes'
  | 'actividades'
  | 'indicadores'
  | 'presupuesto';

export type PreviewRowStatus = 'ok' | 'error';

export type PreviewRowResult<T = Record<string, unknown>> = {
  rowNumber: number;
  /** Hoja de origen (p. ej. Actividades / Tareas) */
  sheetName?: string;
  status: PreviewRowStatus;
  errors: string[];
  data?: T;
  summary?: string;
};

export type CatalogMaps = {
  sedesByName: Map<string, { id: string; nombre: string }>;
  escuelasByName: Map<string, { id: string; nombre: string }>;
  carrerasByName: Map<string, { id: string; nombre: string }>;
  asignaturasByName: Map<string, { id: string; nombre: string }>;
  comunasByName: Map<string, { id: string; nombre: string }>;
  gruposByName: Map<string, { id: string; nombre: string }>;
  sociosByName: Map<string, { id: string; nombre: string }>;
  fondosByName: Map<string, { id: string; nombre: string }>;
  /** key: nombre línea lower → { id, nombre, fondoNombre } */
  lineasByName: Map<
    string,
    { id: string; nombre: string; fondoId: string; fondoNombre: string }[]
  >;
};

export const LIST_SEP = ';';

export const FOCALIZACIONES = ['Social', 'Productiva', 'Ambiental'] as const;
export type FocalizacionImport = (typeof FOCALIZACIONES)[number];

export const ROLES_PARTICIPANTE = [
  'Encargado',
  'Coordinador',
  'Colaborador',
  'Docente',
  'Estudiante',
  'Beneficiario',
] as const;

export const CUENTAS_PRESUPUESTO = ['RRHH', 'OPERACION', 'INVERSION'] as const;

export const FORMATOS_NUMERO = [
  'Porcentaje',
  'Número Entero',
  'Número Decimal',
] as const;

export const DT_LEGACY_COLUMNS: { key: string; header: string }[] = [
  { key: 'continuidadFasesAnteriores', header: 'Continuidad de Fases Anteriores' },
  { key: 'pertinenciaLocal', header: 'Pertinencia Local' },
  { key: 'pertinenciaDisciplinar', header: 'Pertinencia Disciplinar' },
  { key: 'necesidadProblema', header: 'Necesidad Problema u Oportunidad' },
  { key: 'publicoObjetivo', header: 'Público Objetivo' },
  { key: 'solucionAvance', header: 'Solución y Nivel de Avance' },
  { key: 'perspectiveGenero', header: 'Perspectiva de Género' },
  { key: 'resultadosContribucion', header: 'Resultados y Contribución Esperada' },
  { key: 'metodologiaMedicion', header: 'Metodología de Medición' },
  { key: 'ejesImpacto', header: 'Ejes de Impacto' },
  { key: 'factorInnovador', header: 'Factor Innovador' },
  { key: 'escalabilidad', header: 'Escalabilidad' },
];

export function isLegacyDtCampoKey(
  key: string | null | undefined
): boolean {
  if (!key) return false;
  return DT_LEGACY_COLUMNS.some((c) => c.key === key);
}

/** Columna DT en plantilla: usa el nombre actual de config (sin prefijo DT:). */
export type DtTemplateColumn = {
  id: string;
  nombre: string;
  campoKey: string | null;
};

/** Mapeo header Excel → destino al importar. */
export type DtHeaderTarget = {
  subcategoriaId: string;
  campoKey: string | null;
};

export const PROYECTOS_BASE_HEADERS = [
  'Nombre',
  'Fondo',
  'Linea',
  'Focalizacion',
  'Sedes',
  'Comunas',
  'Escuelas',
  'Carreras',
  'Asignaturas',
  'GruposInteres',
  'SociosComunitarios',
  'ObjetivoGeneral',
  'ObjetivosEspecificos',
  'YoutubeUrl',
] as const;

export const PARTICIPANTES_HEADERS = [
  'Rol',
  'Nombre',
  'Email',
  'Rut',
  'Cargo',
  'Sede',
  'Escuela',
  'Carrera',
  'Asignatura',
  'SocioComunitario',
  'Labor',
] as const;

export const ACTIVIDADES_HEADERS = [
  'Tipo',
  'Actividad',
  'Nombre',
  'Descripcion',
  'Orden',
  'FechaInicio',
  'FechaFin',
] as const;

/** Hoja Actividades (sin fechas: las dan las tareas). Alerta = fórmula Excel. */
export const ACTIVIDAD_SHEET_HEADERS = [
  'Nombre',
  'Descripcion',
  'Orden',
  'Alerta',
] as const;

/** Hoja Tareas: Actividad se elige del nombre de la hoja Actividades. */
export const TAREA_SHEET_HEADERS = [
  'Actividad',
  'Nombre',
  'Descripcion',
  'FechaInicio',
  'FechaFin',
] as const;

export const INDICADORES_HEADERS = [
  'ObjetivoEspecifico',
  'Nombre',
  'Descripcion',
  'FormaCalculo',
  'ResultadoEsperado',
  'Formato',
  'FechaInicio',
  'FechaFin',
] as const;

export const PRESUPUESTO_HEADERS = [
  'Cuenta',
  'Item',
  'Detalle',
  'Monto',
] as const;

export type ProyectoImportRow = {
  nombre: string;
  fondo: string;
  linea: string | null;
  focalizacion: FocalizacionImport | null;
  sedesIds: string[];
  sedeNombres: string[];
  comunasIds: string[];
  escuelasIds: string[];
  carrerasIds: string[];
  /** Nombres libres o de catálogo; al confirmar se hace match/create por nombre */
  asignaturasNombres: string[];
  gruposInteresIds: string[];
  /** Nombres libres; al confirmar se hace match/create por nombre */
  sociosComunitariosNombres: string[];
  objetivoGeneral: string;
  objetivosEspecificos: string[];
  youtubeUrl: string | null;
  desarrolloTecnico: Record<string, string>;
  desarrolloTecnicoValores: { subcategoriaId: string; valor: string }[];
};

export type ParticipanteImportRow = {
  rol: (typeof ROLES_PARTICIPANTE)[number];
  nombre: string;
  email: string;
  rut: string | null;
  cargo: string | null;
  sedeId: string | null;
  escuelaId: string | null;
  carreraId: string | null;
  asignaturaId: string | null;
  socioComunitarioId: string | null;
  laborEnProyecto: string | null;
};

export type ActividadImportRow =
  | {
      tipo: 'Actividad';
      nombre: string;
      descripcion: string;
      orden: number;
    }
  | {
      tipo: 'Tarea';
      actividadPadre: string;
      nombre: string;
      descripcion: string;
      fechaInicio: string;
      fechaFin: string;
    };

export type IndicadorImportRow = {
  objetivoEspecifico: string;
  nombre: string;
  descripcion: string;
  formaCalculo: string;
  resultadoEsperado: string;
  formatoNumero: string;
  fechaInicio: string | null;
  fechaFin: string | null;
};

export type PresupuestoImportRow = {
  cuenta: (typeof CUENTAS_PRESUPUESTO)[number];
  item: string;
  detalle: string | null;
  monto: number;
};

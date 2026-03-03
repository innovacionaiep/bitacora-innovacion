import {
  Proyecto,
  Escuela,
  Carrera,
  Comuna,
  GrupoInteres,
  SocioComunitario,
  ObjetivoProyecto,
  User,
  DesarrolloTecnico,
  DesarrolloTecnicoValor,
  DesarrolloTecnicoSubcategoria,
  ProyectoParticipante,
  ProyectoEscuela,
  ProyectoCarrera,
  ProyectoComuna,
  ProyectoGrupoInteres,
  ProyectoSocioComunitario,
  Activity,
  Task,
} from '@prisma/client';

// Tipos base para relaciones
export type ProyectoWithRelations = Proyecto & {
  activities?: (Activity & {
    tasks: Task[];
  })[];
  participantes_rel: (ProyectoParticipante & {
    user?: User | null;
    socioComunitario?: SocioComunitario | null;
    sede?: { id: string; nombre: string } | null;
    escuela?: { id: string; nombre: string } | null;
    /** Nombre a mostrar: prioridad cuenta registrada (user) por email, luego participante.nombre */
    displayName?: string | null;
    /** Avatar a mostrar: prioridad cuenta registrada (user) por email */
    displayImage?: string | null;
  })[];
  escuelas: (ProyectoEscuela & {
    escuela: Escuela;
  })[];
  carreras: (ProyectoCarrera & {
    carrera: Carrera;
  })[];
  comunas: (ProyectoComuna & {
    comuna: Comuna;
  })[];
  gruposInteres: (ProyectoGrupoInteres & {
    grupoInteres: GrupoInteres;
  })[];
  sociosComunitarios: (ProyectoSocioComunitario & {
    socioComunitario: SocioComunitario;
  })[];
  objetivos_rel: ObjetivoProyecto[];
  desarrolloTecnico?: DesarrolloTecnico | null;
  desarrolloTecnicoValores?: (DesarrolloTecnicoValor & {
    subcategoria?: DesarrolloTecnicoSubcategoria;
  })[];
};

// Tipo extendido con variaciones mensuales para el dashboard
export type ProyectoConVariaciones = ProyectoWithRelations & {
  variacionGantt: number;
  variacionObjetivos: number;
};

// Tipos para formularios
export type ProyectoFormData = {
  proyecto: string;
  fondo: string;
  sede: string;
  /** Si se envía, se usa para construir sede (varias sedes unidas por coma) */
  sedesIds?: string[];
  focalizacion?: 'Social' | 'Productiva' | 'Ambiental' | null;
  objetivoGeneral: string;
  objetivosEspecificos: string[];
  avanceGantt: number;
  objetivos: number; // ahora "indicadores"
  presupuestoUsado: number;
  presupuestoTotal: number;
  reunionesHechas: number;
  reunionesTotales: number;
  participantes: number;
  // Relaciones (arrays de IDs)
  escuelasIds: string[];
  carrerasIds: string[];
  comunasIds: string[];
  gruposInteresIds: string[];
  sociosComunitariosIds: string[];
  // Participantes
  participantes_rel: Array<{
    userId?: string;
    rol:
      | 'Encargado'
      | 'Coordinador'
      | 'Colaborador'
      | 'Docente'
      | 'Estudiante'
      | 'Beneficiario';
    nombre?: string;
    email?: string;
    cargo?: string;
  }>;
};

// Payload completo del formulario "Crear proyecto" (borrador + createProyectoCompleto)
export type ProyectoFormPayload = ProyectoFormData & {
  youtubeUrl?: string | null;
  desarrolloTecnico?: {
    continuidadFasesAnteriores?: string | null;
    pertinenciaLocal?: string | null;
    pertinenciaDisciplinar?: string | null;
    necesidadProblema?: string | null;
    publicoObjetivo?: string | null;
    solucionAvance?: string | null;
    perspectiveGenero?: string | null;
    resultadosContribucion?: string | null;
    metodologiaMedicion?: string | null;
    ejesImpacto?: string | null;
    factorInnovador?: string | null;
    escalabilidad?: string | null;
  };
  actividades?: Array<{
    name: string;
    description?: string;
    color?: string;
    orderIndex?: number;
    tasks: Array<{
      name: string;
      description?: string;
      startDate: string;
      endDate: string;
    }>;
  }>;
  indicadores?: Array<{
    objetivoEspecificoIndex: number; // índice en objetivosEspecificos
    nombre: string;
    descripcion: string;
    formaCalculo: string;
    resultadoEsperado: string;
    formatoNumero?: string | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
  }>;
  itemsPresupuesto?: Array<{
    cuenta: 'RRHH' | 'OPERACION' | 'INVERSION';
    item: string;
    detalle?: string | null;
    monto: number;
    orden?: number;
  }>;
};

// Sección del índice sticky (completitud)
export type SeccionCompletitud = {
  id: string;
  label: string;
  completado: boolean;
};

// Tipos para catálogos
export type CatalogoItem = {
  id: string;
  nombre: string;
  descripcion?: string;
};

export type EscuelaItem = CatalogoItem & {
  codigo: string;
};

export type CarreraItem = CatalogoItem & {
  escuelaId?: string;
  escuela?: Escuela;
};

export type ComunaItem = CatalogoItem & {
  region: string;
};

export type GrupoInteresItem = CatalogoItem;

export type SocioComunitarioItem = CatalogoItem;

// Tipos para participantes - Ver docs/SISTEMA-ROLES.md
export type ParticipanteProyecto = {
  id: string;
  userId?: string;
  rol:
    | 'Encargado'
    | 'Coordinador'
    | 'Colaborador'
    | 'Docente'
    | 'Estudiante'
    | 'Beneficiario';
  nombre?: string;
  email?: string;
  user?: User;
};

// Tipos para objetivos
export type ObjetivoItem = {
  id: string;
  tipo: 'General' | 'Especifico';
  descripcion: string;
  orden: number;
};

// Tipos para respuestas de API
export type ProyectoResponse = {
  success: boolean;
  data?: ProyectoWithRelations;
  error?: string;
};

export type ProyectosResponse = {
  success: boolean;
  data?: ProyectoWithRelations[];
  error?: string;
};

export type CatalogoResponse<T> = {
  success: boolean;
  data?: T[];
  error?: string;
};

// Tipos para filtros y búsqueda
export type ProyectoFilters = {
  sede?: string;
  escuela?: string;
  carrera?: string;
  comuna?: string;
  grupoInteres?: string;
  focalizacion?: string;
  search?: string;
};

// Tipos para estadísticas
export type ProyectoStats = {
  total: number;
  porSede: Record<string, number>;
  porFocalizacion: Record<string, number>;
  presupuestoTotal: number;
  presupuestoUsado: number;
  avancePromedio: number;
};

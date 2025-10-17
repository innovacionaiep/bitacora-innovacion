import { Proyecto, Escuela, Carrera, Comuna, GrupoInteres, SocioComunitario, ObjetivoProyecto, User } from '@prisma/client';

// Tipos base para relaciones
export type ProyectoWithRelations = Proyecto & {
  participantes_rel: (ProyectoParticipante & {
    user: User;
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
};

// Tipos para formularios
export type ProyectoFormData = {
  proyecto: string;
  fondo: string;
  sede: string;
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
    userId: string;
    rol: 'Encargado' | 'Coordinador' | 'Participante';
  }>;
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

// Tipos para participantes
export type ParticipanteProyecto = {
  id: string;
  userId: string;
  rol: 'Encargado' | 'Coordinador' | 'Participante';
  user: User;
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


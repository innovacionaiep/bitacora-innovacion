import { MULTI_VALUE_SEP } from '@/components/ui/multi-select-nombres';
import { isValidVideoUrl, parseVideoUrl } from '@/lib/video-url';
import {
  type AsignaturaItem,
  type CarreraItem,
  type ComunaItem,
  type EscuelaItem,
  type GrupoInteresItem,
  type SocioComunitarioItem,
  ProyectoWithRelations,
} from '@/types/proyecto';

export type DesarrolloTecnicoFieldKey =
  | 'continuidadFasesAnteriores'
  | 'pertinenciaLocal'
  | 'pertinenciaDisciplinar'
  | 'necesidadProblema'
  | 'publicoObjetivo'
  | 'solucionAvance'
  | 'perspectiveGenero'
  | 'resultadosContribucion'
  | 'metodologiaMedicion'
  | 'ejesImpacto'
  | 'factorInnovador'
  | 'escalabilidad';

export type GeneralFieldId =
  | 'proyecto'
  | 'fondo'
  | 'linea'
  | 'objetivoGeneral'
  | 'objetivosEspecificos'
  | 'video'
  | 'sociosComunitarios'
  | 'sede'
  | 'comunas'
  | 'escuelas'
  | 'carreras'
  | 'asignaturas'
  | 'gruposInteres'
  | `dt.${DesarrolloTecnicoFieldKey}`
  /** Elementos DT creados en config sin campoKey legacy */
  | `dt.sub.${string}`;

export const GENERAL_MULTI_SELECT_FIELDS: GeneralFieldId[] = [
  'sede',
  'comunas',
  'escuelas',
  'carreras',
  'asignaturas',
  'gruposInteres',
];

export type GeneralDraft = {
  proyecto: string;
  fondo: string;
  linea: string;
  objetivoGeneralId?: string;
  objetivoGeneral: string;
  objetivosEspecificos: Array<{
    id: string;
    descripcion: string;
    orden: number;
  }>;
  sede: string;
  escuelasTexto: string;
  carrerasTexto: string;
  asignaturasTexto: string;
  comunasTexto: string;
  gruposInteresTexto: string;
  sociosComunitariosTexto: string;
  desarrolloTecnico: Record<DesarrolloTecnicoFieldKey, string>;
  /** Valores por subcategoriaId (elementos nuevos sin columna legacy) */
  desarrolloTecnicoExtra: Record<string, string>;
};

export const LEGACY_DT_FIELD_KEYS: DesarrolloTecnicoFieldKey[] = [
  'continuidadFasesAnteriores',
  'pertinenciaLocal',
  'pertinenciaDisciplinar',
  'necesidadProblema',
  'publicoObjetivo',
  'solucionAvance',
  'perspectiveGenero',
  'resultadosContribucion',
  'metodologiaMedicion',
  'ejesImpacto',
  'factorInnovador',
  'escalabilidad',
];

export function isLegacyDtFieldKey(
  key: string | null | undefined
): key is DesarrolloTecnicoFieldKey {
  return (
    !!key &&
    (LEGACY_DT_FIELD_KEYS as string[]).includes(key)
  );
}

export type CatalogosGeneral = {
  escuelas: EscuelaItem[];
  carreras: CarreraItem[];
  asignaturas: AsignaturaItem[];
  comunas: ComunaItem[];
  gruposInteres: GrupoInteresItem[];
  sociosComunitarios: SocioComunitarioItem[];
  sedes: { id: string; nombre: string; orden: number }[];
  fondos: { id: string; nombre: string; orden: number }[];
  lineas: {
    id: string;
    nombre: string;
    orden: number;
    fondoId: string;
    fondoNombre: string;
  }[];
};

export const parseProjectVideoUrl = parseVideoUrl;
export const isValidProjectVideoUrl = isValidVideoUrl;

export const buildGeneralDraft = (project: ProyectoWithRelations): GeneralDraft => {
  const objetivoGeneral = project.objetivos_rel?.find(
    (obj) => obj.tipo === 'General'
  );
  const objetivosEspecificos =
    project.objetivos_rel
      ?.filter((obj) => obj.tipo === 'Especifico')
      .sort((a, b) => a.orden - b.orden) ?? [];

  return {
    proyecto: project.proyecto ?? '',
    fondo: project.fondo ?? '',
    linea: project.linea ?? '',
    objetivoGeneralId: objetivoGeneral?.id,
    objetivoGeneral: objetivoGeneral?.descripcion ?? '',
    objetivosEspecificos: objetivosEspecificos.map((obj) => ({
      id: obj.id,
      descripcion: obj.descripcion,
      orden: obj.orden,
    })),
    sede: (project.sede ?? '').replace(/, /g, MULTI_VALUE_SEP),
    escuelasTexto:
      project.escuelas
        ?.map((item) => item.escuela.nombre)
        .join(MULTI_VALUE_SEP) ?? '',
    carrerasTexto:
      project.carreras
        ?.map((item) => item.carrera.nombre)
        .join(MULTI_VALUE_SEP) ?? '',
    asignaturasTexto:
      project.asignaturas
        ?.map((item) => item.asignatura.nombre)
        .join(MULTI_VALUE_SEP) ?? '',
    comunasTexto:
      project.comunas
        ?.map((item) => item.comuna.nombre)
        .join(MULTI_VALUE_SEP) ?? '',
    gruposInteresTexto:
      project.gruposInteres
        ?.map((item) => item.grupoInteres.nombre)
        .join(MULTI_VALUE_SEP) ?? '',
    sociosComunitariosTexto:
      project.sociosComunitarios
        ?.map((item) => item.socioComunitario.nombre)
        .join(MULTI_VALUE_SEP) ?? '',
    desarrolloTecnico: {
      continuidadFasesAnteriores:
        project.desarrolloTecnico?.continuidadFasesAnteriores ?? '',
      pertinenciaLocal: project.desarrolloTecnico?.pertinenciaLocal ?? '',
      pertinenciaDisciplinar:
        project.desarrolloTecnico?.pertinenciaDisciplinar ?? '',
      necesidadProblema: project.desarrolloTecnico?.necesidadProblema ?? '',
      publicoObjetivo: project.desarrolloTecnico?.publicoObjetivo ?? '',
      solucionAvance: project.desarrolloTecnico?.solucionAvance ?? '',
      perspectiveGenero: project.desarrolloTecnico?.perspectiveGenero ?? '',
      resultadosContribucion:
        project.desarrolloTecnico?.resultadosContribucion ?? '',
      metodologiaMedicion: project.desarrolloTecnico?.metodologiaMedicion ?? '',
      ejesImpacto: project.desarrolloTecnico?.ejesImpacto ?? '',
      factorInnovador: project.desarrolloTecnico?.factorInnovador ?? '',
      escalabilidad: project.desarrolloTecnico?.escalabilidad ?? '',
    },
    desarrolloTecnicoExtra: Object.fromEntries(
      (project.desarrolloTecnicoValores ?? [])
        .filter(
          (v) =>
            !isLegacyDtFieldKey(v.subcategoria?.campoKey ?? null)
        )
        .map((v) => [v.subcategoriaId, v.valor ?? ''])
    ),
  };
};

export const parseNameList = (value: string) =>
  value
    .split(MULTI_VALUE_SEP)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

export const mapNamesToIds = (
  names: string[],
  catalogo: { id: string; nombre: string }[]
) => {
  const catalogoMap = new Map(
    catalogo.map((item) => [item.nombre.toLowerCase(), item.id])
  );
  const ids: string[] = [];
  const missing: string[] = [];

  names.forEach((name) => {
    const id = catalogoMap.get(name.toLowerCase());
    if (id) {
      ids.push(id);
    } else {
      missing.push(name);
    }
  });

  return { ids, missing };
};

/** Construye filas de relación para update optimista en UI (sin roundtrip al servidor). */
export function buildOptimisticRelationRows<T extends { id: string }>(
  proyectoId: string,
  ids: string[],
  catalogo: T[],
  foreignKey: string,
  nestedKey: string
) {
  const byId = new Map(catalogo.map((item) => [item.id, item]));
  return ids
    .map((id) => {
      const nested = byId.get(id);
      if (!nested) return null;
      return {
        proyectoId,
        [foreignKey]: id,
        [nestedKey]: nested,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);
}

import { MULTI_VALUE_SEP } from '@/components/ui/multi-select-nombres';
import {
  type CarreraItem,
  type ComunaItem,
  type EscuelaItem,
  type GrupoInteresItem,
  type SocioComunitarioItem,
  ProyectoWithRelations,
} from '@/types/proyecto';

export type GeneralDraft = {
  proyecto: string;
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
  comunasTexto: string;
  gruposInteresTexto: string;
  sociosComunitariosTexto: string;
  desarrolloTecnico: {
    continuidadFasesAnteriores: string;
    pertinenciaLocal: string;
    pertinenciaDisciplinar: string;
    necesidadProblema: string;
    publicoObjetivo: string;
    solucionAvance: string;
    perspectiveGenero: string;
    resultadosContribucion: string;
    metodologiaMedicion: string;
    ejesImpacto: string;
    factorInnovador: string;
    escalabilidad: string;
  };
};

export type CatalogosGeneral = {
  escuelas: EscuelaItem[];
  carreras: CarreraItem[];
  comunas: ComunaItem[];
  gruposInteres: GrupoInteresItem[];
  sociosComunitarios: SocioComunitarioItem[];
  sedes: { id: string; nombre: string; orden: number }[];
};

export const extractYouTubeVideoId = (url: string): string | null => {
  try {
    const urlObj = new URL(url);

    if (
      urlObj.hostname.includes('youtube.com') &&
      urlObj.pathname === '/watch'
    ) {
      return urlObj.searchParams.get('v');
    }

    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }

    return null;
  } catch {
    return null;
  }
};

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

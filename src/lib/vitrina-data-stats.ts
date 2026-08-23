import { isExcludedVitrinaFondo } from '@/lib/vitrina-project-filters';
import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';

export type VitrinaDataBarDatum = {
  label: string;
  value: number;
};

export type VitrinaDataStats = {
  total: number;
  porFondo: VitrinaDataBarDatum[];
  porLinea: VitrinaDataBarDatum[];
  porSede: VitrinaDataBarDatum[];
  porEscuela: VitrinaDataBarDatum[];
  porEtiqueta: VitrinaDataBarDatum[];
};

function countByName(
  proyectos: VitrinaProyecto[],
  pick: (proyecto: VitrinaProyecto) => string[],
  exclude?: (name: string) => boolean,
): VitrinaDataBarDatum[] {
  const counts = new Map<string, number>();
  for (const proyecto of proyectos) {
    const seen = new Set<string>();
    for (const raw of pick(proyecto)) {
      const label = raw.trim();
      if (!label || exclude?.(label) || seen.has(label)) continue;
      seen.add(label);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return a.label.localeCompare(b.label, 'es');
    });
}

export function buildVitrinaDataStats(
  proyectos: VitrinaProyecto[],
): VitrinaDataStats {
  return {
    total: proyectos.length,
    porFondo: countByName(proyectos, (p) => p.fondos, isExcludedVitrinaFondo),
    porLinea: countByName(proyectos, (p) => p.lineas),
    porSede: countByName(proyectos, (p) => p.sedes),
    porEscuela: countByName(proyectos, (p) => p.escuelas),
    porEtiqueta: countByName(proyectos, (p) => p.etiquetas),
  };
}

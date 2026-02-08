/**
 * Migra datos de DesarrolloTecnico (columnas fijas) a DesarrolloTecnicoValor.
 * Ejecutar después de seed-desarrollo-tecnico-config (categorías/subcategorías con campoKey).
 * Uso: pnpm exec tsx prisma/migrate-dt-to-valores.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COLUMNAS: (keyof {
  continuidadFasesAnteriores: string | null;
  pertinenciaLocal: string | null;
  pertinenciaDisciplinar: string | null;
  necesidadProblema: string | null;
  publicoObjetivo: string | null;
  solucionAvance: string | null;
  perspectiveGenero: string | null;
  resultadosContribucion: string | null;
  metodologiaMedicion: string | null;
  ejesImpacto: string | null;
  factorInnovador: string | null;
  escalabilidad: string | null;
})[] = [
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

async function main() {
  const subcategorias = await prisma.desarrolloTecnicoSubcategoria.findMany({
    where: { campoKey: { not: null } },
    select: { id: true, campoKey: true },
  });
  const byCampoKey = new Map<string, string>();
  subcategorias.forEach((s) => {
    if (s.campoKey) byCampoKey.set(s.campoKey, s.id);
  });

  const dtList = await prisma.desarrolloTecnico.findMany();
  let inserted = 0;
  for (const dt of dtList) {
    const row = dt as Record<string, string | null>;
    for (const col of COLUMNAS) {
      const val = row[col];
      if (val != null && String(val).trim() !== '') {
        const subId = byCampoKey.get(col);
        if (subId) {
          await prisma.desarrolloTecnicoValor.upsert({
            where: {
              proyectoId_subcategoriaId: { proyectoId: dt.proyectoId, subcategoriaId: subId },
            },
            create: { proyectoId: dt.proyectoId, subcategoriaId: subId, valor: val },
            update: { valor: val },
          });
          inserted++;
        }
      }
    }
  }
  console.log(`Migración DT: ${dtList.length} proyectos, ${inserted} valores insertados/actualizados.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

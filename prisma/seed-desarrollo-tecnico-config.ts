import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIAS_SUBCATEGORIAS = [
  { nombre: 'Fases anteriores', orden: 0, subcategorias: [{ nombre: 'Continuidad de Fases Anteriores', icono: 'History', orden: 0, campoKey: 'continuidadFasesAnteriores' }] },
  { nombre: 'Impacto', orden: 1, subcategorias: [
    { nombre: 'Pertinencia Local', icono: 'MapPin', orden: 0, campoKey: 'pertinenciaLocal' },
    { nombre: 'Pertinencia Disciplinar', icono: 'GraduationCap', orden: 1, campoKey: 'pertinenciaDisciplinar' },
    { nombre: 'Ejes de Impacto', icono: 'Zap', orden: 2, campoKey: 'ejesImpacto' },
  ]},
  { nombre: 'Público Objetivo', orden: 2, subcategorias: [
    { nombre: 'Público Objetivo', icono: 'Users', orden: 0, campoKey: 'publicoObjetivo' },
    { nombre: 'Perspectiva de Género', icono: 'Heart', orden: 1, campoKey: 'perspectiveGenero' },
  ]},
  { nombre: 'Innovación', orden: 3, subcategorias: [
    { nombre: 'Necesidad, Problema u Oportunidad', icono: 'AlertCircle', orden: 0, campoKey: 'necesidadProblema' },
    { nombre: 'Solución y Nivel de Avance', icono: 'Lightbulb', orden: 1, campoKey: 'solucionAvance' },
    { nombre: 'Factor Innovador', icono: 'TrendingUp', orden: 2, campoKey: 'factorInnovador' },
  ]},
  { nombre: 'Escalabilidad', orden: 4, subcategorias: [
    { nombre: 'Escalabilidad', icono: 'Globe', orden: 0, campoKey: 'escalabilidad' },
  ]},
  { nombre: 'Resultados', orden: 5, subcategorias: [
    { nombre: 'Resultados y Contribución Esperada', icono: 'Target', orden: 0, campoKey: 'resultadosContribucion' },
    { nombre: 'Metodología de Medición', icono: 'BarChart3', orden: 1, campoKey: 'metodologiaMedicion' },
  ]},
];

export async function seedDesarrolloTecnicoConfig() {
  const existing = await prisma.desarrolloTecnicoCategoria.count();
  if (existing > 0) {
    console.log('DesarrolloTecnico categorías ya existen, omitiendo seed.');
    return;
  }
  for (const cat of CATEGORIAS_SUBCATEGORIAS) {
    const created = await prisma.desarrolloTecnicoCategoria.create({
      data: {
        nombre: cat.nombre,
        orden: cat.orden,
        subcategorias: {
          create: cat.subcategorias.map((s) => ({
            nombre: s.nombre,
            icono: s.icono,
            orden: s.orden,
            campoKey: s.campoKey,
          })),
        },
      },
    });
    console.log('Creada categoría:', created.nombre);
  }
  console.log('Seed desarrollo técnico config listo.');
}

seedDesarrolloTecnicoConfig()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

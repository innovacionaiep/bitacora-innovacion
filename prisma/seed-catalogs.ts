import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedCatalogs() {
  console.log('🌱 Seeding catalogs...');

  // Seed Escuelas
  const escuelas = [
    { nombre: 'Artes e Industrias Creativas', codigo: 'AIC' },
    { nombre: 'Gastronomía, Hotelería y Turismo', codigo: 'GHT' },
    { nombre: 'Estética Integral', codigo: 'EI' },
    { nombre: 'Tecnología', codigo: 'TEC' },
    { nombre: 'Negocios', codigo: 'NEG' },
  ];

  for (const escuela of escuelas) {
    await prisma.escuela.upsert({
      where: { codigo: escuela.codigo },
      update: {},
      create: escuela,
    });
  }

  // Seed Grupos de Interés (basado en la imagen)
  const gruposInteres = [
    { nombre: 'Sociedad civil', descripcion: 'Organizaciones de la sociedad civil' },
    { nombre: 'Organizaciones sociales', descripcion: 'Organizaciones sociales y comunitarias' },
    { nombre: 'Sector productivo y de servicios', descripcion: 'Empresas del sector productivo y de servicios' },
    { nombre: 'Municipalidades y organismos públicos', descripcion: 'Instituciones públicas y municipales' },
  ];

  for (const grupo of gruposInteres) {
    await prisma.grupoInteres.upsert({
      where: { nombre: grupo.nombre },
      update: {},
      create: grupo,
    });
  }

  // Seed Carreras (placeholder - se actualizará con la lista completa)
  const carreras = [
    { nombre: 'Contabilidad', escuelaId: null },
    { nombre: 'Administración de Empresas', escuelaId: null },
    { nombre: 'Operaciones Logísticas', escuelaId: null },
    { nombre: 'Desarrollo Social', escuelaId: null },
    { nombre: 'Educación', escuelaId: null },
  ];

  for (const carrera of carreras) {
    await prisma.carrera.upsert({
      where: { nombre: carrera.nombre },
      update: {},
      create: carrera,
    });
  }

  // Seed Comunas (placeholder - se actualizará con la lista completa)
  const comunas = [
    { nombre: 'San Bernardo', region: 'Metropolitana' },
    { nombre: 'Antofagasta', region: 'Antofagasta' },
    { nombre: 'La Serena', region: 'Coquimbo' },
    { nombre: 'Los Ángeles', region: 'Biobío' },
    { nombre: 'Santiago', region: 'Metropolitana' },
  ];

  for (const comuna of comunas) {
    await prisma.comuna.upsert({
      where: { nombre: comuna.nombre },
      update: {},
      create: comuna,
    });
  }

  console.log('✅ Catalogs seeded successfully');
}

if (require.main === module) {
  seedCatalogs()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}


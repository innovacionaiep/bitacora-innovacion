import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedComplete() {
  console.log('🌱 Iniciando seed completo...');

  try {
    // 1. Limpiar datos existentes
    console.log('🧹 Limpiando datos existentes...');
    await prisma.objetivoProyecto.deleteMany();
    await prisma.proyectoSocioComunitario.deleteMany();
    await prisma.proyectoGrupoInteres.deleteMany();
    await prisma.proyectoComuna.deleteMany();
    await prisma.proyectoCarrera.deleteMany();
    await prisma.proyectoEscuela.deleteMany();
    await prisma.proyectoParticipante.deleteMany();
    await prisma.proyecto.deleteMany();
    await prisma.socioComunitario.deleteMany();
    await prisma.grupoInteres.deleteMany();
    await prisma.comuna.deleteMany();
    await prisma.carrera.deleteMany();
    await prisma.escuela.deleteMany();
    await prisma.user.deleteMany();

    // 2. Crear usuarios
    console.log('👥 Creando usuarios...');
    const admin = await prisma.user.create({
      data: {
        name: 'Administrador',
        email: 'admin@test.com',
        password: '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJbtJjXvEB4yF59lW3K', // password
        activeRole: 'Admin',
      },
    });

    const encargado = await prisma.user.create({
      data: {
        name: 'Rosa Diaz Soto',
        email: 'rosa.diaz.s@aiep.cl',
        password: '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJbtJjXvEB4yF59lW3K',
        activeRole: 'Encargado',
      },
    });

    const coordinador = await prisma.user.create({
      data: {
        name: 'Carlos Mendez',
        email: 'carlos.mendez@aiep.cl',
        password: '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJbtJjXvEB4yF59lW3K',
        activeRole: 'Coordinador',
      },
    });

    // 3. Crear catálogos
    console.log('📚 Creando catálogos...');

    // Escuelas
    const escuelas = await Promise.all([
      prisma.escuela.create({ data: { nombre: 'Artes e Industrias Creativas', codigo: 'AIC' } }),
      prisma.escuela.create({ data: { nombre: 'Gastronomía, Hotelería y Turismo', codigo: 'GHT' } }),
      prisma.escuela.create({ data: { nombre: 'Estética Integral', codigo: 'EI' } }),
      prisma.escuela.create({ data: { nombre: 'Tecnología', codigo: 'TEC' } }),
      prisma.escuela.create({ data: { nombre: 'Negocios', codigo: 'NEG' } }),
    ]);

    // Carreras
    const carreras = await Promise.all([
      prisma.carrera.create({ data: { nombre: 'Contabilidad', escuelaId: escuelas[4].id } }),
      prisma.carrera.create({ data: { nombre: 'Administración de Empresas', escuelaId: escuelas[4].id } }),
      prisma.carrera.create({ data: { nombre: 'Operaciones Logísticas', escuelaId: escuelas[4].id } }),
      prisma.carrera.create({ data: { nombre: 'Desarrollo Social', escuelaId: escuelas[0].id } }),
      prisma.carrera.create({ data: { nombre: 'Educación', escuelaId: escuelas[0].id } }),
    ]);

    // Comunas
    const comunas = await Promise.all([
      prisma.comuna.create({ data: { nombre: 'San Bernardo', region: 'Metropolitana' } }),
      prisma.comuna.create({ data: { nombre: 'Antofagasta', region: 'Antofagasta' } }),
      prisma.comuna.create({ data: { nombre: 'La Serena', region: 'Coquimbo' } }),
      prisma.comuna.create({ data: { nombre: 'Los Ángeles', region: 'Biobío' } }),
      prisma.comuna.create({ data: { nombre: 'Santiago', region: 'Metropolitana' } }),
    ]);

    // Grupos de Interés
    const gruposInteres = await Promise.all([
      prisma.grupoInteres.create({ data: { nombre: 'Sociedad civil', descripcion: 'Organizaciones de la sociedad civil' } }),
      prisma.grupoInteres.create({ data: { nombre: 'Organizaciones sociales', descripcion: 'Organizaciones sociales y comunitarias' } }),
      prisma.grupoInteres.create({ data: { nombre: 'Sector productivo y de servicios', descripcion: 'Empresas del sector productivo y de servicios' } }),
      prisma.grupoInteres.create({ data: { nombre: 'Municipalidades y organismos públicos', descripcion: 'Instituciones públicas y municipales' } }),
    ]);

    // Socios Comunitarios
    const sociosComunitarios = await Promise.all([
      prisma.socioComunitario.create({ data: { nombre: 'Sercotec', descripcion: 'Servicio de Cooperación Técnica' } }),
      prisma.socioComunitario.create({ data: { nombre: 'Dideco San Bernardo', descripcion: 'Dirección de Desarrollo Comunitario' } }),
      prisma.socioComunitario.create({ data: { nombre: 'Organizaciones Civiles', descripcion: 'Organizaciones de la sociedad civil' } }),
    ]);

    // 4. Crear proyectos de ejemplo
    console.log('📁 Creando proyectos...');

    const proyecto1 = await prisma.proyecto.create({
      data: {
        proyecto: "TechLakou: Alfabetización digital y emprendimiento tecnológico para haitianos",
        fondo: "IMPULSA",
        sede: "San Bernardo",
        focalizacion: "Social",
        avanceGantt: 45,
        objetivos: 60,
        presupuestoUsado: 3500000,
        presupuestoTotal: 7000000,
        reunionesHechas: 5,
        reunionesTotales: 10,
        participantes: 25,
      },
    });

    // Crear relaciones del proyecto 1
    await prisma.proyectoEscuela.createMany({
      data: [
        { proyectoId: proyecto1.id, escuelaId: escuelas[4].id }, // Negocios
        { proyectoId: proyecto1.id, escuelaId: escuelas[0].id }, // Artes e Industrias Creativas
      ],
    });

    await prisma.proyectoCarrera.createMany({
      data: [
        { proyectoId: proyecto1.id, carreraId: carreras[0].id }, // Contabilidad
        { proyectoId: proyecto1.id, carreraId: carreras[1].id }, // Administración de Empresas
        { proyectoId: proyecto1.id, carreraId: carreras[2].id }, // Operaciones Logísticas
      ],
    });

    await prisma.proyectoComuna.create({
      data: { proyectoId: proyecto1.id, comunaId: comunas[0].id }, // San Bernardo
    });

    await prisma.proyectoGrupoInteres.createMany({
      data: [
        { proyectoId: proyecto1.id, grupoInteresId: gruposInteres[0].id }, // Sociedad civil
        { proyectoId: proyecto1.id, grupoInteresId: gruposInteres[1].id }, // Organizaciones sociales
        { proyectoId: proyecto1.id, grupoInteresId: gruposInteres[2].id }, // Sector productivo
        { proyectoId: proyecto1.id, grupoInteresId: gruposInteres[3].id }, // Municipalidades
      ],
    });

    await prisma.proyectoSocioComunitario.createMany({
      data: [
        { proyectoId: proyecto1.id, socioComunitarioId: sociosComunitarios[0].id }, // Sercotec
        { proyectoId: proyecto1.id, socioComunitarioId: sociosComunitarios[1].id }, // Dideco San Bernardo
        { proyectoId: proyecto1.id, socioComunitarioId: sociosComunitarios[2].id }, // Organizaciones Civiles
      ],
    });

    await prisma.proyectoParticipante.createMany({
      data: [
        { proyectoId: proyecto1.id, userId: encargado.id, rol: 'Encargado' },
        { proyectoId: proyecto1.id, userId: coordinador.id, rol: 'Coordinador' },
      ],
    });

    await prisma.objetivoProyecto.createMany({
      data: [
        {
          proyectoId: proyecto1.id,
          tipo: 'General',
          descripcion: 'Fortalecer los emprendimientos de la comunidad haitiana en San Bernardo, mediante competencias en alfabetización digital, marketing y gestión contable, con enfoque inclusivo e intercultural.',
          orden: 0,
        },
        {
          proyectoId: proyecto1.id,
          tipo: 'Especifico',
          descripcion: 'Identificar las brechas digitales y necesidades de formación de la comunidad haitiana',
          orden: 1,
        },
        {
          proyectoId: proyecto1.id,
          tipo: 'Especifico',
          descripcion: 'Implementar talleres formativos en herramientas digitales aplicadas al emprendimiento',
          orden: 2,
        },
        {
          proyectoId: proyecto1.id,
          tipo: 'Especifico',
          descripcion: 'Capacitar a la comunidad haitiana en competencias lingüísticas funcionales en español y creolé, orientadas al uso de plataformas digitales y la promoción de sus emprendimientos.',
          orden: 3,
        },
      ],
    });

    // Proyecto 2
    const proyecto2 = await prisma.proyecto.create({
      data: {
        proyecto: "AntofaSuena 2025. Música-Industria-Territorio",
        fondo: "IMPULSA",
        sede: "Antofagasta",
        focalizacion: "Productiva",
        avanceGantt: 30,
        objetivos: 40,
        presupuestoUsado: 2000000,
        presupuestoTotal: 5000000,
        reunionesHechas: 3,
        reunionesTotales: 8,
        participantes: 15,
      },
    });

    await prisma.proyectoEscuela.create({
      data: { proyectoId: proyecto2.id, escuelaId: escuelas[0].id }, // Artes e Industrias Creativas
    });

    await prisma.proyectoComuna.create({
      data: { proyectoId: proyecto2.id, comunaId: comunas[1].id }, // Antofagasta
    });

    await prisma.proyectoGrupoInteres.createMany({
      data: [
        { proyectoId: proyecto2.id, grupoInteresId: gruposInteres[0].id },
        { proyectoId: proyecto2.id, grupoInteresId: gruposInteres[2].id },
      ],
    });

    await prisma.objetivoProyecto.createMany({
      data: [
        {
          proyectoId: proyecto2.id,
          tipo: 'General',
          descripcion: 'Fortalecer la industria musical de Antofagasta mediante la creación de espacios de encuentro entre artistas locales, productores y la comunidad.',
          orden: 0,
        },
        {
          proyectoId: proyecto2.id,
          tipo: 'Especifico',
          descripcion: 'Organizar festivales musicales que promuevan el talento local',
          orden: 1,
        },
        {
          proyectoId: proyecto2.id,
          tipo: 'Especifico',
          descripcion: 'Desarrollar una plataforma digital para promover el talento regional',
          orden: 2,
        },
      ],
    });

    console.log('✅ Seed completo finalizado exitosamente');
    console.log(`📊 Creados: ${escuelas.length} escuelas, ${carreras.length} carreras, ${comunas.length} comunas`);
    console.log(`📊 Creados: ${gruposInteres.length} grupos de interés, ${sociosComunitarios.length} socios comunitarios`);
    console.log(`📊 Creados: 2 proyectos con todas sus relaciones`);

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedComplete()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}


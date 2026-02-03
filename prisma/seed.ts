import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Limpiar datos existentes
  console.log('🧹 Limpiando datos existentes...');
  await prisma.task.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.proyecto.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Crear usuarios
  console.log('👥 Creando usuarios...');

  const passwordHash = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      name: 'Admin User',
      password: passwordHash,
      activeRole: 'Admin',
      roles: {
        create: [{ role: 'Admin' }, { role: 'Coordinador' }],
      },
    },
  });

  // Usuario docente con rol Docente y Colaborador - Ver docs/SISTEMA-ROLES.md
  const docenteUser = await prisma.user.create({
    data: {
      email: 'docente@test.com',
      name: 'María Docente',
      password: passwordHash,
      activeRole: 'Docente',
      roles: {
        create: [{ role: 'Docente' }, { role: 'Colaborador' }],
      },
    },
  });

  const coordinadorUser = await prisma.user.create({
    data: {
      email: 'coordinador@test.com',
      name: 'Juan Coordinador',
      password: passwordHash,
      activeRole: 'Coordinador',
      roles: {
        create: [{ role: 'Coordinador' }, { role: 'Encargado' }],
      },
    },
  });

  console.log(
    `✅ Usuarios creados: ${adminUser.email}, ${docenteUser.email}, ${coordinadorUser.email}`
  );

  // Crear proyectos
  console.log('📁 Creando proyectos...');

  const proyecto1 = await prisma.proyecto.create({
    data: {
      proyecto: 'AntofaSuena 2025. Música-Industria-Territorio',
      fondo: 'IMPULSA',
      sede: 'Antofagasta',
      avanceGantt: 45,
      objetivos: 60,
      presupuestoUsado: 3500000,
      presupuestoTotal: 7000000,
      reunionesHechas: 5,
      reunionesTotales: 10,
      participantes: 25,
    },
  });

  const proyecto2 = await prisma.proyecto.create({
    data: {
      proyecto: 'Laboratorio de Innovación Gastronómico',
      fondo: 'IMPULSA',
      sede: 'La Serena',
      avanceGantt: 30,
      objetivos: 40,
      presupuestoUsado: 2000000,
      presupuestoTotal: 5000000,
      reunionesHechas: 3,
      reunionesTotales: 8,
      participantes: 18,
    },
  });

  const proyecto3 = await prisma.proyecto.create({
    data: {
      proyecto: 'Aqua Terra: Estética Consciente',
      fondo: 'IMPULSA',
      sede: 'Los Ángeles',
      avanceGantt: 70,
      objetivos: 75,
      presupuestoUsado: 4200000,
      presupuestoTotal: 6000000,
      reunionesHechas: 7,
      reunionesTotales: 9,
      participantes: 15,
    },
  });

  console.log(
    `✅ Proyectos creados: ${proyecto1.proyecto}, ${proyecto2.proyecto}, ${proyecto3.proyecto}`
  );

  // Crear actividades y tareas para Proyecto 1
  console.log('📊 Creando actividades y tareas...');

  const actividad1 = await prisma.activity.create({
    data: {
      name: 'Planificación y Diseño',
      description: 'Fase inicial del proyecto',
      progress: 100,
      projectId: proyecto1.id,
      color: 'bg-gray-700',
      orderIndex: 0,
      tasks: {
        create: [
          {
            name: 'Definir objetivos del proyecto',
            description: 'Establecer metas y KPIs',
            completed: true,
            startDate: '2024-01-01',
            endDate: '2024-01-15',
            progress: 100,
          },
          {
            name: 'Crear plan de trabajo',
            description: 'Cronograma detallado',
            completed: true,
            startDate: '2024-01-16',
            endDate: '2024-01-31',
            progress: 100,
          },
        ],
      },
    },
  });

  const actividad2 = await prisma.activity.create({
    data: {
      name: 'Ejecución',
      description: 'Implementación del proyecto',
      progress: 33,
      projectId: proyecto1.id,
      color: 'bg-gray-700',
      orderIndex: 1,
      tasks: {
        create: [
          {
            name: 'Organizar primer festival',
            description: 'Evento musical principal',
            completed: true,
            startDate: '2024-02-01',
            endDate: '2024-03-01',
            progress: 100,
          },
          {
            name: 'Desarrollar plataforma digital',
            description: 'Sitio web para artistas',
            completed: false,
            startDate: '2024-02-15',
            endDate: '2024-04-15',
            progress: 0,
          },
          {
            name: 'Talleres de producción musical',
            description: 'Capacitación para artistas locales',
            completed: false,
            startDate: '2024-03-01',
            endDate: '2024-05-01',
            progress: 0,
          },
        ],
      },
    },
  });

  const actividad3 = await prisma.activity.create({
    data: {
      name: 'Cierre y Evaluación',
      description: 'Evaluación de resultados',
      progress: 0,
      projectId: proyecto1.id,
      color: 'bg-gray-700',
      orderIndex: 2,
      tasks: {
        create: [
          {
            name: 'Recopilación de métricas',
            description: 'Análisis de datos del proyecto',
            completed: false,
            startDate: '2024-05-01',
            endDate: '2024-05-15',
            progress: 0,
          },
          {
            name: 'Informe final',
            description: 'Documento de cierre',
            completed: false,
            startDate: '2024-05-16',
            endDate: '2024-05-31',
            progress: 0,
          },
        ],
      },
    },
  });

  // Crear actividades para Proyecto 2
  const actividad4 = await prisma.activity.create({
    data: {
      name: 'Investigación de Mercado',
      description: 'Análisis del sector gastronómico',
      progress: 50,
      projectId: proyecto2.id,
      color: 'bg-gray-700',
      orderIndex: 0,
      tasks: {
        create: [
          {
            name: 'Encuestas a chefs locales',
            description: 'Recopilación de opiniones',
            completed: true,
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            progress: 100,
          },
          {
            name: 'Análisis de tendencias',
            description: 'Estudio de mercado',
            completed: false,
            startDate: '2024-02-01',
            endDate: '2024-02-28',
            progress: 0,
          },
        ],
      },
    },
  });

  const actividad5 = await prisma.activity.create({
    data: {
      name: 'Montaje de Laboratorio',
      description: 'Preparación del espacio físico',
      progress: 25,
      projectId: proyecto2.id,
      color: 'bg-gray-700',
      orderIndex: 1,
      tasks: {
        create: [
          {
            name: 'Adquisición de equipamiento',
            description: 'Compra de herramientas y maquinaria',
            completed: true,
            startDate: '2024-02-01',
            endDate: '2024-03-15',
            progress: 100,
          },
          {
            name: 'Adecuación del espacio',
            description: 'Remodelación y diseño',
            completed: false,
            startDate: '2024-03-01',
            endDate: '2024-04-30',
            progress: 0,
          },
          {
            name: 'Certificaciones sanitarias',
            description: 'Permisos y habilitaciones',
            completed: false,
            startDate: '2024-04-01',
            endDate: '2024-05-15',
            progress: 0,
          },
          {
            name: 'Contratación de personal',
            description: 'Selección de equipo',
            completed: false,
            startDate: '2024-04-15',
            endDate: '2024-05-31',
            progress: 0,
          },
        ],
      },
    },
  });

  // Crear actividades para Proyecto 3
  const actividad6 = await prisma.activity.create({
    data: {
      name: 'Desarrollo de Productos',
      description: 'Formulación de línea de productos',
      progress: 100,
      projectId: proyecto3.id,
      color: 'bg-gray-700',
      orderIndex: 0,
      tasks: {
        create: [
          {
            name: 'Investigación de ingredientes naturales',
            description: 'Selección de materias primas',
            completed: true,
            startDate: '2024-01-01',
            endDate: '2024-02-15',
            progress: 100,
          },
          {
            name: 'Formulación de productos',
            description: 'Creación de recetas',
            completed: true,
            startDate: '2024-02-01',
            endDate: '2024-03-31',
            progress: 100,
          },
        ],
      },
    },
  });

  const actividad7 = await prisma.activity.create({
    data: {
      name: 'Marketing y Lanzamiento',
      description: 'Estrategia de comercialización',
      progress: 50,
      projectId: proyecto3.id,
      color: 'bg-gray-700',
      orderIndex: 1,
      tasks: {
        create: [
          {
            name: 'Diseño de packaging',
            description: 'Identidad visual de productos',
            completed: true,
            startDate: '2024-03-01',
            endDate: '2024-04-15',
            progress: 100,
          },
          {
            name: 'Campaña en redes sociales',
            description: 'Estrategia digital',
            completed: false,
            startDate: '2024-04-01',
            endDate: '2024-05-31',
            progress: 0,
          },
        ],
      },
    },
  });

  console.log(
    `✅ Actividades creadas: ${actividad1.name}, ${actividad2.name}, ${actividad3.name}, etc.`
  );

  console.log('');
  console.log('✅ Seed completado exitosamente!');
  console.log('');
  console.log('📊 Resumen:');
  console.log(`   - ${3} usuarios creados`);
  console.log(`   - ${3} proyectos creados`);
  console.log(`   - ${7} actividades creadas`);
  console.log(`   - ~${20} tareas creadas`);
  console.log('');
  console.log('🔑 Credenciales de prueba:');
  console.log('   admin@test.com / password123 (Admin, Coordinador)');
  console.log('   docente@test.com / password123 (Docente, Colaborador)');
  console.log('   coordinador@test.com / password123 (Coordinador, Encargado)');
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error en seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

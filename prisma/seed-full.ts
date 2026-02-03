import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Arrays de datos para generar contenido variado
const PROJECT_NAMES = [
  'TechLakou: Alfabetización digital y emprendimiento tecnológico para haitianos',
  'AntofaSuena 2025. Música-Industria-Territorio',
  'Laboratorio de Innovación Gastronómico Regional',
  'Aqua Terra: Estética Consciente y Sustentable',
  'SmartCity: Desarrollo de Aplicaciones Móviles para Municipios',
  'BioGastronomy: Cocina Sustentable con Productos Locales',
  'ArtEdu: Plataforma Digital para Educación Artística',
  'GreenTech: Soluciones Tecnológicas para la Agricultura',
  'Cultural Hub: Centro de Innovación Cultural y Creativa',
  'EcoFashion: Moda Sustentable y Diseño Textil',
];

const SEDES = [
  'San Bernardo',
  'Antofagasta',
  'La Serena',
  'Los Ángeles',
  'Santiago',
  'Valparaíso',
  'Concepción',
  'Temuco',
  'Iquique',
  'Rancagua',
];

const FONDOS = ['IMPULSA', 'CORFO', 'FONDART', 'SERCOTEC', 'FOSIS'];

const FOCALIZACIONES = ['Social', 'Productiva', 'Ambiental'];

const ACTIVITY_NAMES = [
  'Planificación y Diseño del Proyecto',
  'Investigación y Análisis de Mercado',
  'Desarrollo de Prototipos',
  'Implementación y Ejecución',
  'Capacitación y Formación',
  'Marketing y Comunicación',
  'Evaluación y Monitoreo',
  'Escalamiento y Expansión',
  'Documentación y Reportes',
  'Cierre y Entrega Final',
];

const TASK_TEMPLATES = [
  {
    name: 'Definir objetivos y alcance',
    description: 'Establecer metas claras y delimitaciones del proyecto',
  },
  {
    name: 'Crear plan de trabajo detallado',
    description: 'Desarrollar cronograma y asignación de recursos',
  },
  {
    name: 'Implementar solución piloto',
    description: 'Ejecutar primera fase del proyecto',
  },
  {
    name: 'Evaluar resultados y ajustar',
    description: 'Analizar progreso y realizar mejoras necesarias',
  },
];

const COLORS = [
  'bg-blue-600',
  'bg-green-600',
  'bg-purple-600',
  'bg-orange-600',
  'bg-red-600',
  'bg-teal-600',
  'bg-pink-600',
  'bg-indigo-600',
  'bg-yellow-600',
  'bg-cyan-600',
];

// Función para generar fechas aleatorias en 2025
function generateRandomDate2025() {
  const start = new Date('2025-01-01');
  const end = new Date('2025-12-31');
  const randomTime =
    start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(randomTime);
}

// Función para generar fechas secuenciales para tareas
function generateTaskDates(baseDate: Date, taskIndex: number) {
  const startDate = new Date(baseDate);
  startDate.setDate(startDate.getDate() + taskIndex * 7); // 1 semana entre tareas

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 14); // 2 semanas de duración por tarea

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

async function seedFullDatabase() {
  console.log('🌱 Iniciando seed completo de la base de datos...');

  try {
    // 1. Limpiar datos existentes (excepto admin)
    console.log('🧹 Limpiando datos existentes...');
    await prisma.task.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.objetivoProyecto.deleteMany();
    await prisma.proyectoSocioComunitario.deleteMany();
    await prisma.proyectoGrupoInteres.deleteMany();
    await prisma.proyectoComuna.deleteMany();
    await prisma.proyectoCarrera.deleteMany();
    await prisma.proyectoEscuela.deleteMany();
    await prisma.proyectoParticipante.deleteMany();
    await prisma.proyecto.deleteMany();
    await prisma.carrera.deleteMany();
    await prisma.comuna.deleteMany();
    await prisma.grupoInteres.deleteMany();
    await prisma.socioComunitario.deleteMany();

    // Limpiar roles de usuarios (excepto admin)
    await prisma.userRole.deleteMany({
      where: {
        user: {
          email: {
            not: 'admin@test.com',
          },
        },
      },
    });

    // Eliminar usuarios (excepto admin)
    await prisma.user.deleteMany({
      where: {
        email: {
          not: 'admin@test.com',
        },
      },
    });

    // 2. Crear catálogos si no existen
    console.log('📚 Creando catálogos...');

    // Escuelas
    const escuelas = await Promise.all([
      prisma.escuela.upsert({
        where: { codigo: 'AIC' },
        update: {},
        create: { nombre: 'Artes e Industrias Creativas', codigo: 'AIC' },
      }),
      prisma.escuela.upsert({
        where: { codigo: 'GHT' },
        update: {},
        create: { nombre: 'Gastronomía, Hotelería y Turismo', codigo: 'GHT' },
      }),
      prisma.escuela.upsert({
        where: { codigo: 'EI' },
        update: {},
        create: { nombre: 'Estética Integral', codigo: 'EI' },
      }),
      prisma.escuela.upsert({
        where: { codigo: 'TEC' },
        update: {},
        create: { nombre: 'Tecnología', codigo: 'TEC' },
      }),
      prisma.escuela.upsert({
        where: { codigo: 'NEG' },
        update: {},
        create: { nombre: 'Negocios', codigo: 'NEG' },
      }),
    ]);

    // Carreras
    const carrerasData = [
      { nombre: 'Contabilidad', escuelaId: escuelas[4].id },
      { nombre: 'Administración de Empresas', escuelaId: escuelas[4].id },
      { nombre: 'Desarrollo de Software', escuelaId: escuelas[3].id },
      { nombre: 'Gastronomía', escuelaId: escuelas[1].id },
      { nombre: 'Artes Visuales', escuelaId: escuelas[0].id },
    ];

    // Limpiar carreras existentes y crear nuevas
    await prisma.carrera.deleteMany();
    const carreras = await Promise.all(
      carrerasData.map((data) => prisma.carrera.create({ data }))
    );

    // Comunas
    const comunasData = [
      { nombre: 'San Bernardo', region: 'Metropolitana' },
      { nombre: 'Antofagasta', region: 'Antofagasta' },
      { nombre: 'La Serena', region: 'Coquimbo' },
      { nombre: 'Los Ángeles', region: 'Biobío' },
      { nombre: 'Santiago', region: 'Metropolitana' },
    ];

    await prisma.comuna.deleteMany();
    const comunas = await Promise.all(
      comunasData.map((data) => prisma.comuna.create({ data }))
    );

    // Grupos de Interés
    const gruposInteresData = [
      {
        nombre: 'Sociedad civil',
        descripcion: 'Organizaciones de la sociedad civil',
      },
      {
        nombre: 'Organizaciones sociales',
        descripcion: 'Organizaciones sociales y comunitarias',
      },
      {
        nombre: 'Sector productivo y de servicios',
        descripcion: 'Empresas del sector productivo y de servicios',
      },
      {
        nombre: 'Municipalidades y organismos públicos',
        descripcion: 'Instituciones públicas y municipales',
      },
    ];

    await prisma.grupoInteres.deleteMany();
    const gruposInteres = await Promise.all(
      gruposInteresData.map((data) => prisma.grupoInteres.create({ data }))
    );

    // Socios Comunitarios
    const sociosComunitariosData = [
      { nombre: 'Sercotec', descripcion: 'Servicio de Cooperación Técnica' },
      {
        nombre: 'Dideco San Bernardo',
        descripcion: 'Dirección de Desarrollo Comunitario',
      },
      {
        nombre: 'Organizaciones Civiles',
        descripcion: 'Organizaciones de la sociedad civil',
      },
    ];

    await prisma.socioComunitario.deleteMany();
    const sociosComunitarios = await Promise.all(
      sociosComunitariosData.map((data) =>
        prisma.socioComunitario.create({ data })
      )
    );

    // 3. Crear usuarios (preservar admin y crear 10 nuevos)
    console.log('👥 Creando usuarios...');
    const passwordHash = await bcrypt.hash('password123', 10);

    // Verificar si admin existe, si no, crearlo. Si existe, actualizar contraseña.
    let adminUser = await prisma.user.findUnique({
      where: { email: 'admin@test.com' },
    });

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@test.com',
          name: 'Administrador del Sistema',
          password: passwordHash,
          activeRole: 'Admin',
        },
      });
    } else {
      // Actualizar la contraseña del admin si ya existe
      adminUser = await prisma.user.update({
        where: { email: 'admin@test.com' },
        data: { password: passwordHash },
      });
    }

    // Crear 10 usuarios adicionales
    const usuarios = [adminUser];
    const nombres = [
      'María González Pérez',
      'Carlos Rodríguez Silva',
      'Ana Martínez López',
      'Luis Fernández García',
      'Carmen Jiménez Ruiz',
      'Roberto Sánchez Morales',
      'Isabel Torres Vega',
      'Miguel Herrera Ramos',
      'Elena Castro Díaz',
      'Antonio Moreno Flores',
    ];

    for (let i = 0; i < 10; i++) {
      const usuario = await prisma.user.create({
        data: {
          email: `usuario${i + 1}@test.com`,
          name: nombres[i],
          password: passwordHash,
          activeRole: 'Colaborador',
        },
      });
      usuarios.push(usuario);
    }

    // Asignar todos los roles a todos los usuarios
    console.log('🔐 Asignando roles a usuarios...');
    // Roles según docs/SISTEMA-ROLES.md
    const roles = [
      'Admin',
      'Coordinador',
      'Colaborador',
      'Encargado',
      'Docente',
      'Estudiante',
      'Beneficiario',
    ];

    // Crear todos los roles de usuario
    const userRolesData = [];
    for (const usuario of usuarios) {
      for (const rol of roles) {
        userRolesData.push({
          userId: usuario.id,
          role: rol,
        });
      }
    }

    await prisma.userRole.createMany({
      data: userRolesData,
      skipDuplicates: true,
    });

    // 4. Crear 10 proyectos con todas sus relaciones
    console.log('📁 Creando proyectos...');
    const proyectos = [];

    for (let i = 0; i < 10; i++) {
      const proyecto = await prisma.proyecto.create({
        data: {
          proyecto: PROJECT_NAMES[i],
          fondo: FONDOS[Math.floor(Math.random() * FONDOS.length)],
          sede: SEDES[Math.floor(Math.random() * SEDES.length)],
          focalizacion:
            FOCALIZACIONES[Math.floor(Math.random() * FOCALIZACIONES.length)],
          avanceGantt: Math.floor(Math.random() * 100),
          objetivos: Math.floor(Math.random() * 100),
          presupuestoUsado: Math.floor(Math.random() * 3000000) + 1000000,
          presupuestoTotal: Math.floor(Math.random() * 5000000) + 3000000,
          reunionesHechas: Math.floor(Math.random() * 8) + 1,
          reunionesTotales: Math.floor(Math.random() * 12) + 8,
          participantes: Math.floor(Math.random() * 20) + 10,
        },
      });
      proyectos.push(proyecto);

      // Crear relaciones del proyecto
      // Escuelas (asignar 1-3 escuelas aleatorias)
      const numEscuelas = Math.floor(Math.random() * 3) + 1;
      const escuelasSeleccionadas = escuelas
        .sort(() => 0.5 - Math.random())
        .slice(0, numEscuelas);
      for (const escuela of escuelasSeleccionadas) {
        await prisma.proyectoEscuela.create({
          data: { proyectoId: proyecto.id, escuelaId: escuela.id },
        });
      }

      // Carreras
      const numCarreras = Math.floor(Math.random() * 3) + 1;
      const carrerasSeleccionadas = carreras
        .sort(() => 0.5 - Math.random())
        .slice(0, numCarreras);
      for (const carrera of carrerasSeleccionadas) {
        await prisma.proyectoCarrera.create({
          data: { proyectoId: proyecto.id, carreraId: carrera.id },
        });
      }

      // Comunas (asignar 1-2 comunas)
      const numComunas = Math.floor(Math.random() * 2) + 1;
      const comunasSeleccionadas = comunas
        .sort(() => 0.5 - Math.random())
        .slice(0, numComunas);
      for (const comuna of comunasSeleccionadas) {
        await prisma.proyectoComuna.create({
          data: { proyectoId: proyecto.id, comunaId: comuna.id },
        });
      }

      // Grupos de Interés (asignar 2-4 grupos)
      const numGrupos = Math.floor(Math.random() * 3) + 2;
      const gruposSeleccionados = gruposInteres
        .sort(() => 0.5 - Math.random())
        .slice(0, numGrupos);
      for (const grupo of gruposSeleccionados) {
        await prisma.proyectoGrupoInteres.create({
          data: { proyectoId: proyecto.id, grupoInteresId: grupo.id },
        });
      }

      // Socios Comunitarios (asignar 1-3 socios)
      const numSocios = Math.floor(Math.random() * 3) + 1;
      const sociosSeleccionados = sociosComunitarios
        .sort(() => 0.5 - Math.random())
        .slice(0, numSocios);
      for (const socio of sociosSeleccionados) {
        await prisma.proyectoSocioComunitario.create({
          data: { proyectoId: proyecto.id, socioComunitarioId: socio.id },
        });
      }

      // Participantes del proyecto (asignar 2-5 usuarios)
      const numParticipantes = Math.floor(Math.random() * 4) + 2;
      const participantesSeleccionados = usuarios
        .sort(() => 0.5 - Math.random())
        .slice(0, numParticipantes);
      // Roles de proyecto según docs/SISTEMA-ROLES.md
      const rolesParticipacion = [
        'Encargado',
        'Coordinador',
        'Colaborador',
        'Docente',
        'Estudiante',
        'Beneficiario',
      ];

      for (let j = 0; j < participantesSeleccionados.length; j++) {
        const rolParticipacion =
          rolesParticipacion[j % rolesParticipacion.length];
        await prisma.proyectoParticipante.create({
          data: {
            proyectoId: proyecto.id,
            userId: participantesSeleccionados[j].id,
            rol: rolParticipacion,
          },
        });
      }

      // Objetivos del proyecto
      // Crear objetivo general
      await prisma.objetivoProyecto.create({
        data: {
          proyectoId: proyecto.id,
          tipo: 'General',
          descripcion: `Objetivo general del proyecto ${proyecto.proyecto}: Desarrollar e implementar soluciones innovadoras que generen impacto positivo en la comunidad.`,
          orden: 0,
        },
      });

      // Plantilla de objetivos específicos variados
      const objetivosEspecificosTemplates = [
        `Identificar y analizar las necesidades específicas del sector objetivo para el proyecto ${proyecto.proyecto}.`,
        `Implementar las soluciones propuestas con metodologías participativas y enfoque en resultados medibles.`,
        `Capacitar a los beneficiarios en el uso y mantenimiento de las soluciones implementadas.`,
        `Desarrollar estrategias de difusión y comunicación para maximizar el impacto del proyecto ${proyecto.proyecto}.`,
        `Establecer alianzas estratégicas con actores clave del sector para fortalecer la sostenibilidad del proyecto.`,
        `Evaluar y monitorear continuamente el progreso y los resultados del proyecto ${proyecto.proyecto}.`,
        `Fortalecer las capacidades técnicas y organizacionales de los participantes del proyecto.`,
        `Generar evidencia y documentación que permita replicar y escalar las soluciones implementadas.`,
      ];

      // Generar entre 3 y 4 objetivos específicos aleatorios por proyecto
      const numObjetivosEspecificos = Math.floor(Math.random() * 2) + 3; // 3 o 4 objetivos
      const objetivosSeleccionados = objetivosEspecificosTemplates
        .sort(() => 0.5 - Math.random())
        .slice(0, numObjetivosEspecificos);

      // Crear los objetivos específicos seleccionados
      const objetivosEspecificosData = objetivosSeleccionados.map(
        (descripcion, index) => ({
          proyectoId: proyecto.id,
          tipo: 'Especifico' as const,
          descripcion: descripcion,
          orden: index + 1,
        })
      );

      await prisma.objetivoProyecto.createMany({
        data: objetivosEspecificosData,
      });
    }

    // 5. Crear actividades y tareas para cada proyecto
    console.log('📊 Creando actividades y tareas...');

    for (const proyecto of proyectos) {
      // Generar fecha base aleatoria en 2025 para el proyecto
      const fechaBaseProyecto = generateRandomDate2025();

      for (let i = 0; i < 10; i++) {
        const progresoActividad = Math.floor(Math.random() * 100);
        const color = COLORS[i % COLORS.length];

        const actividad = await prisma.activity.create({
          data: {
            name: ACTIVITY_NAMES[i],
            description: `Descripción detallada de la actividad: ${ACTIVITY_NAMES[i]} para el proyecto ${proyecto.proyecto}`,
            progress: progresoActividad,
            projectId: proyecto.id,
            color: color,
            orderIndex: i,
          },
        });

        // Crear 4 tareas para cada actividad
        for (let j = 0; j < 4; j++) {
          const taskTemplate = TASK_TEMPLATES[j];
          const taskDates = generateTaskDates(fechaBaseProyecto, i * 4 + j);
          const estaCompletada = Math.random() > 0.4; // 60% de probabilidad de estar completada
          const progresoTarea = estaCompletada
            ? 100
            : Math.floor(Math.random() * 90);

          await prisma.task.create({
            data: {
              name: `${taskTemplate.name} - ${actividad.name}`,
              description: `${taskTemplate.description} para la actividad ${actividad.name}`,
              completed: estaCompletada,
              startDate: taskDates.startDate,
              endDate: taskDates.endDate,
              progress: progresoTarea,
              activityId: actividad.id,
            },
          });
        }
      }
    }

    console.log('');
    console.log('✅ Seed completo finalizado exitosamente!');
    console.log('');
    console.log('📊 Resumen de datos creados:');
    console.log(`   👥 ${usuarios.length} usuarios (incluyendo admin)`);
    console.log(
      `   🔐 ${usuarios.length * roles.length} roles de usuario asignados`
    );
    console.log(`   📁 ${proyectos.length} proyectos creados`);
    console.log(`   📊 ${proyectos.length * 10} actividades creadas`);
    console.log(`   ✅ ${proyectos.length * 40} tareas creadas`);
    console.log(
      `   📚 ${escuelas.length} escuelas, ${carreras.length} carreras, ${comunas.length} comunas`
    );
    console.log('');
    console.log(
      '═══════════════════════════════════════════════════════════════'
    );
    console.log('🔑 CREDENCIALES DE PRUEBA - TODOS LOS USUARIOS');
    console.log(
      '═══════════════════════════════════════════════════════════════'
    );
    console.log('');
    console.log('📝 Contraseña para TODOS los usuarios: password123');
    console.log('');
    console.log(
      '┌─────────────────────────────────────────────────────────────┐'
    );
    console.log(
      '│ Usuario                  │ Email                    │ Rol Activo │'
    );
    console.log(
      '├─────────────────────────────────────────────────────────────┤'
    );

    // Mostrar admin
    const u0 = usuarios[0];
    console.log(
      `│ ${(u0.name ?? '').padEnd(24)} │ ${u0.email.padEnd(24)} │ ${(u0.activeRole ?? '').padEnd(10)} │`
    );

    // Mostrar los 10 usuarios adicionales
    for (let i = 1; i < usuarios.length; i++) {
      const usuario = usuarios[i];
      console.log(
        `│ ${(usuario.name ?? '').padEnd(24)} │ ${usuario.email.padEnd(24)} │ ${(usuario.activeRole ?? '').padEnd(10)} │`
      );
    }

    console.log(
      '└─────────────────────────────────────────────────────────────┘'
    );
    console.log('');
    console.log('📋 FORMATO DE CREDENCIALES:');
    console.log('');
    for (const usuario of usuarios) {
      console.log(`   Email: ${usuario.email}`);
      console.log(`   Contraseña: password123`);
      console.log(`   Nombre: ${usuario.name ?? ''}`);
      console.log(`   Rol Activo: ${usuario.activeRole ?? ''}`);
      console.log(`   Roles Disponibles: ${roles.join(', ')}`);
      console.log('');
    }
    console.log(
      '═══════════════════════════════════════════════════════════════'
    );
    console.log('');
    console.log(
      '📅 Fechas: Todas las tareas están distribuidas entre enero-diciembre 2025'
    );
    console.log(
      '🎨 Colores: Las actividades tienen colores variados para mejor visualización'
    );
    console.log('');
  } catch (error) {
    console.error('❌ Error durante el seed completo:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  seedFullDatabase().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { seedFullDatabase };

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDesarrolloTecnico() {
  console.log('🌱 Iniciando seed de desarrollo técnico...');

  try {
    // Obtener todos los proyectos existentes
    const proyectos = await prisma.proyecto.findMany();
    console.log(
      `📊 Encontrados ${proyectos.length} proyectos para poblar con desarrollo técnico`
    );

    for (const proyecto of proyectos) {
      console.log(`📝 Procesando proyecto: ${proyecto.proyecto}`);

      // Crear desarrollo técnico basado en las características del proyecto
      const desarrolloTecnico = await prisma.desarrolloTecnico.upsert({
        where: { proyectoId: proyecto.id },
        update: {},
        create: {
          proyectoId: proyecto.id,
          continuidadFasesAnteriores: getContinuidadFasesAnteriores(
            proyecto.proyecto
          ),
          pertinenciaLocal: getPertinenciaLocal(
            proyecto.sede,
            proyecto.focalizacion
          ),
          pertinenciaDisciplinar: getPertinenciaDisciplinar(
            proyecto.proyecto,
            proyecto.sede
          ),
          necesidadProblema: getNecesidadProblema(
            proyecto.proyecto,
            proyecto.sede
          ),
          publicoObjetivo: getPublicoObjetivo(proyecto.proyecto, proyecto.sede),
          solucionAvance: getSolucionAvance(
            proyecto.proyecto,
            proyecto.avanceGantt
          ),
          perspectiveGenero: getPerspectivaGenero(proyecto.proyecto),
          resultadosContribucion: getResultadosContribucion(proyecto.proyecto),
          metodologiaMedicion: getMetodologiaMedicion(proyecto.proyecto),
          ejesImpacto: getEjesImpacto(proyecto.focalizacion, proyecto.proyecto),
          factorInnovador: getFactorInnovador(proyecto.proyecto),
          escalabilidad: getEscalabilidad(proyecto.proyecto, proyecto.sede),
        },
      });

      console.log(`✅ Desarrollo técnico creado para: ${proyecto.proyecto}`);
    }

    console.log('🎉 Seed de desarrollo técnico completado exitosamente');
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Funciones para generar contenido específico por proyecto
function getContinuidadFasesAnteriores(nombreProyecto: string): string {
  const continuidades: Record<string, string> = {
    TechLakou:
      'Este proyecto es una iniciativa pionera en la alfabetización digital para la comunidad haitiana en Chile. No es continuidad de fases anteriores, sino una propuesta innovadora que surge de la identificación de brechas digitales específicas en la población migrante. Los elementos diferenciadores incluyen el enfoque intercultural, la adaptación de herramientas digitales al contexto haitiano, y la integración de competencias lingüísticas funcionales.',
    AntofaSuena:
      'AntofaSuena representa la evolución natural de iniciativas musicales previas en la región. Se basa en el aprendizaje de festivales anteriores organizados por la comunidad artística local. Los elementos innovadores incluyen la integración de tecnología digital para la promoción, la creación de una plataforma online permanente, y el enfoque en la sostenibilidad económica del sector musical regional.',
    'Laboratorio de Innovación Gastronómico':
      'No aplica. Este es un proyecto nuevo que surge de la necesidad de modernizar la gastronomía regional con técnicas contemporáneas.',
    'Aqua Terra':
      'No aplica. Proyecto inaugural que combina estética consciente con sostenibilidad ambiental.',
  };

  return (
    continuidades[nombreProyecto] ||
    'No aplica. Este proyecto representa una nueva iniciativa en el área correspondiente.'
  );
}

function getPertinenciaLocal(
  sede: string,
  focalizacion: string | null
): string {
  const pertinencias: Record<string, string> = {
    'San Bernardo':
      'San Bernardo presenta una alta concentración de población migrante, especialmente de origen haitiano, que enfrenta barreras de integración socioeconómica. El proyecto es altamente pertinente para abordar las brechas digitales y de emprendimiento que limitan las oportunidades de desarrollo de esta comunidad. La localización estratégica permite un impacto directo en la población objetivo.',
    Antofagasta:
      'Antofagasta, como capital minera del país, presenta una economía tradicional que requiere diversificación. El proyecto es pertinente para desarrollar nuevas industrias creativas y tecnológicas que complementen la actividad minera, generando empleo y oportunidades para jóvenes profesionales.',
    'La Serena':
      'La Serena, con su patrimonio histórico y potencial turístico, requiere iniciativas que fortalezcan su oferta cultural y gastronómica. El proyecto es pertinente para posicionar la región como destino de turismo cultural y gastronómico.',
    'Los Ángeles':
      'Los Ángeles, en la región del Biobío, presenta oportunidades para desarrollar industrias creativas y tecnológicas. El proyecto es pertinente para diversificar la economía local y generar nuevas oportunidades de empleo.',
    Santiago:
      'Santiago, como centro económico y cultural del país, presenta múltiples oportunidades para iniciativas innovadoras. El proyecto es pertinente para aprovechar la concentración de talento, recursos y mercado disponible.',
  };

  return (
    pertinencias[sede] ||
    `El proyecto es pertinente para ${sede} al abordar necesidades específicas de la región en el área ${focalizacion || 'correspondiente'}.`
  );
}

function getPertinenciaDisciplinar(
  nombreProyecto: string,
  sede: string
): string {
  if (nombreProyecto.includes('TechLakou')) {
    return 'Desde la Escuela de Administración y Gestión Empresarial, la iniciativa articula competencias en gestión, marketing digital y contabilidad, alineadas con el enfoque de desarrollo de capacidades de Sen (1999) y con los ODS 8 y 10 sobre trabajo decente y reducción de desigualdades. La integración de competencias tecnológicas con gestión empresarial responde a las necesidades actuales del mercado laboral.';
  }

  if (nombreProyecto.includes('AntofaSuena')) {
    return 'Desde la Escuela de Artes e Industrias Creativas, el proyecto integra competencias en producción musical, gestión cultural y tecnologías digitales. Se alinea con las tendencias actuales de la industria musical global y las oportunidades de la economía creativa, contribuyendo al desarrollo de un ecosistema musical sostenible.';
  }

  if (nombreProyecto.includes('Gastronómico')) {
    return 'Desde la Escuela de Gastronomía, Hotelería y Turismo, el proyecto integra técnicas culinarias tradicionales con innovación gastronómica. Se alinea con las tendencias de gastronomía sostenible y turismo culinario, contribuyendo al desarrollo de la industria gastronómica regional.';
  }

  if (nombreProyecto.includes('Aqua Terra')) {
    return 'Desde la Escuela de Estética Integral, el proyecto combina competencias en estética con principios de sostenibilidad ambiental. Se alinea con las tendencias de belleza consciente y productos eco-friendly, contribuyendo al desarrollo de una industria cosmética más sostenible.';
  }

  return 'El proyecto se alinea con las competencias específicas de la escuela correspondiente y contribuye al desarrollo del área disciplinar mediante la integración de conocimientos teóricos y prácticos.';
}

function getNecesidadProblema(nombreProyecto: string, sede: string): string {
  if (nombreProyecto.includes('TechLakou')) {
    return 'La comunidad haitiana en San Bernardo enfrenta múltiples barreras para consolidar emprendimientos sostenibles. Según estudios locales, un alto porcentaje trabaja en la informalidad, con acceso limitado a redes, financiamiento y herramientas digitales. Además, persisten brechas idiomáticas, educativas y de integración sociolaboral. Esta exclusión digital impide su participación plena en el ecosistema económico local. El proyecto aborda esta necesidad mediante formación tecnológica aplicada, entregando herramientas concretas en alfabetización digital, marketing y contabilidad básica para fortalecer emprendimientos existentes o emergentes.';
  }

  if (nombreProyecto.includes('AntofaSuena')) {
    return 'La industria musical de Antofagasta enfrenta desafíos de visibilidad, profesionalización y sostenibilidad económica. Los artistas locales carecen de plataformas adecuadas para promocionar su trabajo y generar ingresos sostenibles. Existe una desconexión entre el talento local y las oportunidades de mercado regional y nacional. El proyecto aborda esta necesidad creando espacios de encuentro, plataformas digitales y redes de apoyo que permitan a los artistas desarrollar sus carreras de manera profesional y sostenible.';
  }

  if (nombreProyecto.includes('Gastronómico')) {
    return 'La gastronomía regional enfrenta el desafío de modernizarse manteniendo su identidad tradicional. Los chefs locales necesitan herramientas y espacios para experimentar con técnicas contemporáneas y desarrollar nuevas propuestas que atraigan turismo y generen empleo. El proyecto aborda esta necesidad creando un laboratorio de innovación que combine tradición con modernidad.';
  }

  if (nombreProyecto.includes('Aqua Terra')) {
    return 'La industria cosmética tradicional presenta problemas ambientales significativos, con productos que contienen ingredientes nocivos para la salud y el medio ambiente. Los consumidores buscan alternativas más saludables y sostenibles, pero las opciones locales son limitadas. El proyecto aborda esta necesidad desarrollando una línea de productos estéticos conscientes que sean saludables para el usuario y sostenibles para el planeta.';
  }

  return `El proyecto aborda necesidades específicas identificadas en ${sede}, contribuyendo al desarrollo económico, social o ambiental de la región mediante soluciones innovadoras y sostenibles.`;
}

function getPublicoObjetivo(nombreProyecto: string, sede: string): string {
  if (nombreProyecto.includes('TechLakou')) {
    return 'Personas migrantes de origen haitiano residentes en San Bernardo, especialmente aquellas que desarrollan actividades económicas informales y presentan barreras idiomáticas, tecnológicas y sociales que dificultan su inclusión económica y visibilidad en el territorio. También incluye a organizaciones comunitarias que trabajan con esta población y empresas locales interesadas en diversificar su fuerza laboral.';
  }

  if (nombreProyecto.includes('AntofaSuena')) {
    return 'Artistas musicales locales de Antofagasta, productores musicales, gestores culturales, y la comunidad en general interesada en el desarrollo cultural de la región. También incluye a empresarios del sector turístico y cultural que pueden beneficiarse del fortalecimiento de la industria musical local.';
  }

  if (nombreProyecto.includes('Gastronómico')) {
    return 'Chefs profesionales y en formación, estudiantes de gastronomía, empresarios del sector turístico y gastronómico, y la comunidad local interesada en el desarrollo de la gastronomía regional. También incluye a turistas que buscan experiencias gastronómicas auténticas.';
  }

  if (nombreProyecto.includes('Aqua Terra')) {
    return 'Consumidores conscientes interesados en productos de belleza sostenibles, profesionales de la estética, estudiantes de estética integral, y empresas del sector cosmético que buscan diferenciarse con productos eco-friendly. También incluye a la comunidad local interesada en estilos de vida más sostenibles.';
  }

  return `El proyecto se dirige a la comunidad local de ${sede}, incluyendo profesionales, estudiantes, empresarios y la población general interesada en el desarrollo del área correspondiente.`;
}

function getSolucionAvance(nombreProyecto: string, avance: number): string {
  const avanceTexto =
    avance > 0
      ? `El proyecto se encuentra en un ${avance}% de avance, con actividades fundamentales ya implementadas.`
      : 'El proyecto se encuentra en fase inicial de implementación.';

  if (nombreProyecto.includes('TechLakou')) {
    return `La solución consiste en un programa integral de alfabetización digital y emprendimiento que incluye: 1) Talleres de formación en herramientas digitales básicas, 2) Capacitación en marketing digital y gestión contable, 3) Desarrollo de una plataforma digital para visibilizar emprendimientos haitianos, 4) Creación de redes de apoyo entre emprendedores. ${avanceTexto} Se ha establecido alianzas estratégicas con organizaciones comunitarias y se ha iniciado la identificación de participantes.`;
  }

  if (nombreProyecto.includes('AntofaSuena')) {
    return `La solución incluye: 1) Organización de festivales musicales que promuevan el talento local, 2) Desarrollo de una plataforma digital para la promoción de artistas, 3) Talleres de profesionalización para músicos, 4) Creación de redes de colaboración entre artistas y productores. ${avanceTexto} Se han realizado las primeras actividades de mapeo del talento local y se ha establecido contacto con artistas y organizaciones culturales.`;
  }

  if (nombreProyecto.includes('Gastronómico')) {
    return `La solución contempla: 1) Creación de un laboratorio de innovación gastronómica equipado con tecnología moderna, 2) Talleres de técnicas culinarias contemporáneas, 3) Desarrollo de menús que combinen tradición e innovación, 4) Programas de capacitación para chefs locales. ${avanceTexto} Se ha completado la planificación del laboratorio y se han iniciado las actividades de capacitación.`;
  }

  if (nombreProyecto.includes('Aqua Terra')) {
    return `La solución incluye: 1) Desarrollo de una línea de productos estéticos con ingredientes naturales y sostenibles, 2) Capacitación en técnicas de estética consciente, 3) Creación de protocolos de producción eco-friendly, 4) Programas de educación sobre belleza sostenible. ${avanceTexto} Se han realizado las primeras investigaciones sobre ingredientes locales y se ha iniciado el desarrollo de prototipos.`;
  }

  return `La solución propuesta aborda las necesidades identificadas mediante un enfoque integral que combina formación, tecnología y desarrollo de capacidades. ${avanceTexto}`;
}

function getPerspectivaGenero(nombreProyecto: string): string {
  if (nombreProyecto.includes('TechLakou')) {
    return 'El proyecto integra la perspectiva de género reconociendo que las mujeres haitianas enfrentan barreras adicionales en el acceso a la tecnología y el emprendimiento. Se implementan talleres específicos para mujeres, se promueve el liderazgo femenino en los emprendimientos, y se incluyen contenidos sobre equidad de género en todos los módulos de formación. Se establecen protocolos para prevenir y abordar situaciones de discriminación.';
  }

  if (nombreProyecto.includes('AntofaSuena')) {
    return 'El proyecto promueve la participación equitativa de mujeres y hombres en la industria musical, incluyendo talleres específicos para mujeres artistas, promoción de festivales con paridad de género, y creación de redes de apoyo para mujeres en el sector musical. Se abordan temas de equidad en la industria y se promueve el reconocimiento del talento femenino.';
  }

  if (nombreProyecto.includes('Gastronómico')) {
    return 'El proyecto reconoce el importante rol de las mujeres en la gastronomía tradicional y promueve su liderazgo en la innovación gastronómica. Se incluyen talleres específicos para mujeres chef, se promueve el reconocimiento de técnicas culinarias tradicionales desarrolladas por mujeres, y se abordan temas de equidad en la industria gastronómica.';
  }

  if (nombreProyecto.includes('Aqua Terra')) {
    return 'El proyecto integra la perspectiva de género reconociendo las diferentes necesidades de cuidado y estética entre mujeres y hombres. Se desarrollan productos inclusivos, se promueve la participación de hombres en el cuidado personal, y se abordan temas de diversidad y inclusión en la industria de la belleza.';
  }

  return 'El proyecto integra la perspectiva de género en todas sus actividades, promoviendo la participación equitativa de mujeres y hombres, reconociendo las diferentes necesidades y barreras, y contribuyendo a la construcción de una sociedad más igualitaria.';
}

function getResultadosContribucion(nombreProyecto: string): string {
  if (nombreProyecto.includes('TechLakou')) {
    return 'Resultados esperados: 1) 25 emprendedores haitianos capacitados en herramientas digitales, 2) 15 emprendimientos visibilizados en plataforma digital, 3) Incremento del 40% en ingresos de emprendimientos participantes, 4) Red de 50 emprendedores conectados. Contribución: Fortalecimiento de la inclusión económica de la población migrante haitiana, reducción de brechas digitales, y promoción de la diversidad cultural en el emprendimiento local.';
  }

  if (nombreProyecto.includes('AntofaSuena')) {
    return 'Resultados esperados: 1) 50 artistas locales participando en festivales, 2) Plataforma digital con 100 artistas registrados, 3) 3 festivales musicales organizados, 4) Incremento del 30% en eventos culturales locales. Contribución: Fortalecimiento de la industria musical regional, generación de empleo en el sector cultural, y posicionamiento de Antofagasta como capital musical del norte.';
  }

  if (nombreProyecto.includes('Gastronómico')) {
    return 'Resultados esperados: 1) 30 chefs capacitados en técnicas contemporáneas, 2) 20 nuevas propuestas gastronómicas desarrolladas, 3) Incremento del 25% en turismo gastronómico, 4) 1 laboratorio de innovación funcionando. Contribución: Modernización de la gastronomía regional, generación de empleo en el sector turístico, y promoción de la identidad culinaria local.';
  }

  if (nombreProyecto.includes('Aqua Terra')) {
    return 'Resultados esperados: 1) Línea de 10 productos estéticos sostenibles desarrollados, 2) 40 profesionales capacitados en estética consciente, 3) Reducción del 60% en uso de ingredientes químicos nocivos, 4) 200 consumidores sensibilizados sobre belleza sostenible. Contribución: Promoción de una industria cosmética más saludable y sostenible, reducción del impacto ambiental, y educación sobre consumo consciente.';
  }

  return 'El proyecto contribuirá al desarrollo económico, social o ambiental de la región mediante la generación de empleo, la formación de capital humano, la innovación en el área correspondiente, y el fortalecimiento de las capacidades locales.';
}

function getMetodologiaMedicion(nombreProyecto: string): string {
  return `La metodología de medición incluye: 1) Indicadores cuantitativos (número de participantes, eventos realizados, productos desarrollados), 2) Indicadores cualitativos (satisfacción de participantes, calidad de resultados, impacto en la comunidad), 3) Evaluaciones de proceso (seguimiento de actividades, cumplimiento de cronogramas), 4) Evaluaciones de impacto (medición de cambios en la población objetivo), 5) Herramientas de recolección (encuestas, entrevistas, grupos focales, observación participante). Se realizarán evaluaciones trimestrales y una evaluación final con análisis de impacto.`;
}

function getEjesImpacto(
  focalizacion: string | null,
  nombreProyecto: string
): string {
  const ejes = [];

  if (focalizacion === 'Social') {
    ejes.push(
      'Impacto Social: Fortalecimiento de la cohesión social, mejora de la calidad de vida de la población objetivo, reducción de desigualdades, y promoción de la inclusión y diversidad cultural.'
    );
  }

  if (focalizacion === 'Productiva') {
    ejes.push(
      'Impacto Productivo: Generación de empleo, desarrollo de nuevas industrias, fortalecimiento del ecosistema empresarial local, y diversificación de la economía regional.'
    );
  }

  if (focalizacion === 'Ambiental') {
    ejes.push(
      'Impacto Ambiental: Reducción del impacto ambiental, promoción de prácticas sostenibles, conservación de recursos naturales, y educación sobre sostenibilidad.'
    );
  }

  // Agregar impacto tecnológico si es relevante
  if (
    nombreProyecto.includes('TechLakou') ||
    nombreProyecto.includes('AntofaSuena')
  ) {
    ejes.push(
      'Impacto Tecnológico: Reducción de brechas digitales, modernización de procesos, adopción de nuevas tecnologías, y fortalecimiento de competencias digitales en la población.'
    );
  }

  if (ejes.length === 0) {
    ejes.push(
      'Impacto Integral: El proyecto genera impacto en múltiples dimensiones, contribuyendo al desarrollo integral de la región mediante la formación de capital humano, la innovación, y el fortalecimiento de las capacidades locales.'
    );
  }

  return ejes.join(' ');
}

function getFactorInnovador(nombreProyecto: string): string {
  if (nombreProyecto.includes('TechLakou')) {
    return 'Factor Innovador: La integración de alfabetización digital con enfoque intercultural específico para la comunidad haitiana representa una innovación en el campo de la inclusión digital. La combinación de competencias tecnológicas, lingüísticas y empresariales en un programa integral es diferenciadora. La propuesta de valor incluye la creación de una plataforma digital específica para emprendimientos haitianos y el desarrollo de metodologías adaptadas culturalmente.';
  }

  if (nombreProyecto.includes('AntofaSuena')) {
    return 'Factor Innovador: La integración de tecnología digital con la industria musical tradicional representa una innovación en la promoción cultural regional. La creación de una plataforma permanente para artistas locales y la organización de festivales con enfoque en sostenibilidad económica es diferenciadora. La propuesta de valor incluye el desarrollo de un ecosistema musical integral que conecta artistas, productores y audiencias.';
  }

  if (nombreProyecto.includes('Gastronómico')) {
    return 'Factor Innovador: La combinación de técnicas gastronómicas tradicionales con innovación contemporánea representa una propuesta diferenciadora. El desarrollo de un laboratorio de innovación gastronómica que preserve la identidad local mientras incorpora técnicas modernas es innovador. La propuesta de valor incluye la creación de experiencias gastronómicas únicas que atraigan turismo y generen empleo.';
  }

  if (nombreProyecto.includes('Aqua Terra')) {
    return 'Factor Innovador: La integración de principios de sostenibilidad ambiental con la industria de la estética representa una innovación en el sector cosmético. El desarrollo de productos estéticos conscientes que sean saludables y sostenibles es diferenciador. La propuesta de valor incluye la promoción de una belleza responsable que cuide tanto al usuario como al medio ambiente.';
  }

  return 'Factor Innovador: El proyecto incorpora elementos innovadores en su enfoque, metodología o resultados, diferenciándose de iniciativas similares mediante la integración de nuevas tecnologías, metodologías creativas, o enfoques integrales que generan valor agregado para la población objetivo y la región.';
}

function getEscalabilidad(nombreProyecto: string, sede: string): string {
  return `Planes de Escalabilidad: El proyecto contempla estrategias de expansión que incluyen: 1) Replicación en otras comunas de la región, 2) Adaptación del modelo a otras poblaciones con necesidades similares, 3) Creación de redes interregionales de colaboración, 4) Desarrollo de protocolos y metodologías transferibles. Estrategia de Adopción: Se implementarán estrategias para que otros actores (municipalidades, organizaciones, empresas) adopten la solución, incluyendo: 1) Capacitación de equipos locales, 2) Transferencia de metodologías y herramientas, 3) Creación de alianzas estratégicas, 4) Documentación de buenas prácticas para replicación. El objetivo es generar un modelo sostenible que pueda ser implementado por otros actores una vez finalizado el proyecto piloto.`;
}

if (require.main === module) {
  seedDesarrolloTecnico().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { seedDesarrolloTecnico };

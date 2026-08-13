import { describe, expect, it } from 'vitest';
import {
  CONJUGACIONES_HISTORIAL,
  conjugarAccion,
  formatHistorialFrase,
} from '@/lib/historial-mensaje';

const INFINITIVOS = /\b(agregar|eliminar|actualizar|crear|subir|reemplazar|comentar|marcar|validar)\b/i;

describe('conjugarAccion', () => {
  it('nunca deja un infinitivo tras "ha" para las acciones conocidas', () => {
    for (const accion of Object.keys(CONJUGACIONES_HISTORIAL)) {
      const participio = conjugarAccion(accion, 'Actividades');
      expect(participio, accion).not.toMatch(INFINITIVOS);
      expect(participio.charAt(0)).toBe(participio.charAt(0).toLowerCase());
    }
  });

  it('distingue género al marcar realizada', () => {
    expect(conjugarAccion('Marcar realizada', 'Actividades')).toBe(
      'marcado como realizada'
    );
    expect(conjugarAccion('Marcar realizada', 'Seguimiento')).toBe(
      'marcado como realizado'
    );
  });

  it('cubre altas de reunión nuevas y viejas', () => {
    expect(conjugarAccion('Agregar')).toBe('agregado una reunión');
    expect(conjugarAccion('Agregar reunión')).toBe('agregado una reunión');
  });

  it('convierte un infinitivo desconocido a participio', () => {
    expect(conjugarAccion('Foobarizar')).toBe('foobarizado');
    expect(conjugarAccion('foobarizado')).toBe('foobarizado');
  });
});

describe('formatHistorialFrase', () => {
  it('agrega un compromiso sin duplicar el texto', () => {
    const frase = formatHistorialFrase({
      persona: 'Javiera Escudero',
      accion: 'Agregar compromiso',
      tabProyecto: 'Seguimiento',
      elementoEspecifico: '',
      cambioGenerado: 'Docente completa las tareas asociadas a cada actividad',
    });
    expect(frase).toBe(
      'Javiera Escudero ha agregado un compromiso en Seguimiento: "Docente completa las tareas asociadas a cada actividad"'
    );
  });

  it('deduplica registros viejos donde elemento y cambio son el mismo texto', () => {
    const desc = 'Docente completa las tareas asociadas a cada actividad';
    const frase = formatHistorialFrase({
      persona: 'Javiera Escudero',
      accion: 'Agregar compromiso',
      tabProyecto: 'Seguimiento',
      elementoEspecifico: desc.slice(0, 80),
      cambioGenerado: desc,
    });
    expect(frase).toBe(
      'Javiera Escudero ha agregado un compromiso en Seguimiento: "Docente completa las tareas asociadas a cada actividad"'
    );
    expect(frase.match(/Docente completa/g)).toHaveLength(1);
  });

  it('agrega un gasto sin repetir el ítem en el detalle', () => {
    const frase = formatHistorialFrase({
      persona: 'Admin',
      accion: 'Agregar gasto',
      tabProyecto: 'Presupuesto',
      elementoEspecifico: 'Gasto "Kits de seguridad"',
      cambioGenerado: 'GASTOS OPERACIÓN, $120.000',
    });
    expect(frase).toBe(
      'Admin ha agregado un gasto en Presupuesto el gasto Kits de seguridad: "GASTOS OPERACIÓN, $120.000"'
    );
  });

  it('elimina un gasto sin cita genérica', () => {
    const frase = formatHistorialFrase({
      persona: 'Admin',
      accion: 'Eliminar gasto',
      tabProyecto: 'Presupuesto',
      elementoEspecifico: 'Gasto "GASTOS OPERACIÓN"',
      cambioGenerado: '',
    });
    expect(frase).toBe(
      'Admin ha eliminado un gasto en Presupuesto el gasto GASTOS OPERACIÓN'
    );
  });

  it('oculta citas que solo restatan el verbo', () => {
    expect(
      formatHistorialFrase({
        persona: 'Admin',
        accion: 'Eliminar',
        tabProyecto: 'Seguimiento',
        elementoEspecifico: 'Docente completa las tareas',
        cambioGenerado: 'Compromiso eliminado',
      })
    ).toBe('Admin ha eliminado en Seguimiento Docente completa las tareas');

    expect(
      formatHistorialFrase({
        persona: 'Admin',
        accion: 'Actualizar',
        tabProyecto: 'Seguimiento',
        elementoEspecifico: 'Reunión N° 1',
        cambioGenerado: 'Reunión actualizada',
      })
    ).toBe('Admin ha actualizado en Seguimiento Reunión N° 1');
  });

  it('crea y renombra actividad sin duplicar el nombre', () => {
    expect(
      formatHistorialFrase({
        persona: 'Admin',
        accion: 'Crear',
        tabProyecto: 'Actividades',
        elementoEspecifico: 'Actividad "Evaluación de resultados"',
        cambioGenerado: '',
      })
    ).toBe(
      'Admin ha creado en Actividades la actividad Evaluación de resultados'
    );

    expect(
      formatHistorialFrase({
        persona: 'Admin',
        accion: 'Actualizar',
        tabProyecto: 'Actividades',
        elementoEspecifico: 'el nombre de la actividad',
        cambioGenerado: 'Evaluación de resultados e indicadores del proyecto',
      })
    ).toBe(
      'Admin ha actualizado en Actividades el nombre de la actividad: "Evaluación de resultados e indicadores del proyecto"'
    );
  });

  it('marca tarea y compromiso con el género correcto', () => {
    expect(
      formatHistorialFrase({
        persona: 'Ana',
        accion: 'Marcar realizada',
        tabProyecto: 'Actividades',
        elementoEspecifico: 'Tarea "Revisar rúbrica"',
        cambioGenerado: '',
      })
    ).toBe(
      'Ana ha marcado como realizada en Actividades la tarea Revisar rúbrica'
    );

    expect(
      formatHistorialFrase({
        persona: 'Ana',
        accion: 'Marcar realizada',
        tabProyecto: 'Seguimiento',
        elementoEspecifico: 'Docente entrega datos',
        cambioGenerado: 'Compromiso completado',
      })
    ).toBe('Ana ha marcado como realizado en Seguimiento Docente entrega datos');
  });

  it('agrega una reunión sin citar "creada"', () => {
    expect(
      formatHistorialFrase({
        persona: 'Admin',
        accion: 'Agregar reunión',
        tabProyecto: 'Seguimiento',
        elementoEspecifico: 'Reunión N° 1',
        cambioGenerado: '',
      })
    ).toBe('Admin ha agregado una reunión en Seguimiento Reunión N° 1');

    expect(
      formatHistorialFrase({
        persona: 'Admin',
        accion: 'Agregar',
        tabProyecto: 'Seguimiento',
        elementoEspecifico: 'Reunión N° 1',
        cambioGenerado: 'Reunión N° 1 creada',
      })
    ).toBe('Admin ha agregado una reunión en Seguimiento Reunión N° 1');
  });

  it('crea un objetivo específico con Crear, no Actualizar', () => {
    expect(
      formatHistorialFrase({
        persona: 'Admin',
        accion: 'Crear',
        tabProyecto: 'Indicadores',
        elementoEspecifico: 'un objetivo específico',
        cambioGenerado: 'Mejorar la certificación RPAS',
      })
    ).toBe(
      'Admin ha creado en Indicadores un objetivo específico: "Mejorar la certificación RPAS"'
    );
  });

  it('registra participante sin mayúscula ni cita redundante', () => {
    expect(
      formatHistorialFrase({
        persona: 'Admin',
        accion: 'Agregar participante',
        tabProyecto: 'Participantes',
        elementoEspecifico: 'Solange Olivera como Colaborador',
        cambioGenerado: '',
      })
    ).toBe(
      'Admin ha registrado en Participantes Solange Olivera como Colaborador'
    );
  });

  it('usa "para la actividad" en evidencias y muestra el archivo', () => {
    expect(
      formatHistorialFrase({
        persona: 'Ana',
        accion: 'Subir evidencia',
        tabProyecto: 'Actividades',
        elementoEspecifico: 'Actividad "Evaluación"',
        cambioGenerado: 'foto.pdf',
      })
    ).toBe(
      'Ana ha subido una evidencia en Actividades para la actividad Evaluación: "foto.pdf"'
    );
  });

  it('recorta detalles largos en pantalla', () => {
    const largo = 'a'.repeat(200);
    const frase = formatHistorialFrase({
      persona: 'Ana',
      accion: 'Actualizar',
      tabProyecto: 'General',
      elementoEspecifico: 'el Objetivo General del proyecto',
      cambioGenerado: largo,
    });
    expect(frase).toContain(`${'a'.repeat(180)}…`);
    expect(frase).not.toContain('a'.repeat(181));
  });

  it('no pinta comillas vacías ni espacios dobles', () => {
    const frase = formatHistorialFrase({
      persona: 'Ana',
      accion: 'Crear',
      tabProyecto: 'Actividades',
      elementoEspecifico: 'Actividad "Plan"',
      cambioGenerado: '   ',
    });
    expect(frase).toBe('Ana ha creado en Actividades la actividad Plan');
    expect(frase).not.toMatch(/  /);
    expect(frase).not.toContain(': ""');
  });

  it('cambia el estado de kanban sin cita aparte', () => {
    expect(
      formatHistorialFrase({
        persona: 'Ana',
        accion: 'Cambio de estado en kanban',
        tabProyecto: 'Actividades',
        elementoEspecifico:
          'el estado de la actividad "Evaluación" a En proceso',
        cambioGenerado: '',
      })
    ).toBe(
      'Ana ha cambiado en Actividades el estado de la actividad Evaluación a En proceso'
    );
  });

  it('marca un compromiso como pendiente con detalle útil', () => {
    expect(
      formatHistorialFrase({
        persona: 'Ana',
        accion: 'Actualizar',
        tabProyecto: 'Seguimiento',
        elementoEspecifico: 'Docente entrega datos',
        cambioGenerado: 'Marcado como pendiente',
      })
    ).toBe(
      'Ana ha actualizado en Seguimiento Docente entrega datos: "Marcado como pendiente"'
    );
  });

  it('sube y elimina convenio firmado con el nombre de archivo', () => {
    expect(
      formatHistorialFrase({
        persona: 'Admin',
        accion: 'Subir convenio firmado',
        tabProyecto: 'Convenio',
        elementoEspecifico: 'acta.pdf',
        cambioGenerado: '',
      })
    ).toBe('Admin ha subido el convenio firmado en Convenio acta.pdf');

    expect(
      formatHistorialFrase({
        persona: 'Admin',
        accion: 'Eliminar convenio firmado',
        tabProyecto: 'Convenio',
        elementoEspecifico: 'acta.pdf',
        cambioGenerado: '',
      })
    ).toBe('Admin ha eliminado el convenio firmado en Convenio acta.pdf');
  });

  it('actualiza el avance de un indicador', () => {
    expect(
      formatHistorialFrase({
        persona: 'Ana',
        accion: 'Actualizar avance',
        tabProyecto: 'Indicadores',
        elementoEspecifico: 'Indicador "Estudiantes certificados"',
        cambioGenerado: 'Resultado alcanzado: 3 → 5 (50%)',
      })
    ).toBe(
      'Ana ha actualizado el avance en Indicadores el indicador Estudiantes certificados: "Resultado alcanzado: 3 → 5 (50%)"'
    );
  });
});

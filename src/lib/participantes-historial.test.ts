import { describe, expect, it } from 'vitest';
import { formatHistorialFrase } from '@/lib/historial-mensaje';
import {
  buildParticipanteCambioGenerado,
  type ParticipanteHistorialSnapshot,
} from '@/lib/participantes-historial';

const base: ParticipanteHistorialSnapshot = {
  rol: 'Estudiante',
  nombre: 'Benjamin Maldonado Diaz',
  rut: '11.111.111-1',
  email: 'b@test.cl',
  cargo: null,
  laborEnProyecto: null,
  socioNombre: null,
  sedeNombre: 'Bellavista',
  escuelaNombre: 'Ingeniería',
  carreraNombre: 'Técnico en Topografía',
  asignaturaNombre: 'TPO303 - Taller de Fotogrametria',
};

describe('buildParticipanteCambioGenerado', () => {
  it('devuelve vacío si no cambió ningún campo', () => {
    expect(buildParticipanteCambioGenerado(base, { ...base })).toBe('');
  });

  it('ignora espacios y nulos equivalentes a vacío', () => {
    expect(
      buildParticipanteCambioGenerado(
        { ...base, cargo: null, laborEnProyecto: '' },
        { ...base, cargo: '  ', laborEnProyecto: null }
      )
    ).toBe('');
  });

  it('describe carrera y asignatura con valor anterior y nuevo', () => {
    expect(
      buildParticipanteCambioGenerado(base, {
        ...base,
        carreraNombre: 'Ingeniería Civil',
        asignaturaNombre: 'ICF101 - Cálculo',
      })
    ).toBe(
      'Carrera: Técnico en Topografía → Ingeniería Civil; Asignatura: TPO303 - Taller de Fotogrametria → ICF101 - Cálculo'
    );
  });

  it('usa — cuando un campo pasa de vacío a valor o se limpia', () => {
    expect(
      buildParticipanteCambioGenerado(
        { ...base, sedeNombre: null },
        { ...base, sedeNombre: 'Maipú' }
      )
    ).toBe('Sede: — → Maipú');
  });
});

describe('formatHistorialFrase participantes', () => {
  it('incluye el detalle de campos al actualizar', () => {
    expect(
      formatHistorialFrase({
        persona: 'Admin',
        accion: 'Actualizar',
        tabProyecto: 'Participantes',
        elementoEspecifico: 'Benjamin Maldonado Diaz (Estudiante)',
        cambioGenerado:
          'Carrera: Técnico en Topografía → Ingeniería Civil',
      })
    ).toBe(
      'Admin ha actualizado en Participantes Benjamin Maldonado Diaz (Estudiante): "Carrera: Técnico en Topografía → Ingeniería Civil"'
    );
  });
});

import { describe, expect, it } from 'vitest';
import { filterUsuariosByName } from '@/lib/configuracion-usuarios-filter';

const users = [
  { id: '1', name: 'Paula Diaz Peralta' },
  { id: '2', name: 'Patricia Zúñiga' },
  { id: '3', name: null },
  { id: '4', name: 'Pedro Palma' },
];

describe('filterUsuariosByName', () => {
  it('devuelve todos si la consulta está vacía o solo tiene espacios', () => {
    expect(filterUsuariosByName(users, '')).toEqual(users);
    expect(filterUsuariosByName(users, '   ')).toEqual(users);
  });

  it('filtra por coincidencia parcial sin distinguir mayúsculas', () => {
    expect(filterUsuariosByName(users, 'paula').map((u) => u.id)).toEqual(['1']);
    expect(filterUsuariosByName(users, 'PAT').map((u) => u.id)).toEqual(['2']);
  });

  it('ignora tildes al comparar', () => {
    expect(filterUsuariosByName(users, 'zuniga').map((u) => u.id)).toEqual(['2']);
  });

  it('omite usuarios sin nombre cuando hay consulta', () => {
    expect(filterUsuariosByName(users, 'pedro').map((u) => u.id)).toEqual(['4']);
    expect(filterUsuariosByName(users, 'a').some((u) => u.id === '3')).toBe(
      false
    );
  });
});

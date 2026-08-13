import { describe, it, expect } from 'vitest';
import {
  listadoPersistKey,
  readPersistedProyectosListado,
  writePersistedProyectosListado,
  type PersistStorage,
} from '@/lib/proyecto-listado-persist';
import type { ProyectoListadoItem } from '@/types/proyecto';

function memoryStorage(): PersistStorage & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

const itemA: ProyectoListadoItem = {
  id: 'p1',
  proyecto: 'Alpha',
  sede: 'Santiago',
  fondo: 'Fondo A',
  escuelas: [],
};

const itemB: ProyectoListadoItem = {
  id: 'p2',
  proyecto: 'Beta',
  sede: 'Valparaíso',
  fondo: 'Fondo B',
  escuelas: [],
};

describe('proyecto-listado-persist', () => {
  it('namespaces storage by userId so one user cannot read another listado', () => {
    const storage = memoryStorage();
    writePersistedProyectosListado('user-a', [itemA], storage);
    writePersistedProyectosListado('user-b', [itemB], storage);

    expect(listadoPersistKey('user-a')).not.toBe(listadoPersistKey('user-b'));
    expect(readPersistedProyectosListado('user-a', storage)).toEqual([itemA]);
    expect(readPersistedProyectosListado('user-b', storage)).toEqual([itemB]);
    expect(storage.store.has(listadoPersistKey('user-a'))).toBe(true);
    expect(storage.store.has(listadoPersistKey('user-b'))).toBe(true);
  });

  it('returns undefined without userId or when JSON is invalid', () => {
    const storage = memoryStorage();
    expect(readPersistedProyectosListado(null, storage)).toBeUndefined();
    storage.setItem(listadoPersistKey('user-a'), '{not-json');
    expect(readPersistedProyectosListado('user-a', storage)).toBeUndefined();
  });
});

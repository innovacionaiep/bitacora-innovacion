import type { ProyectoListadoItem } from '@/types/proyecto';

export const LISTADO_PERSIST_PREFIX = 'gp:proyectos-listado:v1:';

export type PersistStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function listadoPersistKey(userId: string): string {
  return `${LISTADO_PERSIST_PREFIX}${userId}`;
}

function defaultStorage(): PersistStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readPersistedProyectosListado(
  userId: string | null | undefined,
  storage: PersistStorage | null = defaultStorage()
): ProyectoListadoItem[] | undefined {
  if (!userId || !storage) return undefined;
  try {
    const raw = storage.getItem(listadoPersistKey(userId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    return parsed as ProyectoListadoItem[];
  } catch {
    return undefined;
  }
}

export function writePersistedProyectosListado(
  userId: string | null | undefined,
  data: ProyectoListadoItem[],
  storage: PersistStorage | null = defaultStorage()
): void {
  if (!userId || !storage) return;
  try {
    storage.setItem(listadoPersistKey(userId), JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireProjectAccess = vi.fn();
const activityFindUnique = vi.fn();
const evidenciaCreate = vi.fn();
const createHistorialEntry = vi.fn();
const revalidatePath = vi.fn();

vi.mock('@/lib/authz/guards', () => ({
  requireProjectAccess: (...args: unknown[]) => requireProjectAccess(...args),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    activity: { findUnique: (...args: unknown[]) => activityFindUnique(...args) },
    evidenciaActividad: {
      create: (...args: unknown[]) => evidenciaCreate(...args),
    },
  },
}));

vi.mock('@/lib/actions/historial', () => ({
  createHistorialEntry: (...args: unknown[]) => createHistorialEntry(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

describe('createEvidenciaActividad', () => {
  beforeEach(() => {
    requireProjectAccess.mockReset();
    activityFindUnique.mockReset();
    evidenciaCreate.mockReset();
    createHistorialEntry.mockReset();
    revalidatePath.mockReset();
    requireProjectAccess.mockResolvedValue({ ok: true });
    activityFindUnique.mockResolvedValue({
      projectId: 'p1',
      name: 'Actividad',
    });
    evidenciaCreate.mockResolvedValue({
      id: 'ev1',
      url: 'https://res.cloudinary.com/x/a.jpg',
      publicId: 'evidencias_actividades/a',
      tipo: 'image',
      nombreArchivo: 'a.jpg',
      createdAt: new Date('2026-09-09'),
    });
    createHistorialEntry.mockResolvedValue({ success: true });
  });

  it('no refresca /proyectos para no cerrar el popup de la actividad', async () => {
    const { createEvidenciaActividad } = await import(
      '@/lib/actions/evidencias-actividad'
    );
    const result = await createEvidenciaActividad('act-1', {
      url: 'https://res.cloudinary.com/x/a.jpg',
      publicId: 'evidencias_actividades/a',
      tipo: 'image',
      nombreArchivo: 'a.jpg',
    });
    expect(result.success).toBe(true);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

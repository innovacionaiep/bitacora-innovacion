'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz/guards';
import {
  normalizeFondoColorHex,
  vitrinaFondoFillColor,
} from '@/lib/vitrina-fondo-style';

export type PortalFondoColorItem = {
  id: string;
  nombre: string;
  colorHex: string | null;
  fallbackHex: string;
};

function parseFondoColorUpdates(
  items: unknown,
):
  | { ok: true; data: Array<{ id: string; colorHex: string | null }> }
  | { ok: false; error: string } {
  if (!Array.isArray(items)) {
    return { ok: false, error: 'Listado de colores inválido' };
  }
  const data: Array<{ id: string; colorHex: string | null }> = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'Listado de colores inválido' };
    }
    const row = item as { id?: unknown; colorHex?: unknown };
    if (typeof row.id !== 'string' || !row.id.trim()) {
      return { ok: false, error: 'Fondo inválido' };
    }
    if (row.colorHex == null || row.colorHex === '') {
      data.push({ id: row.id, colorHex: null });
      continue;
    }
    if (typeof row.colorHex !== 'string') {
      return { ok: false, error: 'Color inválido' };
    }
    const hex = normalizeFondoColorHex(row.colorHex);
    if (!hex) {
      return { ok: false, error: 'Color inválido. Usa formato #RRGGBB.' };
    }
    data.push({ id: row.id, colorHex: hex });
  }
  return { ok: true, data };
}

export async function getPortalFondoColors(): Promise<{
  success: boolean;
  data?: PortalFondoColorItem[];
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const fondos = await prisma.fondo.findMany({
    orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    select: { id: true, nombre: true, colorHex: true },
  });

  return {
    success: true,
    data: fondos.map((fondo) => ({
      id: fondo.id,
      nombre: fondo.nombre,
      colorHex: fondo.colorHex,
      fallbackHex: vitrinaFondoFillColor(fondo.nombre),
    })),
  };
}

export async function savePortalFondoColors(items: unknown): Promise<{
  success: boolean;
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const parsed = parseFondoColorUpdates(items);
  if (!parsed.ok) return { success: false, error: parsed.error };

  try {
    await prisma.$transaction(
      parsed.data.map((item) =>
        prisma.fondo.update({
          where: { id: item.id },
          data: { colorHex: item.colorHex },
        }),
      ),
    );
    revalidatePath('/');
    revalidatePath('/vitrina');
    return { success: true };
  } catch (e) {
    console.error('[portal] savePortalFondoColors', e);
    return { success: false, error: 'No se pudieron guardar los colores' };
  }
}

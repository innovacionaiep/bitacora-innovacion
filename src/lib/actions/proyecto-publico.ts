'use server';

import { getProyectoBase } from '@/lib/actions/proyectos';
import { getLineasTabsCatalogUnchecked } from '@/lib/actions/linea-modulos-config';
import { findActivePublicLinkProyectoId } from '@/lib/public-link-db';
import { isPublicLinkTokenFormat } from '@/lib/public-link';
import { runWithPublicLinkToken } from '@/lib/public-link-context';
import type { ProyectoWithRelations } from '@/types/proyecto';
import type { LineaModuloCatalogItem } from '@/lib/linea-modulos';

export async function getProyectoPublicoVista(token: string): Promise<{
  success: boolean;
  data?: {
    proyecto: ProyectoWithRelations;
    catalog: LineaModuloCatalogItem[];
  };
  error?: string;
}> {
  if (!isPublicLinkTokenFormat(token)) {
    return { success: false, error: 'Link no válido' };
  }

  return runWithPublicLinkToken(token, async () => {
    const proyectoId = await findActivePublicLinkProyectoId(token);
    if (!proyectoId) {
      return { success: false, error: 'Este link no está disponible o fue caducado' };
    }
    const [proyectoRes, catalog] = await Promise.all([
      getProyectoBase(proyectoId),
      getLineasTabsCatalogUnchecked(),
    ]);
    if (!proyectoRes.success || !proyectoRes.data) {
      return {
        success: false,
        error: proyectoRes.error ?? 'No se pudo cargar el proyecto',
      };
    }
    return {
      success: true,
      data: {
        proyecto: proyectoRes.data as ProyectoWithRelations,
        catalog,
      },
    };
  });
}

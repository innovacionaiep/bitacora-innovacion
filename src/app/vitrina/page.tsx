import type { Metadata } from 'next';
import { VitrinaLanding } from '@/components/vitrina/VitrinaLanding';
import { getVitrinaAiPublicStatus } from '@/lib/actions/vitrina-ai';
import { getVitrinaProjectCatalogs } from '@/lib/actions/vitrina-proyectos';
import { getSession } from '@/lib/auth-utils';
import { userHasAdminEnabled } from '@/lib/authz/pure';
import { readVitrinaProyectos } from '@/lib/vitrina-proyectos-store';
import { readVitrinaVideos } from '@/lib/vitrina-videos-store';

export const metadata: Metadata = {
  title: 'Bitácora',
  description:
    'Landing de vitrina de Bitácora. Página oculta en desarrollo; no forma parte del flujo de la app.',
  robots: { index: false, follow: false },
};

export const maxDuration = 60;

export default async function VitrinaPage() {
  const [videos, proyectos, session, catalogs, aiStatus] = await Promise.all([
    readVitrinaVideos(),
    readVitrinaProyectos(),
    getSession(),
    getVitrinaProjectCatalogs(),
    getVitrinaAiPublicStatus(),
  ]);
  const canEdit = userHasAdminEnabled(session?.user?.availableRoles);
  const filterCatalogs = {
    fondos: catalogs.fondos.map((item) => item.nombre),
    sedes: catalogs.sedes.map((item) => item.nombre),
    escuelas: catalogs.escuelas.map((item) => item.nombre),
    etiquetas: catalogs.etiquetas.map((item) => item.nombre),
  };
  return (
    <VitrinaLanding
      videos={videos}
      proyectos={proyectos}
      filterCatalogs={filterCatalogs}
      canEdit={canEdit}
      aiConfigured={aiStatus.configured}
    />
  );
}

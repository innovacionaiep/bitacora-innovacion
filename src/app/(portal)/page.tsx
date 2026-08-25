import { VitrinaLanding } from '@/components/vitrina/VitrinaLanding';
import { getVitrinaAiPublicStatus } from '@/lib/actions/vitrina-ai';
import { resolvePortalAccess } from '@/lib/actions/portal-guest';
import {
  getVitrinaProjectCatalogs,
  type VitrinaProjectCatalogs,
} from '@/lib/actions/vitrina-proyectos';
import { getSession } from '@/lib/auth-utils';
import { userHasAdminEnabled } from '@/lib/authz/pure';
import { EMPTY_VITRINA_FILTERS } from '@/lib/vitrina-project-filters';
import { readVitrinaProyectos } from '@/lib/vitrina-proyectos-store';
import { readVitrinaVideos } from '@/lib/vitrina-videos-store';

const EMPTY_CATALOGS: VitrinaProjectCatalogs = {
  fondos: [],
  lineas: [],
  sedes: [],
  escuelas: [],
  socios: [],
  etiquetas: [],
};

export const maxDuration = 60;

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const params = await searchParams;
  const initialScene = params.vista === 'proyectos' ? 'projects' : 'hero';
  const [videos, session, aiStatus, access] = await Promise.all([
    readVitrinaVideos(),
    getSession(),
    getVitrinaAiPublicStatus(),
    resolvePortalAccess(),
  ]);
  const canEdit = userHasAdminEnabled(session?.user?.availableRoles);
  const sessionEmail = session?.user?.email?.trim() || null;
  const hasReadAccess = access.level >= 1;

  const [proyectos, catalogs] = hasReadAccess
    ? await Promise.all([readVitrinaProyectos(), getVitrinaProjectCatalogs()])
    : [[], EMPTY_CATALOGS];

  const filterCatalogs = hasReadAccess
    ? {
        fondos: catalogs.fondos.map((item) => item.nombre),
        sedes: catalogs.sedes.map((item) => item.nombre),
        escuelas: catalogs.escuelas.map((item) => item.nombre),
        etiquetas: catalogs.etiquetas.map((item) => item.nombre),
      }
    : EMPTY_VITRINA_FILTERS;

  return (
    <VitrinaLanding
      videos={videos}
      proyectos={proyectos}
      filterCatalogs={filterCatalogs}
      catalogs={catalogs}
      canEdit={canEdit}
      aiConfigured={aiStatus.configured}
      sessionEmail={sessionEmail}
      accessKind={access.kind}
      accessLevel={access.level}
      initialScene={initialScene}
    />
  );
}

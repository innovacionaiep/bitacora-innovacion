import { redirect } from 'next/navigation';
import { VitrinaLanding } from '@/components/vitrina/VitrinaLanding';
import { getVitrinaAiPublicStatus } from '@/lib/actions/vitrina-ai';
import { getPortalAvancesProyectos } from '@/lib/actions/portal-avances';
import { getMideimpactoIniciativas } from '@/lib/actions/mideimpacto-iniciativas';
import { resolvePortalAccess } from '@/lib/actions/portal-guest';
import {
  getVitrinaProjectCatalogs,
  type VitrinaProjectCatalogs,
} from '@/lib/actions/vitrina-proyectos';
import { getSession } from '@/lib/auth-utils';
import { userHasAdminEnabled } from '@/lib/authz/pure';
import {
  PORTAL_CAUSALAB_FONDO,
  portalCanManageSettings,
  portalCanSeeView,
  portalIsCausalab,
  portalNeedsVitrinaProyectos,
  portalPageLoadsDeferredTabs,
  portalSessionRedirectsToApp,
} from '@/lib/portal-guest-access';
import { canLoadPortalAvances } from '@/lib/portal-avances';
import {
  EMPTY_VITRINA_FILTERS,
  restrictVitrinaProyectosToFondo,
} from '@/lib/vitrina-project-filters';
import { readVitrinaProyectos } from '@/lib/vitrina-proyectos-store';
import { readVitrinaVideos } from '@/lib/vitrina-videos-store';
import type { PortalAvancesProyecto } from '@/lib/portal-avances';
import type { MideimpactoIniciativasPage } from '@/lib/mideimpacto-iniciativas';

const EMPTY_CATALOGS: VitrinaProjectCatalogs = {
  fondos: [],
  lineas: [],
  sedes: [],
  escuelas: [],
  socios: [],
  comunas: [],
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
  const canEdit = portalCanManageSettings(
    access,
    userHasAdminEnabled(session?.user?.availableRoles),
  );
  const sessionEmail = session?.user?.email?.trim() || null;
  if (
    params.vista === 'proyectos' &&
    portalSessionRedirectsToApp(access.kind, access.level)
  ) {
    redirect('/inicio');
  }
  const redirectsToApp = portalSessionRedirectsToApp(access.kind, access.level);
  const hasReadAccess = access.kind !== 'none' && !redirectsToApp;
  const loadVitrina =
    portalNeedsVitrinaProyectos(access.level, access.profile) && !redirectsToApp;
  const loadAvances =
    portalPageLoadsDeferredTabs(params.vista) &&
    canLoadPortalAvances(access.level, access.kind, access.profile);
  const loadVinculamos =
    portalPageLoadsDeferredTabs(params.vista) &&
    portalCanSeeView(access.level, 'vinculamos', access.profile) &&
    !redirectsToApp;

  const emptyVinculamos = {
    success: true as const,
    data: {
      rows: [] as MideimpactoIniciativasPage['rows'],
      page: 1,
      lastPage: 1,
      total: 0,
    },
  };

  const [proyectosRaw, catalogsRaw, avancesResult, vinculamosInitial] =
    hasReadAccess
      ? await Promise.all([
          loadVitrina ? readVitrinaProyectos() : Promise.resolve([]),
          loadVitrina
            ? getVitrinaProjectCatalogs()
            : Promise.resolve(EMPTY_CATALOGS),
          loadAvances
            ? getPortalAvancesProyectos()
            : Promise.resolve({
                success: true as const,
                data: [] as PortalAvancesProyecto[],
              }),
          loadVinculamos
            ? getMideimpactoIniciativas({ page: 1 })
            : Promise.resolve(emptyVinculamos),
        ])
      : [
          [],
          EMPTY_CATALOGS,
          { success: true as const, data: [] as PortalAvancesProyecto[] },
          emptyVinculamos,
        ];

  const causalab = portalIsCausalab(access);
  const proyectos = causalab
    ? restrictVitrinaProyectosToFondo(proyectosRaw, PORTAL_CAUSALAB_FONDO)
    : proyectosRaw;
  const causalabFondoIds = new Set(
    catalogsRaw.fondos
      .filter((item) => item.nombre === PORTAL_CAUSALAB_FONDO)
      .map((item) => item.id),
  );
  const catalogs = causalab
    ? {
        ...catalogsRaw,
        fondos: catalogsRaw.fondos.filter(
          (item) => item.nombre === PORTAL_CAUSALAB_FONDO,
        ),
        lineas: catalogsRaw.lineas.filter((item) =>
          causalabFondoIds.has(item.fondoId),
        ),
      }
    : catalogsRaw;

  const avancesProyectos =
    avancesResult.success && avancesResult.data ? avancesResult.data : [];

  const filterCatalogs = loadVitrina
    ? {
        ...EMPTY_VITRINA_FILTERS,
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
      accessProfile={access.profile ?? null}
      initialScene={initialScene}
      avancesProyectos={avancesProyectos}
      vinculamosInitial={vinculamosInitial}
      deferredTabsLoaded={portalPageLoadsDeferredTabs(params.vista)}
    />
  );
}

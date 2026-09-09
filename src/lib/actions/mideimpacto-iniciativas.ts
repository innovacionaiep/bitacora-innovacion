'use server';

import { resolvePortalAccess } from '@/lib/actions/portal-guest';
import {
  fetchMideimpactoIniciativasPage,
  type MideimpactoIniciativasPage,
} from '@/lib/mideimpacto-iniciativas';
import { portalCanSeeView } from '@/lib/portal-guest-access';
import { getMideimpactoApiKey } from '@/lib/secrets/env-secrets';

export async function getMideimpactoIniciativas(input?: {
  page?: number;
}): Promise<{
  success: boolean;
  data?: MideimpactoIniciativasPage;
  error?: string;
}> {
  const access = await resolvePortalAccess();
  if (!portalCanSeeView(access.level, 'vinculamos', access.profile)) {
    return { success: false, error: 'No tienes acceso a esta vista' };
  }

  const apiKey = getMideimpactoApiKey();
  if (!apiKey) {
    return { success: false, error: 'API de MideImpacto no configurada' };
  }

  const page = input?.page ?? 1;
  const result = await fetchMideimpactoIniciativasPage({
    apiKey,
    page,
  });
  if (!result.ok) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.page };
}

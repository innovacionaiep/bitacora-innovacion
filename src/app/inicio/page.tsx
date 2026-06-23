import { getCurrentUser } from '@/lib/auth-utils';
import { getInicioInitialData } from '@/lib/actions/portal-inicio';
import { InicioClient } from './InicioClient';

export default async function InicioPage() {
  const user = await getCurrentUser();
  const initialData = user
    ? await getInicioInitialData(
        (user as { activeRole?: string | null }).activeRole ?? null
      )
    : null;

  return <InicioClient initialData={initialData} />;
}

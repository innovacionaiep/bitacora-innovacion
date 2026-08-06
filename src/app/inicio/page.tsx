import { getInicioInitialData } from '@/lib/actions/portal-inicio';
import { getCurrentUser } from '@/lib/auth-utils';
import { InicioClient } from './InicioClient';

export default async function InicioPage() {
  const user = await getCurrentUser();
  const initialData = user ? await getInicioInitialData() : null;

  return <InicioClient initialData={initialData} />;
}

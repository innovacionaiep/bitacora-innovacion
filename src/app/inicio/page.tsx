import { getInicioInitialData } from '@/lib/actions/portal-inicio';
import { InicioClient } from './InicioClient';

export default async function InicioPage() {
  // getInicioInitialData already auth-gates; avoid a second getCurrentUser roundtrip
  const initialData = await getInicioInitialData();

  return <InicioClient initialData={initialData} />;
}

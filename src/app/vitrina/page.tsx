import type { Metadata } from 'next';
import { VitrinaLanding } from '@/components/vitrina/VitrinaLanding';
import { readVitrinaVideos } from '@/lib/vitrina-videos-store';

export const metadata: Metadata = {
  title: 'Bitácora',
  description:
    'Landing de vitrina de Bitácora. Página oculta en desarrollo; no forma parte del flujo de la app.',
  robots: { index: false, follow: false },
};

export default async function VitrinaPage() {
  const videos = await readVitrinaVideos();
  return <VitrinaLanding videos={videos} />;
}

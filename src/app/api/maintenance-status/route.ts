import { NextResponse } from 'next/server';
import { readMaintenanceEnabled } from '@/lib/maintenance-store';
import { isProductionRuntime } from '@/lib/maintenance';

export const dynamic = 'force-dynamic';

/** Estado público del modo mantenimiento (usado por el middleware en producción). */
export async function GET() {
  if (!isProductionRuntime()) {
    return NextResponse.json(
      { enabled: false, production: false },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const enabled = await readMaintenanceEnabled();
  return NextResponse.json(
    { enabled, production: true },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
      },
    },
  );
}

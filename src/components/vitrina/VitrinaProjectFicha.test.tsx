import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitrinaProjectFicha } from '@/components/vitrina/VitrinaProjectFicha';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';

import {
  getVitrinaProjectCatalogs,
} from '@/lib/actions/vitrina-proyectos';

vi.mock('@/lib/actions/vitrina-proyectos', () => ({
  deleteVitrinaProyecto: vi.fn(),
  getVitrinaProjectCatalogs: vi.fn(),
  upsertVitrinaProyecto: vi.fn(),
}));

vi.mock('@/lib/actions/portal-contact', () => ({
  sendPortalContactEmail: vi.fn(),
}));

vi.mocked(getVitrinaProjectCatalogs).mockResolvedValue({
  fondos: [],
  lineas: [],
  sedes: [],
  escuelas: [],
  socios: [],
  etiquetas: [],
});

afterEach(() => {
  cleanup();
});

function sampleProyecto() {
  const result = normalizeVitrinaProyectos([
    {
      nombre: 'AuditorIA',
      descripcion: 'Descripción',
      encargadoNombre: 'Lucia Ramirez',
      encargadoCorreo: 'lucia.ramirezc@correoaiep.cl',
      encargadoCargo: 'Docente',
    },
  ]);
  if (!result.ok) throw new Error(result.error);
  return result.proyectos[0]!;
}

describe('VitrinaProjectFicha Contactar', () => {
  it('abre el modal de contacto desde la ficha', async () => {
    const user = userEvent.setup();
    render(
      <VitrinaProjectFicha
        open
        onOpenChange={() => undefined}
        proyecto={sampleProyecto()}
        isNew={false}
        canEdit={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Contactar' }));
    expect(screen.getByRole('heading', { name: 'Contactar' })).toBeInTheDocument();
    expect(screen.getByTestId('portal-contact-recipients')).toHaveTextContent(
      'centroinnovacion@aiep.cl',
    );
  });

  it('no muestra Contactar en un proyecto nuevo', () => {
    render(
      <VitrinaProjectFicha
        open
        onOpenChange={() => undefined}
        proyecto={null}
        isNew
        canEdit
      />,
    );
    expect(screen.queryByRole('button', { name: 'Contactar' })).not.toBeInTheDocument();
  });
});

describe('VitrinaProjectFicha video', () => {
  it('embebe un enlace de Google Drive', () => {
    const result = normalizeVitrinaProyectos([
      {
        nombre: 'AuditorIA',
        videoUrl:
          'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view',
      },
    ]);
    if (!result.ok) throw new Error(result.error);

    render(
      <VitrinaProjectFicha
        open
        onOpenChange={() => undefined}
        proyecto={result.proyectos[0]!}
        isNew={false}
        canEdit={false}
      />,
    );

    const iframe = document.querySelector('iframe');
    expect(iframe).toHaveAttribute(
      'src',
      'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview',
    );
    expect(screen.getByTitle('Abrir en Google Drive')).toBeInTheDocument();
  });
});

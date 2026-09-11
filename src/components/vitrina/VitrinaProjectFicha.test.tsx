import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitrinaProjectFicha } from '@/components/vitrina/VitrinaProjectFicha';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';

import {
  getVitrinaProjectCatalogs,
  upsertVitrinaProyecto,
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
  comunas: [],
  etiquetas: [],
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.mocked(getVitrinaProjectCatalogs).mockResolvedValue({
    fondos: [],
    lineas: [],
    sedes: [],
    escuelas: [],
    socios: [],
    comunas: [],
    etiquetas: [],
  });
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

describe('VitrinaProjectFicha comunas', () => {
  it('muestra comunas debajo de socios comunitarios', () => {
    const result = normalizeVitrinaProyectos([
      {
        nombre: 'AuditorIA',
        socios: ['Junta de Vecinos'],
        comunas: ['Valparaíso'],
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

    const socios = screen.getByText('Socios comunitarios');
    const comunas = screen.getByText('Comunas');
    expect(comunas.compareDocumentPosition(socios) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(screen.getByText('Valparaíso')).toBeInTheDocument();
    expect(screen.getByLabelText('Comunas')).toBeInTheDocument();
  });

  it('al guardar comunas envía ids del catálogo', async () => {
    vi.mocked(getVitrinaProjectCatalogs).mockResolvedValue({
      fondos: [],
      lineas: [],
      sedes: [],
      escuelas: [],
      socios: [],
      comunas: [{ id: 'c1', nombre: 'Sagrada Familia' }],
      etiquetas: [],
    });
    vi.mocked(upsertVitrinaProyecto).mockResolvedValue({ success: true });

    const catalogs = {
      fondos: [],
      lineas: [],
      sedes: [],
      escuelas: [],
      socios: [],
      comunas: [{ id: 'c1', nombre: 'Sagrada Familia' }],
      etiquetas: [],
    };

    const user = userEvent.setup();
    render(
      <VitrinaProjectFicha
        open
        onOpenChange={() => undefined}
        proyecto={sampleProyecto()}
        isNew={false}
        canEdit
        catalogs={catalogs}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Editar Comunas' }));
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('Sagrada Familia'));
    await user.click(screen.getByRole('button', { name: 'Guardar Comunas' }));

    expect(getVitrinaProjectCatalogs).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(upsertVitrinaProyecto).toHaveBeenCalledWith({
        proyecto: expect.objectContaining({
          comunaIds: ['c1'],
          comunas: ['Sagrada Familia'],
        }),
      });
    });
  });
});

describe('VitrinaProjectFicha video', () => {
  it('muestra la columna de video con portada borrosa aunque no haya enlace', () => {
    const result = normalizeVitrinaProyectos([
      {
        nombre: 'Nalca Essence',
        fotos: [
          {
            url: 'https://res.cloudinary.com/demo/image/upload/nalca.jpg',
            publicId: 'nalca',
          },
        ],
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

    expect(screen.getByText('Vídeo del proyecto')).toBeInTheDocument();
    const blurred = document.querySelector('img.blur-md');
    expect(blurred).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/demo/image/upload/nalca.jpg',
    );
  });

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

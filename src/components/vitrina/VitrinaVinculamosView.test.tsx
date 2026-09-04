import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitrinaVinculamosView } from '@/components/vitrina/VitrinaVinculamosView';
import { getMideimpactoIniciativas } from '@/lib/actions/mideimpacto-iniciativas';
import type { MideimpactoIniciativa } from '@/lib/mideimpacto-iniciativas';

vi.mock('@/lib/actions/mideimpacto-iniciativas', () => ({
  getMideimpactoIniciativas: vi.fn(),
}));

const fetchMock = vi.mocked(getMideimpactoIniciativas);

afterEach(() => {
  cleanup();
  fetchMock.mockReset();
});

function row(
  patch: Partial<MideimpactoIniciativa> & Pick<MideimpactoIniciativa, 'id' | 'nombre'>,
): MideimpactoIniciativa {
  return {
    estado: 'Activa',
    fechaInicio: '2024-01-01',
    fechaTermino: '',
    mecanismo: 'Extensión',
    adjuntos: [],
    sede: '',
    ...patch,
  };
}

function pageOf(rows: MideimpactoIniciativa[], page = 1, lastPage = 1, total = rows.length) {
  return { rows, page, lastPage, total };
}

describe('VitrinaVinculamosView', () => {
  it('muestra sidebar de filtros y las columnas fijas del listado', () => {
    render(
      <VitrinaVinculamosView
        onBack={vi.fn()}
        initial={{
          success: true,
          data: pageOf([
            row({
              id: '12',
              nombre: 'Huertos urbanos',
            }),
          ]),
        }}
      />,
    );
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ID' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Estado' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fecha' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mecanismo' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^ID/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Nombre proyecto/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Estado/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Fecha inicio/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Fecha término/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Mecanismo/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Adjuntos/i })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /Brecha/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /Descripción/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /Objetivo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Territorio' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Sede' })).not.toBeInTheDocument();
    expect(screen.getByText('Huertos urbanos')).toBeInTheDocument();
  });

  it('muestra enlaces de adjuntos con download_url vía proxy', () => {
    render(
      <VitrinaVinculamosView
        onBack={vi.fn()}
        initial={{
          success: true,
          data: pageOf([
            row({
              id: '12',
              nombre: 'Huertos urbanos',
              adjuntos: [
                {
                  id: '4',
                  nombre: 'Informe.pdf',
                  downloadUrl:
                    'https://api.mideimpacto.com/api/external/v1/iniciativas/12/adjuntos/4/descargar',
                },
              ],
            }),
          ]),
        }}
      />,
    );
    const link = screen.getByRole('link', { name: 'Informe.pdf' });
    expect(link).toHaveAttribute(
      'href',
      '/api/mideimpacto-adjunto?iniciativa=12&adjunto=4&nombre=Informe.pdf',
    );
  });

  it('permite redimensionar columnas arrastrando el separador del header', () => {
    render(
      <VitrinaVinculamosView
        onBack={vi.fn()}
        initial={{
          success: true,
          data: pageOf([row({ id: '12', nombre: 'Huertos urbanos' })]),
        }}
      />,
    );
    const handle = screen.getByRole('separator', {
      name: 'Redimensionar columna Nombre proyecto',
    });
    const head = screen.getByRole('columnheader', {
      name: /Nombre proyecto/i,
    });
    expect(head).toHaveStyle({ width: '260px' });

    fireEvent.mouseDown(handle, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 140 });
    fireEvent.mouseUp(document, { clientX: 140 });

    expect(head).toHaveStyle({ width: '300px' });
    expect(screen.getByText('Huertos urbanos')).toHaveStyle({ width: '300px' });
  });

  it('filtra filas por estado desde el sidebar', async () => {
    const rows = [
      row({ id: '1', nombre: 'Alfa', estado: 'Activa' }),
      row({ id: '2', nombre: 'Beta', estado: 'Cerrada' }),
    ];
    const user = userEvent.setup();
    render(
      <VitrinaVinculamosView
        onBack={vi.fn()}
        initial={{
          success: true,
          data: pageOf(rows),
        }}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Todos los estados/i }));
    await user.click(within(screen.getByRole('dialog')).getByText('Cerrada'));
    expect(screen.queryByText('Alfa')).not.toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('muestra error', () => {
    render(
      <VitrinaVinculamosView
        onBack={vi.fn()}
        initial={{ success: false, error: 'Token inválido o ausente' }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Token inválido o ausente',
    );
  });

  it('muestra vacío', () => {
    render(
      <VitrinaVinculamosView
        onBack={vi.fn()}
        initial={{
          success: true,
          data: pageOf([]),
        }}
      />,
    );
    expect(
      screen.getByText('No hay iniciativas para mostrar.'),
    ).toBeInTheDocument();
  });

  it('pide la página siguiente solo con el listado', async () => {
    fetchMock.mockResolvedValue({
      success: true,
      data: pageOf([row({ id: '99', nombre: 'Página dos' })], 2, 2, 2),
    });
    const user = userEvent.setup();
    render(
      <VitrinaVinculamosView
        onBack={vi.fn()}
        initial={{
          success: true,
          data: pageOf([row({ id: '12', nombre: 'Huertos urbanos' })], 1, 2, 2),
        }}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith({ page: 2 }));
  });
});

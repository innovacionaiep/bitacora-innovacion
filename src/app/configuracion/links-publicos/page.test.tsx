import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfiguracionLinksPublicosPage from '@/app/configuracion/links-publicos/page';

vi.mock('@/hooks/usePageTopLoader', () => ({
  usePageTopLoader: () => undefined,
}));

vi.mock('@/lib/actions/configuracion-links-publicos', () => ({
  listProyectosNombresLinksPublicos: vi.fn(),
  listLinksPublicosActivos: vi.fn(),
  getLinkPublicoActivo: vi.fn(),
  generarLinkPublico: vi.fn(),
  caducarLinkPublico: vi.fn(),
}));

import {
  caducarLinkPublico,
  generarLinkPublico,
  getLinkPublicoActivo,
  listLinksPublicosActivos,
  listProyectosNombresLinksPublicos,
} from '@/lib/actions/configuracion-links-publicos';

const listMock = vi.mocked(listProyectosNombresLinksPublicos);
const listActivosMock = vi.mocked(listLinksPublicosActivos);
const getMock = vi.mocked(getLinkPublicoActivo);
const genMock = vi.mocked(generarLinkPublico);
const cadMock = vi.mocked(caducarLinkPublico);

describe('Configuración Links públicos', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    listMock.mockReset();
    listActivosMock.mockReset();
    getMock.mockReset();
    genMock.mockReset();
    cadMock.mockReset();
    listMock.mockResolvedValue({
      success: true,
      data: [{ id: 'p1', proyecto: 'Nalca Essence' }],
    });
    listActivosMock.mockResolvedValue({ success: true, data: [] });
    getMock.mockResolvedValue({ success: true, data: null });
  });

  it('muestra Generar a la derecha y no copia ni caduca en la zona de generación', async () => {
    const user = userEvent.setup();
    render(<ConfiguracionLinksPublicosPage />);
    await screen.findByText('Generar link');
    await user.selectOptions(screen.getByLabelText('Proyecto'), 'p1');
    expect(
      await screen.findByRole('button', { name: 'Generar link público' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Copiar link' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Caducar link' })
    ).not.toBeInTheDocument();
  });

  it('no ofrece Generar si el proyecto ya tiene link; copiar y caducar están en la tabla', async () => {
    const token = 'ab'.repeat(32);
    const url = `https://bitacora-innovacion.vercel.app/p/${token}`;
    getMock.mockResolvedValue({
      success: true,
      data: {
        token,
        proyectoId: 'p1',
        createdAt: new Date('2026-09-11'),
        url,
      },
    });
    listActivosMock.mockResolvedValue({
      success: true,
      data: [
        {
          token,
          proyectoId: 'p1',
          proyecto: 'Nalca Essence',
          createdAt: new Date('2026-09-11'),
          url,
        },
      ],
    });
    const user = userEvent.setup();
    render(<ConfiguracionLinksPublicosPage />);
    await user.selectOptions(
      await screen.findByLabelText('Proyecto'),
      'p1'
    );
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Generar link público' })
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText(url)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copiar link de Nalca Essence' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Caducar link de Nalca Essence' })
    ).toBeInTheDocument();
  });

  it('muestra tabla de links activos y permite caducar desde la fila', async () => {
    const token = 'cd'.repeat(32);
    const url = `https://bitacora-innovacion.vercel.app/p/${token}`;
    listActivosMock.mockResolvedValue({
      success: true,
      data: [
        {
          token,
          proyectoId: 'p2',
          proyecto: 'NeuroScratch',
          createdAt: new Date('2026-09-11'),
          url,
        },
      ],
    });
    cadMock.mockImplementation(async () => {
      listActivosMock.mockResolvedValue({ success: true, data: [] });
      return { success: true };
    });
    const user = userEvent.setup();
    render(<ConfiguracionLinksPublicosPage />);
    expect(await screen.findByRole('columnheader', { name: 'Proyecto' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Link' })).toBeInTheDocument();
    expect(screen.getByText('NeuroScratch')).toBeInTheDocument();
    expect(screen.getByText(url)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copiar link de NeuroScratch' })
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Caducar link de NeuroScratch' })
    );
    await waitFor(() => {
      expect(cadMock).toHaveBeenCalledWith('p2');
    });
    await waitFor(() => {
      expect(screen.queryByText('NeuroScratch')).not.toBeInTheDocument();
    });
  });
});

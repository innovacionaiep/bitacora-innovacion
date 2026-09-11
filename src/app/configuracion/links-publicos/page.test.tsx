import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfiguracionLinksPublicosPage from '@/app/configuracion/links-publicos/page';

vi.mock('@/hooks/usePageTopLoader', () => ({
  usePageTopLoader: () => undefined,
}));

vi.mock('@/lib/actions/configuracion-links-publicos', () => ({
  listProyectosNombresLinksPublicos: vi.fn(),
  getLinkPublicoActivo: vi.fn(),
  generarLinkPublico: vi.fn(),
  caducarLinkPublico: vi.fn(),
}));

import {
  caducarLinkPublico,
  generarLinkPublico,
  getLinkPublicoActivo,
  listProyectosNombresLinksPublicos,
} from '@/lib/actions/configuracion-links-publicos';

const listMock = vi.mocked(listProyectosNombresLinksPublicos);
const getMock = vi.mocked(getLinkPublicoActivo);
const genMock = vi.mocked(generarLinkPublico);
const cadMock = vi.mocked(caducarLinkPublico);

describe('Configuración Links públicos', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    listMock.mockReset();
    getMock.mockReset();
    genMock.mockReset();
    cadMock.mockReset();
    listMock.mockResolvedValue({
      success: true,
      data: [{ id: 'p1', proyecto: 'Nalca Essence' }],
    });
    getMock.mockResolvedValue({ success: true, data: null });
  });

  it('muestra Generar link público al elegir un proyecto sin link', async () => {
    const user = userEvent.setup();
    render(<ConfiguracionLinksPublicosPage />);
    await screen.findByText('Links públicos');
    await user.selectOptions(
      screen.getByLabelText('Proyecto'),
      'p1'
    );
    expect(
      await screen.findByRole('button', { name: 'Generar link público' })
    ).toBeInTheDocument();
  });

  it('muestra URL y Caducar cuando hay link activo', async () => {
    const token = 'ab'.repeat(32);
    getMock.mockResolvedValue({
      success: true,
      data: {
        token,
        proyectoId: 'p1',
        createdAt: new Date('2026-09-11'),
      },
    });
    const user = userEvent.setup();
    render(<ConfiguracionLinksPublicosPage />);
    await user.selectOptions(
      await screen.findByLabelText('Proyecto'),
      'p1'
    );
    await waitFor(() => {
      expect(
        screen.getByText(
          `https://bitacora-innovacion.vercel.app/p/${token}`
        )
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Caducar link' })).toBeInTheDocument();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitrinaGuestGate } from '@/components/vitrina/VitrinaGuestGate';
import { redeemPortalGuestCode } from '@/lib/actions/portal-guest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/actions/portal-guest', () => ({
  redeemPortalGuestCode: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

const redeemMock = vi.mocked(redeemPortalGuestCode);

describe('VitrinaGuestGate', () => {
  it('muestra un loader al aceptar el código y deja de mostrar los botones', async () => {
    const user = userEvent.setup();
    redeemMock.mockResolvedValue({ success: true });
    render(<VitrinaGuestGate onBack={() => undefined} />);

    await user.click(
      screen.getByRole('button', { name: 'Ingresar con código de invitado' }),
    );
    await user.type(screen.getByLabelText('Código'), 'causalab');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => {
      expect(
        screen.getByRole('status', { name: 'Cargando la información del portal' }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('link', { name: 'Iniciar sesión' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Ingresar con código de invitado' }),
    ).not.toBeInTheDocument();
  });

  it('si el código es inválido no muestra el loader', async () => {
    const user = userEvent.setup();
    redeemMock.mockResolvedValue({ success: false, error: 'Código inválido' });
    render(<VitrinaGuestGate onBack={() => undefined} />);

    await user.click(
      screen.getByRole('button', { name: 'Ingresar con código de invitado' }),
    );
    await user.type(screen.getByLabelText('Código'), 'malo');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => {
      expect(screen.getByText('Código inválido')).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('status', { name: 'Cargando la información del portal' }),
    ).not.toBeInTheDocument();
  });
});

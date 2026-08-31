import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitrinaContactModal } from '@/components/vitrina/VitrinaContactModal';
import { PORTAL_CONTACT_CENTRO_EMAIL } from '@/lib/portal-contact';
import { sendPortalContactEmail } from '@/lib/actions/portal-contact';

vi.mock('@/lib/actions/portal-contact', () => ({
  sendPortalContactEmail: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

const sendMock = vi.mocked(sendPortalContactEmail);

describe('VitrinaContactModal', () => {
  it('muestra destinatarios fijos y no permite editarlos', () => {
    render(
      <VitrinaContactModal
        open
        onOpenChange={() => undefined}
        proyectoId="p1"
        proyectoNombre="AuditorIA"
        encargadoCorreo="lucia.ramirezc@correoaiep.cl"
      />,
    );

    const recipients = screen.getByTestId('portal-contact-recipients');
    expect(recipients).toHaveTextContent(PORTAL_CONTACT_CENTRO_EMAIL);
    expect(recipients).toHaveTextContent('lucia.ramirezc@correoaiep.cl');
    expect(
      screen.queryByRole('textbox', { name: /destinatarios/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    expect(screen.getByTestId('portal-contact-subject')).toHaveTextContent(
      'Quiero contactar con su proyecto (AuditorIA)',
    );
    expect(
      screen.queryByRole('textbox', { name: /asunto/i }),
    ).not.toBeInTheDocument();
  });

  it('añade el remitente a destinatarios y envía con asunto fijo', async () => {
    const user = userEvent.setup();
    sendMock.mockResolvedValue({ success: true });
    const onOpenChange = vi.fn();
    render(
      <VitrinaContactModal
        open
        onOpenChange={onOpenChange}
        proyectoId="p1"
        proyectoNombre="AuditorIA"
        encargadoCorreo="lucia.ramirezc@correoaiep.cl"
      />,
    );

    await user.type(screen.getByLabelText('Remitente'), 'visitante@mail.cl');
    expect(screen.getByTestId('portal-contact-recipients')).toHaveTextContent(
      'visitante@mail.cl',
    );
    await user.type(screen.getByLabelText('Mensaje'), 'Quiero saber más');
    await user.type(screen.getByLabelText('Su nombre'), 'Ana Soto');
    await user.type(screen.getByLabelText('Su cargo o título'), 'Docente');
    await user.type(screen.getByLabelText('Su institución'), 'AIEP');
    expect(screen.getByTestId('portal-contact-signature')).toHaveTextContent(
      'Ana Soto',
    );
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(sendMock).toHaveBeenCalledWith({
      proyectoId: 'p1',
      remitente: 'visitante@mail.cl',
      mensaje: 'Quiero saber más',
      nombre: 'Ana Soto',
      cargo: 'Docente',
      institucion: 'AIEP',
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

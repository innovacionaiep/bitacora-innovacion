import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitrinaMapaView } from '@/components/vitrina/VitrinaMapaView';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';

afterEach(cleanup);

function projectsFrom(
  rows: Array<{
    nombre: string;
    sedes?: string[];
    fotos?: Array<{ url: string; publicId: string }>;
  }>,
) {
  const result = normalizeVitrinaProyectos(rows);
  if (!result.ok) throw new Error(result.error);
  return result.proyectos;
}

describe('VitrinaMapaView', () => {
  it('muestra Chile vertical, pide elegir una región y marca cantidad con puntos sin botón', () => {
    render(
      <VitrinaMapaView
        onBack={vi.fn()}
        proyectos={projectsFrom([
          { nombre: 'ClinicApp', sedes: ['Valparaíso'] },
          { nombre: 'Beehappy', sedes: ['Valparaíso'] },
        ])}
      />,
    );

    expect(
      screen.getByRole('group', { name: 'Mapa de Chile, norte arriba' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Haz clic en una región a la izquierda/),
    ).toBeInTheDocument();
    const nationalPin = document.querySelector('[data-national-pin="5"]');
    expect(nationalPin).toBeInTheDocument();
    expect(nationalPin).not.toHaveAttribute('role', 'button');
    expect(
      screen.queryByRole('button', { name: 'Valparaíso: 2 proyectos' }),
    ).not.toBeInTheDocument();
  });

  it('al hacer clic en una región muestra el svg, el título y tarjetas con foto', async () => {
    const user = userEvent.setup();
    render(
      <VitrinaMapaView
        onBack={vi.fn()}
        proyectos={projectsFrom([
          {
            nombre: 'ClinicApp',
            sedes: ['Valparaíso'],
            fotos: [
              {
                url: 'https://res.cloudinary.com/demo/image/upload/clinic.jpg',
                publicId: 'clinic',
              },
            ],
          },
          { nombre: 'Beehappy', sedes: ['Valparaíso'] },
          { nombre: 'AgroTech', sedes: ['Temuco'] },
          { nombre: 'VirtualApp', sedes: ['Online'] },
        ])}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Región de Valparaíso' }),
    );

    expect(
      screen.getByRole('group', { name: 'Región de Valparaíso ampliada' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Región de Valparaíso', { selector: 'p' }),
    ).toBeInTheDocument();
    const zoomPath = document.querySelector('.chile-region-zoom-path');
    expect(zoomPath).toHaveAttribute('fill', '#e2e8f0');
    expect(
      screen.getByRole('button', { name: 'Región de Valparaíso' }),
    ).toHaveAttribute('fill', '#10b981');
    expect(screen.getByText('ClinicApp')).toBeInTheDocument();
    expect(screen.getByText('Beehappy')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Sede Valparaíso', { selector: 'text' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('AgroTech')).not.toBeInTheDocument();
    expect(document.querySelector('img')?.getAttribute('src')).toBe(
      'https://res.cloudinary.com/demo/image/upload/clinic.jpg',
    );
  });

  it('al hacer clic en una tarjeta abre la ficha del proyecto', async () => {
    const user = userEvent.setup();
    const onOpenProyecto = vi.fn();
    const proyectos = projectsFrom([
      { nombre: 'ClinicApp', sedes: ['Valparaíso'] },
    ]);
    render(
      <VitrinaMapaView
        onBack={vi.fn()}
        onOpenProyecto={onOpenProyecto}
        proyectos={proyectos}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Región de Valparaíso' }),
    );
    await user.click(screen.getByRole('button', { name: 'ClinicApp' }));
    expect(onOpenProyecto).toHaveBeenCalledWith(proyectos[0]?.id);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitrinaMapaView } from '@/components/vitrina/VitrinaMapaView';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';

afterEach(cleanup);

function projectsFrom(
  rows: Array<{
    nombre: string;
    sedes?: string[];
    comunas?: string[];
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
    expect(
      document.querySelector('[data-region-hover-label="5"]'),
    ).toHaveTextContent('Región de Valparaíso');
    expect(
      document.querySelector('[data-testid="trl-selected-chevron"]'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('national-map-frame')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acercar mapa' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Alejar mapa' })).toBeDisabled();
  });

  it('acerca el mapa nacional y permite volver a alejarlo', async () => {
    const user = userEvent.setup();
    render(
      <VitrinaMapaView
        onBack={vi.fn()}
        proyectos={projectsFrom([{ nombre: 'ClinicApp', sedes: ['Valparaíso'] }])}
      />,
    );
    const svg = screen
      .getByRole('group', { name: 'Mapa de Chile, norte arriba' })
      .querySelector('.national-map-svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 280 1120');
    await user.click(screen.getByRole('button', { name: 'Acercar mapa' }));
    const zoomed = svg?.getAttribute('viewBox') ?? '';
    expect(zoomed).not.toBe('0 0 280 1120');
    expect(screen.getByRole('button', { name: 'Alejar mapa' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Alejar mapa' }));
    expect(svg?.getAttribute('viewBox')).toBe('0 0 280 1120');
  });

  it('hace zoom con la rueda del ratón', () => {
    render(
      <VitrinaMapaView
        onBack={vi.fn()}
        proyectos={projectsFrom([{ nombre: 'ClinicApp', sedes: ['Valparaíso'] }])}
      />,
    );
    const svg = screen
      .getByRole('group', { name: 'Mapa de Chile, norte arriba' })
      .querySelector('.national-map-svg');
    expect(svg).toBeTruthy();
    fireEvent.wheel(svg as SVGSVGElement, { deltaY: -120, clientX: 20, clientY: 40 });
    expect(svg?.getAttribute('viewBox')).not.toBe('0 0 280 1120');
    expect(screen.getByRole('button', { name: 'Alejar mapa' })).toBeEnabled();
  });

  it('permite arrastrar el mapa nacional al estar con zoom', async () => {
    const user = userEvent.setup();
    render(
      <VitrinaMapaView
        onBack={vi.fn()}
        proyectos={projectsFrom([{ nombre: 'ClinicApp', sedes: ['Valparaíso'] }])}
      />,
    );
    const svg = screen
      .getByRole('group', { name: 'Mapa de Chile, norte arriba' })
      .querySelector('.national-map-svg') as SVGSVGElement;
    await user.click(screen.getByRole('button', { name: 'Acercar mapa' }));
    const before = svg.getAttribute('viewBox');
    fireEvent.pointerDown(svg, {
      pointerId: 1,
      clientX: 40,
      clientY: 40,
      button: 0,
    });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 40, clientY: 160 });
    fireEvent.pointerUp(svg, { pointerId: 1 });
    expect(svg.getAttribute('viewBox')).not.toBe(before);
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
      screen.getByRole('heading', { name: 'Valparaíso' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Región')).toBeInTheDocument();
    const zoomPath = document.querySelector('.chile-region-zoom-path');
    expect(zoomPath).toHaveAttribute('fill', '#e2e8f0');
    expect(
      screen.getByRole('button', { name: 'Región de Valparaíso' }),
    ).toHaveAttribute('fill', '#10b981');
    expect(screen.getByTestId('trl-selected-chevron')).toBeInTheDocument();
    expect(screen.getByText('ClinicApp')).toBeInTheDocument();
    expect(screen.getByText('Beehappy')).toBeInTheDocument();
    expect(screen.getByLabelText('Sede Valparaíso')).toBeInTheDocument();
    expect(screen.queryByText('AgroTech')).not.toBeInTheDocument();
    expect(document.querySelector('img')?.getAttribute('src')).toBe(
      'https://res.cloudinary.com/demo/image/upload/clinic.jpg',
    );
    expect(screen.queryByText('VirtualApp')).not.toBeInTheDocument();
  });

  it('al hacer clic en Sede Online muestra el título y las tarjetas alrededor', async () => {
    const user = userEvent.setup();
    render(
      <VitrinaMapaView
        onBack={vi.fn()}
        proyectos={projectsFrom([
          { nombre: 'VirtualApp', sedes: ['Online'] },
          { nombre: 'ClinicApp', sedes: ['Valparaíso'] },
        ])}
      />,
    );

    expect(screen.getByRole('button', { name: 'Sede Online' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sede Online' }));

    const zoom = screen.getByRole('group', { name: 'Sede Online ampliada' });
    expect(zoom).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Online' })).toBeInTheDocument();
    expect(zoom).toHaveTextContent('Sede');
    expect(screen.getByText('VirtualApp')).toBeInTheDocument();
    expect(screen.queryByText('ClinicApp')).not.toBeInTheDocument();
    expect(document.querySelector('.chile-region-zoom-path')).not.toBeInTheDocument();
    expect(screen.getByTestId('online-sede-zoom-globe')).toBeInTheDocument();
  });

  it('el drag del mapa nacional no quita la región ampliada', async () => {
    const user = userEvent.setup();
    render(
      <VitrinaMapaView
        onBack={vi.fn()}
        proyectos={projectsFrom([{ nombre: 'ClinicApp', sedes: ['Valparaíso'] }])}
      />,
    );
    await user.click(
      screen.getByRole('button', { name: 'Región de Valparaíso' }),
    );
    expect(
      screen.getByRole('group', { name: 'Región de Valparaíso ampliada' }),
    ).toBeInTheDocument();
    const svg = screen
      .getByRole('group', { name: 'Mapa de Chile, norte arriba' })
      .querySelector('.national-map-svg') as SVGSVGElement;
    await user.click(screen.getByRole('button', { name: 'Acercar mapa' }));
    fireEvent.pointerDown(svg, {
      pointerId: 1,
      clientX: 40,
      clientY: 40,
      button: 0,
    });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 40, clientY: 160 });
    fireEvent.pointerUp(svg, { pointerId: 1 });
    expect(
      screen.getByRole('group', { name: 'Región de Valparaíso ampliada' }),
    ).toBeInTheDocument();
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

  it('ubica Emprendedor/a Externo por comuna en el mapa nacional y el zoom', async () => {
    const user = userEvent.setup();
    render(
      <VitrinaMapaView
        onBack={vi.fn()}
        proyectos={projectsFrom([
          {
            nombre: 'ExtApp',
            sedes: ['Emprendedor/a Externo'],
            comunas: ['Quilpué'],
          },
        ])}
      />,
    );

    const nationalPin = document.querySelector('[data-national-pin="5"]');
    expect(nationalPin).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Región de Valparaíso' }),
    );

    expect(
      screen.queryByLabelText('Comuna Quilpué', { exact: true }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Comuna Quilpué')).toBeInTheDocument();
    expect(screen.getByText('Emprendedor/a Externo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ExtApp' })).toBeInTheDocument();
    expect(
      document.querySelector('.vitrina-map-pin'),
    ).toHaveAttribute('fill', '#c2410c');
  });

  it('muestra un proyecto solo Online en el globo y por comuna en la región', async () => {
    const user = userEvent.setup();
    render(
      <VitrinaMapaView
        onBack={vi.fn()}
        proyectos={projectsFrom([
          {
            nombre: 'VirtualApp',
            sedes: ['Sede Online'],
            comunas: ['Quilpué'],
          },
        ])}
      />,
    );

    expect(screen.getByRole('button', { name: 'Sede Online' })).toBeInTheDocument();
    const nationalPin = document.querySelector('[data-national-pin="5"]');
    expect(nationalPin).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sede Online' }));
    expect(screen.getByText('VirtualApp')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Región de Valparaíso' }),
    );
    expect(
      screen.queryByLabelText('Comuna Quilpué', { exact: true }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Comuna Quilpué')).toBeInTheDocument();
    expect(screen.getByText('Sede Online')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'VirtualApp' })).toBeInTheDocument();
    expect(document.querySelector('.vitrina-map-pin')).toHaveAttribute(
      'fill',
      '#6d28d9',
    );
  });
});

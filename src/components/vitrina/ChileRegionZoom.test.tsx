import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ChileRegionZoom } from '@/components/vitrina/ChileRegionZoom';
import {
  COMUNA_MAP_PIN_FILL,
  EMPRENDEDOR_EXTERNO_MAP_BADGE,
  groupVitrinaProyectosBySede,
  ONLINE_COMUNA_MAP_PIN_FILL,
  pinsForRegion,
  SEDE_ONLINE_MAP_BADGE,
  type AiepSedePin,
} from '@/lib/aiep-sede-geo';
import { chileRegionById } from '@/lib/chile-horizontal-paths';
import { VITRINA_SEDE_EMPRENDEDOR_EXTERNO } from '@/lib/vitrina-card-display';

afterEach(cleanup);

function pinFor(
  rows: Array<{
    id: string;
    nombre: string;
    sedes: string[];
    comunas?: string[];
  }>,
): AiepSedePin[] {
  return groupVitrinaProyectosBySede(rows);
}

describe('ChileRegionZoom Emprendedor/a Externo', () => {
  it('pinta pin naranja, nombre de comuna y rótulo sobre la tarjeta', () => {
    const region = chileRegionById(5);
    expect(region).toBeTruthy();
    const pins = pinFor([
      {
        id: 'e1',
        nombre: 'ExtApp',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Quilpué'],
      },
    ]);

    render(<ChileRegionZoom region={region!} pins={pins} />);

    expect(
      screen.queryByLabelText('Comuna Quilpué', { exact: true }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Sede Quilpué/i)).not.toBeInTheDocument();
    expect(screen.getByText('Comuna Quilpué')).toBeInTheDocument();
    expect(screen.getByText(EMPRENDEDOR_EXTERNO_MAP_BADGE)).toBeInTheDocument();
    expect(
      screen.getByLabelText('Comuna Quilpué, Emprendedor/a Externo'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ExtApp' })).toBeInTheDocument();

    const circle = document.querySelector('.vitrina-map-pin');
    expect(circle).toHaveAttribute('fill', COMUNA_MAP_PIN_FILL);
    expect(circle).toHaveAttribute('stroke', '#fff');
    const line = document.querySelector(
      `[data-testid="comuna-line-${pins[0]?.id}"]`,
    );
    expect(line).toBeInTheDocument();
    expect(line).toHaveAttribute('stroke', COMUNA_MAP_PIN_FILL);
  });

  it('mantiene sede AIEP sin rótulo naranja ni fill de comuna', () => {
    const region = chileRegionById(5);
    const pins = pinFor([
      { id: 'c1', nombre: 'ClinicApp', sedes: ['Valparaíso'] },
    ]);

    render(<ChileRegionZoom region={region!} pins={pins} />);

    expect(screen.getByLabelText('Sede Valparaíso')).toBeInTheDocument();
    expect(
      screen.queryByText(EMPRENDEDOR_EXTERNO_MAP_BADGE),
    ).not.toBeInTheDocument();
    const circle = document.querySelector('.vitrina-map-pin');
    expect(circle).toHaveAttribute('fill', '#475569');
    expect(
      document.querySelector('[data-testid^="comuna-line-"]'),
    ).not.toBeInTheDocument();
  });

  it('abre la ficha al hacer clic en la tarjeta de comuna', async () => {
    const onOpenProyecto = vi.fn();
    const region = chileRegionById(5);
    const pins = pinFor([
      {
        id: 'e1',
        nombre: 'ExtApp',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Quilpué'],
      },
    ]);

    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(
      <ChileRegionZoom
        region={region!}
        pins={pins}
        onOpenProyecto={onOpenProyecto}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'ExtApp' }));
    expect(onOpenProyecto).toHaveBeenCalledWith('e1');
  });
});

describe('ChileRegionZoom Sede Online por comuna', () => {
  it('pinta pin morado, nombre de comuna y rótulo Sede Online', () => {
    const region = chileRegionById(5);
    const all = pinFor([
      {
        id: 'v1',
        nombre: 'VirtualApp',
        sedes: ['Online'],
        comunas: ['Quilpué'],
      },
    ]);
    const pins = pinsForRegion(all, 5);

    render(<ChileRegionZoom region={region!} pins={pins} />);

    expect(
      screen.queryByLabelText('Comuna Quilpué', { exact: true }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Comuna Quilpué')).toBeInTheDocument();
    expect(screen.getByText(SEDE_ONLINE_MAP_BADGE)).toBeInTheDocument();
    expect(
      screen.getByLabelText('Comuna Quilpué, Sede Online'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'VirtualApp' })).toBeInTheDocument();

    const circle = document.querySelector('.vitrina-map-pin');
    expect(circle).toHaveAttribute('fill', ONLINE_COMUNA_MAP_PIN_FILL);
    const line = document.querySelector(
      `[data-testid="comuna-line-${pins[0]?.id}"]`,
    );
    expect(line).toBeInTheDocument();
    expect(line).toHaveAttribute('stroke', ONLINE_COMUNA_MAP_PIN_FILL);
  });
});

describe('ChileRegionZoom RM tamaño visual del mapa', () => {
  it('agranda solo el dibujo de RM un 10% y deja otras regiones sin esa escala', () => {
    const rm = chileRegionById(13);
    expect(rm).toBeTruthy();
    const { unmount } = render(<ChileRegionZoom region={rm!} pins={[]} />);
    expect(screen.getByTestId('region-map-visual').getAttribute('transform')).toContain(
      'scale(1.1)',
    );
    unmount();

    const valparaiso = chileRegionById(5);
    render(<ChileRegionZoom region={valparaiso!} pins={[]} />);
    expect(
      screen.getByTestId('region-map-visual').getAttribute('transform'),
    ).toBeNull();
  });
});

describe('ChileRegionZoom RM overflow de sede', () => {
  it('muestra el extra de Bellavista como nombre clickeable debajo', async () => {
    const onOpenProyecto = vi.fn();
    const region = chileRegionById(13);
    expect(region).toBeTruthy();
    const pins = pinFor([
      { id: 'b1', nombre: 'Uno', sedes: ['Bellavista'] },
      { id: 'b2', nombre: 'Dos', sedes: ['Bellavista'] },
      { id: 'b3', nombre: 'Tres', sedes: ['Bellavista'] },
      { id: 'b4', nombre: 'Cuatro', sedes: ['Bellavista'] },
      { id: 'b5', nombre: 'Cinco', sedes: ['Bellavista'] },
      { id: 'b6', nombre: 'Seis', sedes: ['Bellavista'] },
      { id: 'b7', nombre: 'Verdética', sedes: ['Bellavista'] },
    ]);

    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(
      <ChileRegionZoom
        region={region!}
        pins={pins}
        onOpenProyecto={onOpenProyecto}
      />,
    );

    expect(screen.getByText('+1 Proyecto')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Uno' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Seis' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verdética' })).toBeInTheDocument();
    expect(screen.getByText('+1 Proyecto').closest('p')?.className).toMatch(
      /text-\[12px\].*tracking-tight/,
    );
    expect(screen.getByRole('button', { name: 'Verdética' }).className).toMatch(
      /text-\[12px\].*text-emerald-600/,
    );

    await user.click(screen.getByRole('button', { name: 'Verdética' }));
    expect(onOpenProyecto).toHaveBeenCalledWith('b7');
  });
});


import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { VitrinaChartProjectTooltip } from '@/components/vitrina/VitrinaChartProjectTooltip';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockOverflow(element: HTMLElement) {
  Object.defineProperty(element, 'clientHeight', {
    configurable: true,
    value: 80,
  });
  Object.defineProperty(element, 'scrollHeight', {
    configurable: true,
    value: 400,
  });
}

describe('VitrinaChartProjectTooltip', () => {
  it('usa un ancho mayor que el tooltip compacto anterior', () => {
    render(
      <VitrinaChartProjectTooltip
        title="Fondo Impulsa"
        nombres={['ClinicApp']}
        x={12}
        y={20}
      />,
    );

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.className).toContain('max-w-md');
    expect(tooltip.className).not.toContain('max-w-xs');
  });

  it('desplaza el listado con la rueda del mouse aunque el cursor no esté sobre el tooltip', () => {
    render(
      <VitrinaChartProjectTooltip
        title="Fondo Impulsa"
        nombres={Array.from({ length: 20 }, (_, i) => `Proyecto ${i + 1}`)}
        x={12}
        y={20}
      />,
    );

    const tooltip = screen.getByRole('tooltip');
    mockOverflow(tooltip);
    expect(tooltip.scrollTop).toBe(0);

    fireEvent.wheel(window, { deltaY: 48 });

    expect(tooltip.scrollTop).toBe(48);
  });

  it('voltea a la izquierda y hacia arriba cuando no cabe en el viewport', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 200,
      right: 280,
      width: 280,
      height: 200,
      toJSON: () => ({}),
    } as DOMRect);
    vi.stubGlobal('innerWidth', 1000);
    vi.stubGlobal('innerHeight', 800);

    render(
      <VitrinaChartProjectTooltip
        title="Fondo Impulsa"
        nombres={['ClinicApp']}
        x={920}
        y={740}
      />,
    );

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.style.left).toBe('626px');
    expect(tooltip.style.top).toBe('526px');
  });
});

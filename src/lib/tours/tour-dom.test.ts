import { describe, expect, it, afterEach } from 'vitest';
import { filterVisibleTourSteps } from '@/lib/tours/tour-dom';
import type { DriveStep } from 'driver.js';

describe('filterVisibleTourSteps (keep-alive)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('skips anchors inside .hidden panels and resolves the visible duplicate id', () => {
    document.body.innerHTML = `
      <div class="hidden" style="display: none"><div id="tour-general-meta-rail">hidden mobile</div></div>
      <div id="tour-general-meta-rail">visible desktop</div>
      <div class="hidden" style="display: none"><div id="tour-gantt-board">hidden gantt from prior visit</div></div>
    `;

    const steps: DriveStep[] = [
      {
        element: '#tour-general-meta-rail',
        popover: { title: 'Meta', description: 'x' },
      },
      {
        element: '#tour-gantt-board',
        popover: { title: 'Gantt', description: 'y' },
      },
    ];

    const filtered = filterVisibleTourSteps(steps);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.element).toBeInstanceOf(HTMLElement);
    expect((filtered[0]?.element as HTMLElement).textContent).toContain(
      'visible desktop'
    );
  });

  it('does not treat hidden lg:flex as always invisible (computed style)', () => {
    document.body.innerHTML = `
      <div class="hidden lg:flex" style="display: flex">
        <div id="tour-general-indice">desktop index</div>
      </div>
    `;
    const steps: DriveStep[] = [
      {
        element: '#tour-general-indice',
        popover: { title: 'Índice', description: 'x' },
      },
    ];
    const filtered = filterVisibleTourSteps(steps);
    expect(filtered).toHaveLength(1);
  });
});

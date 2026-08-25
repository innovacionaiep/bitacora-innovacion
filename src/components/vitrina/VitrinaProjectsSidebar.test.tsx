import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitrinaProjectsSidebar } from '@/components/vitrina/VitrinaProjectsSidebar';
import { EMPTY_VITRINA_FILTERS } from '@/lib/vitrina-project-filters';

afterEach(() => {
  cleanup();
});

const options = {
  fondos: ['Impulsa', 'Crea'],
  sedes: ['Rancagua'],
  escuelas: ['Salud'],
  etiquetas: ['Arte'],
};

describe('VitrinaProjectsSidebar', () => {
  it('abre el menú de opciones a la derecha del filtro', async () => {
    const user = userEvent.setup();
    render(
      <VitrinaProjectsSidebar
        options={options}
        filters={EMPTY_VITRINA_FILTERS}
        query=""
        matchIds={null}
        aiFilterActive={false}
        onToggle={vi.fn()}
        onQueryChange={vi.fn()}
        onClear={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Todos los fondos/i }));

    const panel = screen.getByRole('dialog', { name: 'Fondo' });
    expect(panel).toHaveAttribute('data-side', 'right');
    expect(panel).toHaveTextContent('Impulsa');
    expect(panel).toHaveTextContent('Crea');
  });
});

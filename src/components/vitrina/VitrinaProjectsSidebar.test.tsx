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

function renderSidebar() {
  return render(
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
}

describe('VitrinaProjectsSidebar', () => {
  it('coloca el botón de colapsar encima del pie Dirección Nacional', () => {
    renderSidebar();

    const toggle = screen.getByRole('button', { name: 'Ocultar filtros' });
    const footer = screen.getByText('Dirección Nacional de Emprendimiento e I+D');
    expect(
      toggle.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('colapsa el sidebar y permite expandirlo de nuevo', async () => {
    const user = userEvent.setup();
    renderSidebar();

    expect(screen.getByText('Descubre proyectos')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ocultar filtros' }));

    expect(screen.queryByText('Descubre proyectos')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Dirección Nacional de Emprendimiento e I+D'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('complementary')).toHaveAttribute(
      'data-collapsed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Mostrar filtros' }));
    expect(screen.getByText('Descubre proyectos')).toBeInTheDocument();
    expect(
      screen.getByText('Dirección Nacional de Emprendimiento e I+D'),
    ).toBeInTheDocument();
  });

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

  it('oculta Fondo y Etiqueta cuando se piden hiddenFacets', () => {
    render(
      <VitrinaProjectsSidebar
        options={options}
        filters={EMPTY_VITRINA_FILTERS}
        query=""
        matchIds={null}
        aiFilterActive={false}
        hiddenFacets={['fondos', 'etiquetas']}
        searchPlaceholder="Nombre, sede, escuela..."
        onToggle={vi.fn()}
        onQueryChange={vi.fn()}
        onClear={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.queryByText('Fondo')).not.toBeInTheDocument();
    expect(screen.queryByText('Etiqueta')).not.toBeInTheDocument();
    expect(screen.getByText('Sede')).toBeInTheDocument();
    expect(screen.getByText('Escuela')).toBeInTheDocument();
    expect(screen.queryByText('Columnas')).not.toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Buscar en todos los campos del proyecto' }),
    ).toHaveAttribute('placeholder', 'Nombre, sede, escuela...');
  });

  it('bloquea el autofill del navegador en Buscar hasta que el usuario lo enfoca', async () => {
    const user = userEvent.setup();
    renderSidebar();
    const input = screen.getByRole('textbox', {
      name: 'Buscar en todos los campos del proyecto',
    });
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toHaveAttribute('name', 'vitrina-project-search');
    expect(input).toHaveAttribute('readonly');
    await user.click(input);
    expect(input).not.toHaveAttribute('readonly');
  });

  it('muestra el filtro Columnas solo cuando se pasan columnOptions', async () => {
    const user = userEvent.setup();
    const onToggleColumn = vi.fn();
    render(
      <VitrinaProjectsSidebar
        options={options}
        filters={EMPTY_VITRINA_FILTERS}
        query=""
        matchIds={null}
        aiFilterActive={false}
        hiddenFacets={['fondos', 'etiquetas']}
        columnOptions={[
          { id: 'proyecto', label: 'Nombre proyecto' },
          { id: 'sede', label: 'Sede' },
          { id: 'gantt', label: 'Gantt' },
        ]}
        visibleColumns={['proyecto', 'sede', 'gantt']}
        onToggleColumn={onToggleColumn}
        onToggle={vi.fn()}
        onQueryChange={vi.fn()}
        onClear={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText('Columnas')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /Todas las columnas/i }),
    );
    expect(screen.getByRole('dialog', { name: 'Columnas' })).toHaveTextContent(
      'Gantt',
    );
    await user.click(screen.getByText('Gantt'));
    expect(onToggleColumn).toHaveBeenCalledWith('gantt');
  });
});

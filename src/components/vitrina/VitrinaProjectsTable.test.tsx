import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitrinaProjectsTable } from '@/components/vitrina/VitrinaProjectsTable';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';
import {
  upsertVitrinaProyecto,
  type VitrinaProjectCatalogs,
} from '@/lib/actions/vitrina-proyectos';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/lib/actions/vitrina-proyectos', () => ({
  upsertVitrinaProyecto: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

const catalogs: VitrinaProjectCatalogs = {
  fondos: [{ id: 'f1', nombre: 'Impulsa' }],
  lineas: [{ id: 'l1', nombre: 'Innovación', fondoId: 'f1' }],
  sedes: [{ id: 's1', nombre: 'Rancagua' }],
  escuelas: [{ id: 'e1', nombre: 'Salud' }],
  socios: [{ id: 'so1', nombre: 'MUKUNA' }],
  comunas: [{ id: 'c1', nombre: 'Valparaíso' }],
  etiquetas: [{ id: 't1', nombre: 'Arte' }],
};

const LONG_DESC =
  'Descripción muy larga del proyecto que supera fácilmente los cien caracteres para verificar el truncado en la vista de datos de vitrina.';
const LONG_VIDEO =
  'https://vimeo.com/76979871?utm_source=vitrina&utm_medium=data_table&utm_campaign=truncation_preview_check_abcdefghijklmnop';

function projectFrom(overrides?: {
  nombre?: string;
  descripcion?: string;
  videoUrl?: string;
}) {
  const result = normalizeVitrinaProyectos([
    {
      nombre: overrides?.nombre ?? 'Festival del Futuro',
      descripcion: overrides?.descripcion ?? 'No debe verse en general',
      fondos: ['Impulsa'],
      sedes: ['Rancagua'],
      videoUrl: overrides?.videoUrl,
    },
  ]);
  if (!result.ok) throw new Error(result.error);
  return result.proyectos[0]!;
}

describe('VitrinaProjectsTable', () => {
  it('por defecto muestra Información General sin descripción ni vídeo', async () => {
    const user = userEvent.setup();
    render(
      <VitrinaProjectsTable
        proyectos={[projectFrom({ videoUrl: LONG_VIDEO })]}
        catalogs={catalogs}
        canEdit
      />,
    );

    expect(
      screen.getByRole('tab', { name: 'Información General' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Festival del Futuro')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Fondo' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Comunas' })).toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: 'Vídeo' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: 'Descripción' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('No debe verse en general')).not.toBeInTheDocument();
    expect(screen.queryByText(LONG_VIDEO.slice(0, 10))).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Editar Festival del Futuro' }),
    );
    expect(screen.getByRole('button', { name: 'Guardar fila' })).toBeInTheDocument();
  });

  it('en Desc. y Vídeo muestra descripción y vídeo truncados a 100 caracteres', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <VitrinaProjectsTable
        proyectos={[
          projectFrom({ descripcion: LONG_DESC, videoUrl: LONG_VIDEO }),
        ]}
        catalogs={catalogs}
        canEdit={false}
      />,
    );
    const view = within(container);

    await user.click(view.getByRole('tab', { name: 'Desc. y Vídeo' }));

    expect(view.getByText('Festival del Futuro')).toBeInTheDocument();
    expect(
      view.getByRole('columnheader', { name: 'Descripción' }),
    ).toBeInTheDocument();
    expect(view.getByRole('columnheader', { name: 'Vídeo' })).toBeInTheDocument();
    expect(
      view.queryByRole('columnheader', { name: 'Fondo' }),
    ).not.toBeInTheDocument();
    expect(
      view.queryByRole('columnheader', { name: 'Comunas' }),
    ).not.toBeInTheDocument();

    expect(view.getByText(LONG_DESC.slice(0, 100))).toBeInTheDocument();
    expect(view.queryByText(LONG_DESC)).not.toBeInTheDocument();
    expect(view.getByTitle(LONG_DESC)).toBeInTheDocument();

    expect(view.getByText(LONG_VIDEO.slice(0, 100))).toBeInTheDocument();
    expect(view.queryByText(LONG_VIDEO)).not.toBeInTheDocument();
    expect(view.getByTitle(LONG_VIDEO)).toBeInTheDocument();
  });

  it('muestra las comunas del proyecto en Información General', () => {
    const result = normalizeVitrinaProyectos([
      {
        nombre: 'Festival del Futuro',
        comunas: ['Valparaíso'],
      },
    ]);
    if (!result.ok) throw new Error(result.error);

    render(
      <VitrinaProjectsTable
        proyectos={result.proyectos}
        catalogs={catalogs}
        canEdit={false}
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'Comunas' })).toBeInTheDocument();
    expect(screen.getByText('Valparaíso')).toBeInTheDocument();
  });

  it('aplica anchos A/B en Información General', () => {
    const { container } = render(
      <VitrinaProjectsTable
        proyectos={[projectFrom()]}
        catalogs={catalogs}
        canEdit={false}
      />,
    );

    const thByLabel = (name: string) =>
      Array.from(container.querySelectorAll('th')).find(
        (th) => th.textContent === name,
      );

    expect(thByLabel('Fondo')).toHaveClass('w-[7.5rem]');
    expect(thByLabel('Nombre')).toHaveClass('w-[12rem]');
    expect(thByLabel('Escuelas')).toHaveClass('w-[12rem]');
    expect(thByLabel('Correo')).toHaveClass('w-[7.5rem]');
  });

  it('hace wrap del texto largo en chips de socios', () => {
    const longName =
      'Fundación Internacional de Desarrollo Sostenible y Cooperación';
    const catalogsWithLongSocio: VitrinaProjectCatalogs = {
      ...catalogs,
      socios: [{ id: 'so1', nombre: longName }],
    };
    const result = normalizeVitrinaProyectos([
      {
        nombre: 'Festival del Futuro',
        fondos: ['Impulsa'],
        socios: [longName],
      },
    ]);
    if (!result.ok) throw new Error(result.error);

    const { container } = render(
      <VitrinaProjectsTable
        proyectos={result.proyectos}
        catalogs={catalogsWithLongSocio}
        canEdit={false}
      />,
    );

    const chip = Array.from(container.querySelectorAll('span')).find((el) =>
      el.textContent?.includes('Fundación Internacional'),
    );
    expect(chip).toHaveClass('break-words');
    expect(chip).not.toHaveClass('truncate');
  });

  it('en Indicadores Técnicos muestra IGIP por defecto y TRL en su subtab', async () => {
    const user = userEvent.setup();
    const result = normalizeVitrinaProyectos([
      {
        nombre: 'Festival del Futuro',
        igipInicial: 1.2,
        trlInicial: 3,
        igipInicialOriginalidad: 2,
      },
    ]);
    if (!result.ok) throw new Error(result.error);

    const { container } = render(
      <VitrinaProjectsTable
        proyectos={result.proyectos}
        catalogs={catalogs}
        canEdit={false}
      />,
    );
    const view = within(container);

    await user.click(view.getByRole('tab', { name: 'Indicadores Técnicos' }));

    expect(view.getByText('Festival del Futuro')).toBeInTheDocument();
    expect(
      view.getByRole('tab', { name: 'IGIP' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      view.getByRole('columnheader', { name: 'IGIP Inicial' }),
    ).toBeInTheDocument();
    expect(
      view.getByRole('columnheader', { name: 'IGIP Inicial - Comentario' }),
    ).toBeInTheDocument();
    expect(
      view.queryByRole('columnheader', { name: 'TRL Final - Comentario' }),
    ).not.toBeInTheDocument();
    expect(view.getByText('1.2')).toBeInTheDocument();
    expect(
      view.queryByRole('columnheader', { name: 'Originalidad' }),
    ).not.toBeInTheDocument();

    await user.click(view.getByRole('button', { name: 'Expandir subdimensiones' }));
    expect(
      view.getAllByRole('columnheader', { name: 'Originalidad' }).length,
    ).toBe(3);
    expect(view.getByText('2')).toBeInTheDocument();

    await user.click(view.getByRole('button', { name: 'Inicial' }));
    expect(
      view.queryByRole('columnheader', { name: 'IGIP Inicial' }),
    ).not.toBeInTheDocument();

    await user.click(view.getByRole('tab', { name: 'TRL' }));
    expect(
      view.getByRole('columnheader', { name: 'TRL Final - Comentario' }),
    ).toBeInTheDocument();
    expect(
      view.queryByRole('columnheader', { name: 'IGIP Final' }),
    ).not.toBeInTheDocument();
    expect(view.getByText('3')).toBeInTheDocument();
    expect(
      view.queryByRole('columnheader', { name: 'Fondo' }),
    ).not.toBeInTheDocument();
  });

  it('cuando no hay filas muestra el mensaje de filtros si se entrega', () => {
    render(
      <VitrinaProjectsTable
        proyectos={[]}
        catalogs={catalogs}
        canEdit={false}
        emptyHint="No hay proyectos que coincidan con los filtros."
      />,
    );

    expect(
      screen.getByText('No hay proyectos que coincidan con los filtros.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('No hay proyectos en vitrina.'),
    ).not.toBeInTheDocument();
  });

  it('al guardar sale del modo edición sin esperar al servidor', async () => {
    const user = userEvent.setup();
    let resolveUpsert!: (value: { success: boolean }) => void;
    const pending = new Promise<{ success: boolean }>((resolve) => {
      resolveUpsert = resolve;
    });
    vi.mocked(upsertVitrinaProyecto).mockReturnValueOnce(pending);

    const onProyectoUpsert = vi.fn();
    const proyecto = projectFrom({ nombre: 'Festival del Futuro' });

    render(
      <VitrinaProjectsTable
        proyectos={[proyecto]}
        catalogs={catalogs}
        canEdit
        onProyectoUpsert={onProyectoUpsert}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Editar Festival del Futuro' }),
    );
    const nombreInput = screen.getByDisplayValue('Festival del Futuro');
    await user.clear(nombreInput);
    await user.type(nombreInput, 'Festival Actualizado');
    await user.click(screen.getByRole('button', { name: 'Guardar fila' }));

    expect(
      screen.queryByRole('button', { name: 'Guardar fila' }),
    ).not.toBeInTheDocument();
    expect(onProyectoUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: proyecto.id,
        nombre: 'Festival Actualizado',
      }),
    );
    expect(upsertVitrinaProyecto).toHaveBeenCalledTimes(1);

    resolveUpsert({ success: true });
    await pending;
  });

  it('si el servidor falla revierte el upsert optimista', async () => {
    const user = userEvent.setup();
    vi.mocked(upsertVitrinaProyecto).mockResolvedValueOnce({
      success: false,
      error: 'Fallo de prueba',
    });

    const onProyectoUpsert = vi.fn();
    const proyecto = projectFrom({ nombre: 'Festival del Futuro' });

    render(
      <VitrinaProjectsTable
        proyectos={[proyecto]}
        catalogs={catalogs}
        canEdit
        onProyectoUpsert={onProyectoUpsert}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Editar Festival del Futuro' }),
    );
    const nombreInput = screen.getByDisplayValue('Festival del Futuro');
    await user.clear(nombreInput);
    await user.type(nombreInput, 'Nombre Roto');
    await user.click(screen.getByRole('button', { name: 'Guardar fila' }));

    await screen.findByText('Fallo de prueba');
    expect(onProyectoUpsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ nombre: 'Nombre Roto' }),
    );
    expect(onProyectoUpsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: proyecto.id,
        nombre: 'Festival del Futuro',
      }),
    );
  });
});

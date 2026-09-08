import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitrinaVinculamosView } from '@/components/vitrina/VitrinaVinculamosView';
import { getMideimpactoIniciativas } from '@/lib/actions/mideimpacto-iniciativas';
import {
  emptyMideimpactoIniciativa,
  type MideimpactoIniciativa,
} from '@/lib/mideimpacto-iniciativas';

vi.mock('@/lib/actions/mideimpacto-iniciativas', () => ({
  getMideimpactoIniciativas: vi.fn(),
}));

const fetchMock = vi.mocked(getMideimpactoIniciativas);

afterEach(() => {
  cleanup();
  fetchMock.mockReset();
});

function row(
  patch: Partial<MideimpactoIniciativa> & Pick<MideimpactoIniciativa, 'id' | 'nombre'>,
): MideimpactoIniciativa {
  return {
    ...emptyMideimpactoIniciativa(),
    estado: 'Activa',
    fechaInicio: '2024-01-01',
    mecanismo: 'Extensión',
    ...patch,
  };
}

function pageOf(rows: MideimpactoIniciativa[], page = 1, lastPage = 1, total = rows.length) {
  return { rows, page, lastPage, total };
}

describe('VitrinaVinculamosView', () => {
  it('muestra sidebar de filtros y las columnas fijas del listado', () => {
    render(
      <VitrinaVinculamosView
        onBack={vi.fn()}
        initial={{
          success: true,
          data: pageOf([
            row({
              id: '12',
              nombre: 'Huertos urbanos',
              sede: 'Casa Central',
              territorios: [
                {
                  region: 'Valparaíso',
                  provincia: '',
                  comuna: 'Viña',
                },
              ],
            }),
          ]),
        }}
      />,
    );
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Columnas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ID' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Estado' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fecha' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mecanismo' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna ID' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Nombre proyecto' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Estado' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Fecha inicio' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Fecha término' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Mecanismo' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Brecha' })).toBeInTheDocument();
    expect(screen.queryByRole('separator', { name: 'Redimensionar columna Adjuntos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('separator', { name: 'Redimensionar columna Visible' })).not.toBeInTheDocument();
    expect(screen.queryByRole('separator', { name: 'Redimensionar columna Año' })).not.toBeInTheDocument();
    expect(screen.queryByRole('separator', { name: 'Redimensionar columna Responsables' })).not.toBeInTheDocument();
    expect(screen.queryByRole('separator', { name: 'Redimensionar columna Descripción' })).not.toBeInTheDocument();
    expect(screen.queryByRole('separator', { name: 'Redimensionar columna Objetivo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('separator', { name: 'Redimensionar columna Estado código' })).not.toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Sede' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Región' })).toBeInTheDocument();
    expect(
      screen.queryByRole('separator', { name: 'Redimensionar columna Territorios' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('separator', {
        name: 'Redimensionar columna Participantes (indicadores)',
      }),
    ).not.toBeInTheDocument();
    const nombreHead = screen.getByRole('columnheader', { name: /Nombre proyecto/i });
    expect(nombreHead.className).toMatch(/sticky/);
    expect(screen.getByText('Huertos urbanos')).toBeInTheDocument();
    expect(screen.getByText('Casa Central')).toBeInTheDocument();
    expect(screen.getByText('Valparaíso')).toBeInTheDocument();
  });

  it('muestra sede/escuela como columnas del header, sin repetir títulos en la celda', () => {
    render(
      <VitrinaVinculamosView
        onBack={vi.fn()}
        initial={{
          success: true,
          data: pageOf([
            row({
              id: '12',
              nombre: 'Huertos urbanos',
              escuelasCarreras: [
                {
                  sedeNombre: 'Aiep Online',
                  escuNombre: 'Desarrollo Social y Educación',
                  painEstudiantes: '71',
                  painEstudiantesFinal: '0',
                  painDocentes: '1',
                  painDocentesFinal: '0',
                },
              ],
            }),
          ]),
        }}
      />,
    );
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Sede*' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Escuela' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Estudiantes' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Estudiantes final' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Docentes' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Docentes final' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Sede' })).toBeInTheDocument();
    expect(
      screen.queryByRole('table', { name: 'Sede, escuela y carrera' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Aiep Online')).toBeInTheDocument();
    expect(screen.getByText('71')).toBeInTheDocument();
    expect(screen.queryByText(/pain_total/)).not.toBeInTheDocument();
  });

  it('abre territorios, participantes externos y preguntas en columnas del header', () => {
    render(
      <VitrinaVinculamosView
        onBack={vi.fn()}
        initial={{
          success: true,
          data: pageOf([
            row({
              id: '12',
              nombre: 'Huertos urbanos',
              territorios: [
                {
                  region: 'Valparaíso',
                  provincia: 'Valparaíso',
                  comuna: 'Viña del Mar',
                },
                {
                  region: 'Metropolitana',
                  provincia: 'Santiago',
                  comuna: 'Providencia',
                },
              ],
              participantesExternos: [
                {
                  socioComunitario: 'Junta de Vecinos',
                  grupo: 'Adultos',
                  subgrupo: 'Mayores',
                  beneficiarios: '12',
                  beneficiariosFinal: '0',
                },
              ],
              gruposInteres: [
                'Personas mayores',
                'Personas de pueblos originarios',
              ],
              tematicas: ['Sostenibilidad', 'Medioambiente'],
            }),
          ]),
        }}
      />,
    );
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Región' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Provincia' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Comuna' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Socio Comunitario' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Grupo' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Subgrupo' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Beneficiarios' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Beneficiarios Final' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Grupos de Interés' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Redimensionar columna Temáticas' })).toBeInTheDocument();
    expect(
      screen.queryByRole('separator', { name: 'Redimensionar columna Pregunta' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('separator', { name: 'Redimensionar columna Respuesta' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Valparaíso\s+Metropolitana/)).toBeInTheDocument();
    expect(screen.getByText(/Viña del Mar\s+Providencia/)).toBeInTheDocument();
    expect(screen.getByText('Junta de Vecinos')).toBeInTheDocument();
    expect(screen.getByText('Mayores')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Grupos de Interés' })).toBeInTheDocument();
    expect(screen.getByText('Personas mayores')).toBeInTheDocument();
    expect(screen.getByText('Personas de pueblos originarios')).toBeInTheDocument();
    expect(screen.getByText('Sostenibilidad')).toBeInTheDocument();
    expect(screen.getByText('Medioambiente')).toBeInTheDocument();
    expect(screen.queryByText(/Personas mayores \|/)).not.toBeInTheDocument();
  });

  it('no muestra adjuntos', () => {
    render(
      <VitrinaVinculamosView
        onBack={vi.fn()}
        initial={{
          success: true,
          data: pageOf([
            row({
              id: '12',
              nombre: 'Huertos urbanos',
            }),
          ]),
        }}
      />,
    );
    expect(screen.queryByRole('link', { name: 'Informe.pdf' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('separator', { name: 'Redimensionar columna Adjuntos' }),
    ).not.toBeInTheDocument();
  });

  it('permite redimensionar columnas arrastrando el separador del header', () => {
    render(
      <VitrinaVinculamosView
        onBack={vi.fn()}
        initial={{
          success: true,
          data: pageOf([row({ id: '12', nombre: 'Huertos urbanos' })]),
        }}
      />,
    );
    const handle = screen.getByRole('separator', {
      name: 'Redimensionar columna Nombre proyecto',
    });
    const head = screen.getByRole('columnheader', {
      name: /Nombre proyecto/i,
    });
    expect(head).toHaveStyle({ width: '260px' });

    fireEvent.mouseDown(handle, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 140 });
    fireEvent.mouseUp(document, { clientX: 140 });

    expect(head).toHaveStyle({ width: '300px' });
    expect(screen.getByText('Huertos urbanos')).toHaveStyle({ width: '300px' });
  });

  it('filtra filas por estado desde el sidebar', async () => {
    const rows = [
      row({ id: '1', nombre: 'Alfa', estado: 'Activa' }),
      row({ id: '2', nombre: 'Beta', estado: 'Cerrada' }),
    ];
    const user = userEvent.setup();
    render(
      <VitrinaVinculamosView
        onBack={vi.fn()}
        initial={{
          success: true,
          data: pageOf(rows),
        }}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Todos los estados/i }));
    await user.click(within(screen.getByRole('dialog')).getByText('Cerrada'));
    expect(screen.queryByText('Alfa')).not.toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('filtra por texto libre de nombre al pulsar Enter', async () => {
    const user = userEvent.setup();
    render(
      <VitrinaVinculamosView
        onBack={vi.fn()}
        initial={{
          success: true,
          data: pageOf([
            row({ id: '1', nombre: 'Huertos urbanos' }),
            row({ id: '2', nombre: 'Taller de robótica' }),
          ]),
        }}
      />,
    );
    const nombre = screen.getByRole('textbox', { name: 'Nombre' });
    await user.type(nombre, 'huerto{Enter}');
    expect(screen.getByText('Huertos urbanos')).toBeInTheDocument();
    expect(screen.queryByText('Taller de robótica')).not.toBeInTheDocument();
  });

  it('oculta una columna desde el filtro Columnas', async () => {
    const user = userEvent.setup();
    render(
      <VitrinaVinculamosView
        onBack={vi.fn()}
        initial={{
          success: true,
          data: pageOf([row({ id: '12', nombre: 'Huertos urbanos' })]),
        }}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Todas las columnas/i }));
    await user.click(within(screen.getByRole('dialog')).getByText('Brecha'));
    expect(
      screen.queryByRole('separator', { name: 'Redimensionar columna Brecha' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('separator', { name: 'Redimensionar columna Nombre proyecto' }),
    ).toBeInTheDocument();
  });

  it('filtra por Sede* y Socio Comunitario', async () => {
    const user = userEvent.setup();
    render(
      <VitrinaVinculamosView
        onBack={vi.fn()}
        initial={{
          success: true,
          data: pageOf([
            row({
              id: '1',
              nombre: 'Alfa',
              escuelasCarreras: [
                {
                  sedeNombre: 'Aiep Online',
                  escuNombre: 'Salud',
                  painEstudiantes: '',
                  painEstudiantesFinal: '',
                  painDocentes: '',
                  painDocentesFinal: '',
                },
              ],
              participantesExternos: [
                {
                  socioComunitario: 'Junta de Vecinos',
                  grupo: '',
                  subgrupo: '',
                  beneficiarios: '',
                  beneficiariosFinal: '',
                },
              ],
            }),
            row({
              id: '2',
              nombre: 'Beta',
              escuelasCarreras: [
                {
                  sedeNombre: 'Casa Central',
                  escuNombre: 'Educación',
                  painEstudiantes: '',
                  painEstudiantesFinal: '',
                  painDocentes: '',
                  painDocentesFinal: '',
                },
              ],
              participantesExternos: [
                {
                  socioComunitario: 'Municipalidad',
                  grupo: '',
                  subgrupo: '',
                  beneficiarios: '',
                  beneficiariosFinal: '',
                },
              ],
            }),
          ]),
        }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Sede*' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Socio Comunitario' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Todas las sedes/i }));
    await user.click(within(screen.getByRole('dialog')).getByText('Aiep Online'));
    expect(screen.getByText('Alfa')).toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
  });

  it('muestra error', () => {
    render(
      <VitrinaVinculamosView
        onBack={vi.fn()}
        initial={{ success: false, error: 'Token inválido o ausente' }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Token inválido o ausente',
    );
  });

  it('muestra vacío', () => {
    render(
      <VitrinaVinculamosView
        onBack={vi.fn()}
        initial={{
          success: true,
          data: pageOf([]),
        }}
      />,
    );
    expect(
      screen.getByText('No hay iniciativas para mostrar.'),
    ).toBeInTheDocument();
  });

  it('concatena las páginas siguientes sin paginador', async () => {
    fetchMock.mockResolvedValue({
      success: true,
      data: pageOf([row({ id: '99', nombre: 'Página dos' })], 2, 2, 2),
    });
    render(
      <VitrinaVinculamosView
        onBack={vi.fn()}
        initial={{
          success: true,
          data: pageOf([row({ id: '12', nombre: 'Huertos urbanos' })], 1, 2, 2),
        }}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Siguiente' })).not.toBeInTheDocument();
    expect(screen.getByText(/1 \/ 2 iniciativas/)).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith({ page: 2 }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Página dos')).toBeInTheDocument();
    expect(screen.getByText('Huertos urbanos')).toBeInTheDocument();
    expect(screen.getByText(/2 \/ 2 iniciativas/)).toBeInTheDocument();
  });
});

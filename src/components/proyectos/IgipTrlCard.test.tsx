import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IgipTrlCard } from '@/components/proyectos/IgipTrlCard';
import {
  getIgipTrlProyecto,
  upsertIgipTrlProyecto,
} from '@/lib/actions/igip-trl';
import { emptyIgipTrlData, trlRowAppearance } from '@/lib/igip-trl';

vi.mock('@/hooks/usePageTopLoader', () => ({
  usePageTopLoader: () => undefined,
}));

vi.mock('@/lib/actions/igip-trl', () => ({
  getIgipTrlProyecto: vi.fn(),
  upsertIgipTrlProyecto: vi.fn(),
}));

function TrlPreview({ selectedTrl }: { selectedTrl: number | null }) {
  return (
    <div>
      {[1, 2, 3, 4, 5, 6, 7].map((level) => (
        <div
          key={level}
          data-testid={`trl-row-${level}`}
          data-appearance={trlRowAppearance(level, selectedTrl)}
        />
      ))}
    </div>
  );
}

describe('TRL stack highlight', () => {
  afterEach(() => {
    cleanup();
  });

  it('marks only TRL 4 as selected', () => {
    const { getByTestId } = render(<TrlPreview selectedTrl={4} />);
    expect(getByTestId('trl-row-4').getAttribute('data-appearance')).toBe(
      'selected'
    );
    expect(getByTestId('trl-row-1').getAttribute('data-appearance')).toBe(
      'muted'
    );
    expect(getByTestId('trl-row-7').getAttribute('data-appearance')).toBe(
      'muted'
    );
  });

  it('mutes every row when none is assigned', () => {
    const { getByTestId } = render(<TrlPreview selectedTrl={null} />);
    for (const level of [1, 2, 3, 4, 5, 6, 7]) {
      expect(
        getByTestId(`trl-row-${level}`).getAttribute('data-appearance')
      ).toBe('muted');
    }
  });
});

describe('IgipTrlCard optimistic persist', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('highlights TRL before the server action resolves', async () => {
    const user = userEvent.setup();
    vi.mocked(getIgipTrlProyecto).mockResolvedValue({
      success: true,
      data: emptyIgipTrlData(),
    });
    let resolveUpsert!: (value: {
      success: true;
      data: ReturnType<typeof emptyIgipTrlData>;
    }) => void;
    vi.mocked(upsertIgipTrlProyecto).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpsert = resolve;
        })
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <IgipTrlCard projectId="proj-1" topLoaderEnabled={false} />
      </QueryClientProvider>
    );

    const row = await screen.findByTestId('trl-row-4');
    await user.click(row);
    expect(row.getAttribute('data-appearance')).toBe('selected');
    expect(upsertIgipTrlProyecto).toHaveBeenCalledOnce();

    const next = { ...emptyIgipTrlData(), trl: 4 };
    resolveUpsert({ success: true, data: next });
  });

  it('shows a chevron only beside the selected TRL rectangle', async () => {
    vi.mocked(getIgipTrlProyecto).mockResolvedValue({
      success: true,
      data: { ...emptyIgipTrlData(), trl: 4 },
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <IgipTrlCard projectId="proj-chevron" topLoaderEnabled={false} />
      </QueryClientProvider>
    );

    const selected = await screen.findByTestId('trl-row-4');
    expect(
      selected.querySelector('[data-testid="trl-selected-chevron"]')
    ).not.toBeNull();
    expect(
      screen.getByTestId('trl-row-1').querySelector(
        '[data-testid="trl-selected-chevron"]'
      )
    ).toBeNull();
  });

  it('shows índice IGIP immediately while save is pending', async () => {
    const user = userEvent.setup();
    vi.mocked(getIgipTrlProyecto).mockResolvedValue({
      success: true,
      data: emptyIgipTrlData(),
    });
    vi.mocked(upsertIgipTrlProyecto).mockImplementation(
      () => new Promise(() => undefined)
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <IgipTrlCard projectId="proj-2" topLoaderEnabled={false} />
      </QueryClientProvider>
    );

    const pencil = await screen.findByRole('button', {
      name: 'Editar Índice IGIP',
    });
    await user.click(pencil);
    const input = screen.getByRole('textbox', { name: 'Índice IGIP' });
    await user.clear(input);
    await user.type(input, '3.2');
    await user.tab();
    expect(screen.getByText('3.2')).toBeInTheDocument();
  });
});

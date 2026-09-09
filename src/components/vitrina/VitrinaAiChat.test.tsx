import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VitrinaAiChat } from '@/components/vitrina/VitrinaAiChat';
import { chatVitrinaAgent } from '@/lib/actions/vitrina-ai';
import { EMPTY_VITRINA_FILTERS } from '@/lib/vitrina-project-filters';
import { VITRINA_AI_CHAT_POS_KEY } from '@/lib/vitrina-ai-chat-position';

vi.mock('@/lib/actions/vitrina-ai', () => ({
  chatVitrinaAgent: vi.fn(),
}));
vi.mock('@/components/vitrina/vitrina-ai-chat.css', () => ({}));

beforeAll(() => {
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = () => undefined;
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = () => undefined;
  }
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

afterEach(() => {
  cleanup();
  localStorage.removeItem(VITRINA_AI_CHAT_POS_KEY);
  vi.mocked(chatVitrinaAgent).mockReset();
});

function renderChat(
  props?: Partial<ComponentProps<typeof VitrinaAiChat>>,
) {
  return render(
    <div
      data-testid="chat-parent"
      style={{ position: 'relative', width: 800, height: 600 }}
    >
      <VitrinaAiChat
        configured={false}
        filters={EMPTY_VITRINA_FILTERS}
        matchIds={null}
        onResult={() => undefined}
        {...props}
      />
    </div>,
  );
}

function stubLayout(button: HTMLElement) {
  const root = button.parentElement as HTMLElement;
  const parent = screen.getByTestId('chat-parent');
  Object.defineProperty(parent, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(parent, 'clientHeight', { value: 600, configurable: true });
  vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 600,
    right: 800,
    width: 800,
    height: 600,
    toJSON() {
      return this;
    },
  } as DOMRect);
  Object.defineProperty(root, 'offsetParent', { value: parent, configurable: true });
  Object.defineProperty(root, 'offsetWidth', { value: 220, configurable: true });
  Object.defineProperty(root, 'offsetHeight', { value: 44, configurable: true });
  vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
    x: 532,
    y: 536,
    top: 536,
    left: 532,
    bottom: 580,
    right: 752,
    width: 220,
    height: 44,
    toJSON() {
      return this;
    },
  } as DOMRect);
  return root;
}

describe('VitrinaAiChat drag', () => {
  it('abre el panel con un clic sin arrastre', () => {
    renderChat();
    fireEvent.click(
      screen.getByRole('button', { name: /qué estás buscando/i }),
    );
    expect(screen.getByRole('form', { name: 'Chat con IA' })).toBeInTheDocument();
  });

  it('mueve la pastilla al arrastrar y no abre el chat', () => {
    renderChat();
    const button = screen.getByRole('button', { name: /qué estás buscando/i });
    const root = stubLayout(button);

    fireEvent.pointerDown(button, {
      button: 0,
      pointerId: 1,
      clientX: 640,
      clientY: 558,
    });
    fireEvent.pointerMove(button, {
      pointerId: 1,
      clientX: 500,
      clientY: 400,
    });
    fireEvent.pointerUp(button, { pointerId: 1, clientX: 500, clientY: 400 });
    fireEvent.click(button);

    expect(screen.queryByRole('form', { name: 'Chat con IA' })).not.toBeInTheDocument();
    expect(root.style.left).toBe('392px');
    expect(root.style.top).toBe('378px');
    expect(localStorage.getItem(VITRINA_AI_CHAT_POS_KEY)).toContain('392');
  });
});

describe('VitrinaAiChat tools', () => {
  it('pide tools de UI apagadas y no aplica filtros en Mapa', async () => {
    const onResult = vi.fn();
    vi.mocked(chatVitrinaAgent).mockResolvedValue({
      success: true,
      reply: 'Hay un proyecto de huerta.',
      filters: { ...EMPTY_VITRINA_FILTERS, sedes: ['Valparaíso'] },
      matchIds: ['p-huerta'],
    });

    renderChat({ configured: true, enableTools: false, onResult });
    fireEvent.click(
      screen.getByRole('button', { name: /qué estás buscando/i }),
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'muéstrame huertas' },
    });
    fireEvent.submit(screen.getByRole('form', { name: 'Chat con IA' }));

    await waitFor(() => {
      expect(chatVitrinaAgent).toHaveBeenCalled();
    });
    expect(vi.mocked(chatVitrinaAgent).mock.calls[0]?.[0]).toMatchObject({
      enableUiTools: false,
    });
    await waitFor(() => {
      expect(screen.getByText('Hay un proyecto de huerta.')).toBeInTheDocument();
    });
    expect(onResult).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from 'vitest';
import {
  clampVitrinaAiChatPos,
  parseVitrinaAiChatPos,
  serializeVitrinaAiChatPos,
  vitrinaAiChatDragExceeded,
} from '@/lib/vitrina-ai-chat-position';

describe('parseVitrinaAiChatPos', () => {
  it('lee left/top finitos', () => {
    expect(parseVitrinaAiChatPos('{"left":120.5,"top":40}')).toEqual({
      left: 120.5,
      top: 40,
    });
  });

  it('rechaza JSON inválido o incompleto', () => {
    expect(parseVitrinaAiChatPos(null)).toBeNull();
    expect(parseVitrinaAiChatPos('{')).toBeNull();
    expect(parseVitrinaAiChatPos('{"left":"1","top":2}')).toBeNull();
    expect(parseVitrinaAiChatPos('{"left":1}')).toBeNull();
  });
});

describe('serializeVitrinaAiChatPos', () => {
  it('redondea el ciclo parse/serialize', () => {
    const pos = { left: 10, top: 20 };
    expect(parseVitrinaAiChatPos(serializeVitrinaAiChatPos(pos))).toEqual(pos);
  });
});

describe('clampVitrinaAiChatPos', () => {
  const widget = { width: 200, height: 80 };
  const parent = { width: 800, height: 600 };

  it('deja pasar una posición interior', () => {
    expect(
      clampVitrinaAiChatPos({ left: 100, top: 50 }, widget, parent),
    ).toEqual({ left: 100, top: 50 });
  });

  it('no deja salir del contenedor', () => {
    expect(
      clampVitrinaAiChatPos({ left: -40, top: 900 }, widget, parent),
    ).toEqual({ left: 8, top: 512 });
  });

  it('si el widget es más grande que el padre, se queda en el margen', () => {
    expect(
      clampVitrinaAiChatPos(
        { left: 40, top: 40 },
        { width: 900, height: 700 },
        { width: 400, height: 300 },
      ),
    ).toEqual({ left: 8, top: 8 });
  });
});

describe('vitrinaAiChatDragExceeded', () => {
  it('distingue clic de arrastre', () => {
    expect(vitrinaAiChatDragExceeded(2, 2)).toBe(false);
    expect(vitrinaAiChatDragExceeded(6, 0)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { parseVitrinaAiInlineMarkdown } from '@/lib/vitrina-ai-chat-format';

describe('parseVitrinaAiInlineMarkdown', () => {
  it('convierte **texto** en segmentos en negrita', () => {
    expect(
      parseVitrinaAiInlineMarkdown(
        'Sí: **Hidrógeno verde** y **CONenergía**.',
      ),
    ).toEqual([
      { type: 'text', value: 'Sí: ' },
      { type: 'bold', value: 'Hidrógeno verde' },
      { type: 'text', value: ' y ' },
      { type: 'bold', value: 'CONenergía' },
      { type: 'text', value: '.' },
    ]);
  });

  it('deja el texto plano si no hay marcas', () => {
    expect(parseVitrinaAiInlineMarkdown('Hay 4 proyectos.')).toEqual([
      { type: 'text', value: 'Hay 4 proyectos.' },
    ]);
  });

  it('no interpreta un ** sin cierre', () => {
    expect(parseVitrinaAiInlineMarkdown('Ver **incompleto')).toEqual([
      { type: 'text', value: 'Ver **incompleto' },
    ]);
  });
});

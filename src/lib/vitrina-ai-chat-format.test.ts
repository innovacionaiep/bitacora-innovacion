import { describe, expect, it } from 'vitest';
import {
  flattenVitrinaAiMarkdownTables,
  parseVitrinaAiInlineMarkdown,
} from '@/lib/vitrina-ai-chat-format';

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

describe('flattenVitrinaAiMarkdownTables', () => {
  it('convierte una tabla Markdown en viñetas compactas', () => {
    const table = [
      '| Proyecto | Qué hace | Fuente |',
      '| --- | --- | --- |',
      '| AInclusion | IA para estudiantes neurodivergentes | https://ejemplo.eu |',
      '| Acompañamiento docente | Estudio de formación inclusiva | https://ejemplo.cl |',
    ].join('\n');
    const flat = flattenVitrinaAiMarkdownTables(
      `Proyectos similares:\n${table}`,
    );
    expect(flat).not.toMatch(/\|/);
    expect(flat).toContain('- **AInclusion**:');
    expect(flat).toContain('https://ejemplo.eu');
    expect(flat).toContain('- **Acompañamiento docente**:');
  });
});

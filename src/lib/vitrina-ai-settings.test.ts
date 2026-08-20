import { describe, expect, it } from 'vitest';
import {
  isVitrinaAiConfigured,
  maskOpenRouterKey,
  normalizeVitrinaAiModel,
  parseStoredVitrinaAi,
  serializeVitrinaAiStored,
  VITRINA_AI_DEFAULT_MODEL,
} from '@/lib/vitrina-ai-settings';
import { nextRateLimitWindow } from '@/lib/vitrina-ai-rate-limit';

describe('normalizeVitrinaAiModel', () => {
  it('recorta y acepta slugs de OpenRouter', () => {
    expect(normalizeVitrinaAiModel('  openai/gpt-4o-mini  ')).toBe(
      'openai/gpt-4o-mini',
    );
  });

  it('usa el default si viene vacío o con caracteres inválidos', () => {
    expect(normalizeVitrinaAiModel('')).toBe(VITRINA_AI_DEFAULT_MODEL);
    expect(normalizeVitrinaAiModel('rm -rf /')).toBe(VITRINA_AI_DEFAULT_MODEL);
    expect(normalizeVitrinaAiModel(null)).toBe(VITRINA_AI_DEFAULT_MODEL);
  });
});

describe('maskOpenRouterKey', () => {
  it('oculta la key y deja los últimos 4', () => {
    expect(maskOpenRouterKey('sk-or-v1-abcdefghijklmnop')).toBe('••••mnop');
  });

  it('no persiste una key vacía como máscara', () => {
    expect(maskOpenRouterKey('   ')).toBe('');
  });
});

describe('parseStoredVitrinaAi', () => {
  it('lee enc y modelo', () => {
    const raw = serializeVitrinaAiStored({
      enc: 'abc',
      model: 'google/gemini-2.5-flash',
    });
    expect(parseStoredVitrinaAi(raw)).toEqual({
      enc: 'abc',
      model: 'google/gemini-2.5-flash',
    });
  });

  it('no está configurado sin enc', () => {
    expect(isVitrinaAiConfigured(parseStoredVitrinaAi('{"enc":"","model":"x"}'))).toBe(
      false,
    );
    expect(
      isVitrinaAiConfigured(
        parseStoredVitrinaAi(serializeVitrinaAiStored({ enc: 'iv', model: 'm' })),
      ),
    ).toBe(true);
  });
});

describe('nextRateLimitWindow', () => {
  it('bloquea al superar el máximo en la ventana', () => {
    const first = nextRateLimitWindow([], 1000, 2, 60_000);
    expect(first.allowed).toBe(true);
    const second = nextRateLimitWindow(first.timestamps, 1100, 2, 60_000);
    expect(second.allowed).toBe(true);
    const third = nextRateLimitWindow(second.timestamps, 1200, 2, 60_000);
    expect(third.allowed).toBe(false);
  });
});

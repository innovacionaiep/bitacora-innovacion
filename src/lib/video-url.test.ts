import { describe, expect, it } from 'vitest';
import {
  isVerticalFromVimeoOEmbed,
  parseVideoUrl,
} from '@/lib/video-url';

describe('isVerticalFromVimeoOEmbed', () => {
  it('detecta vertical por width/height del player (TEX3D)', () => {
    expect(
      isVerticalFromVimeoOEmbed({ width: 240, height: 426 })
    ).toBe(true);
  });

  it('detecta vertical solo por thumbnail si el player viene landscape', () => {
    expect(
      isVerticalFromVimeoOEmbed({
        width: 640,
        height: 360,
        thumbnail_width: 200,
        thumbnail_height: 356,
      })
    ).toBe(true);
  });

  it('retorna false para landscape', () => {
    expect(
      isVerticalFromVimeoOEmbed({ width: 640, height: 360 })
    ).toBe(false);
  });

  it('retorna false sin dimensiones', () => {
    expect(isVerticalFromVimeoOEmbed({})).toBe(false);
  });
});

describe('parseVideoUrl Vimeo', () => {
  it('extrae pageUrl canónica para oEmbed', () => {
    const p = parseVideoUrl(
      'https://vimeo.com/1205319943?share=copy&tl=sv&te=ci'
    );
    expect(p?.provider).toBe('vimeo');
    expect(p?.pageUrl).toBe('https://vimeo.com/1205319943');
    expect(p?.videoId).toBe('1205319943');
  });
});

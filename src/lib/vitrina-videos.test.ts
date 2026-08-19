import { describe, expect, it } from 'vitest';
import {
  normalizeVitrinaVideos,
  parseStoredVitrinaVideos,
  VITRINA_VIDEOS_MAX,
} from '@/lib/vitrina-videos';

describe('normalizeVitrinaVideos', () => {
  it('acepta URLs de YouTube y Vimeo', () => {
    const result = normalizeVitrinaVideos([
      'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
      'https://vimeo.com/76979871',
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.videos).toHaveLength(2);
    expect(result.videos[0]?.tag).toBe('YouTube');
    expect(result.videos[1]?.tag).toBe('Vimeo');
  });

  it('omite entradas vacías', () => {
    const result = normalizeVitrinaVideos(['', '  ', 'https://youtu.be/aqz-KE-bpKQ']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.videos).toHaveLength(1);
  });

  it('rechaza URLs que no son YouTube ni Vimeo', () => {
    const result = normalizeVitrinaVideos(['https://example.com/video']);
    expect(result.ok).toBe(false);
  });

  it('rechaza lista vacía', () => {
    const result = normalizeVitrinaVideos([]);
    expect(result.ok).toBe(false);
  });

  it('rechaza más del máximo', () => {
    const urls = Array.from(
      { length: VITRINA_VIDEOS_MAX + 1 },
      () => 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    );
    expect(normalizeVitrinaVideos(urls).ok).toBe(false);
  });
});

describe('parseStoredVitrinaVideos', () => {
  it('lee JSON de objetos con url', () => {
    const videos = parseStoredVitrinaVideos(
      JSON.stringify([{ url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', title: 'Demo' }]),
    );
    expect(videos).toEqual([
      {
        title: 'Demo',
        url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
        tag: 'YouTube',
      },
    ]);
  });

  it('retorna null si el JSON es inválido', () => {
    expect(parseStoredVitrinaVideos('no-json')).toBeNull();
    expect(parseStoredVitrinaVideos(null)).toBeNull();
  });
});

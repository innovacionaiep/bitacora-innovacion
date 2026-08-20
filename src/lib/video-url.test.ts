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

describe('parseVideoUrl SharePoint', () => {
  const streamUrl =
    'https://ipaiep-my.sharepoint.com/personal/jeremy_torres_aiep_cl/_layouts/15/stream.aspx?id=%2Fpersonal%2Fjeremy%5Ftorres%5Faiep%5Fcl%2FDocuments%2FDocumentos%2FClinicApp%2EMP4&nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJPbmVEcml2ZUZvckJ1c2luZXNzIn19&ga=1&referrer=StreamWebApp.Web&isDarkMode=true';

  it('convierte stream.aspx a embed.aspx y permite iframe', () => {
    const p = parseVideoUrl(streamUrl);
    expect(p?.provider).toBe('sharepoint');
    expect(p?.externalOnly).toBeFalsy();
    expect(p?.embedUrl).toContain('/_layouts/15/embed.aspx');
    expect(p?.embedUrl).not.toContain('stream.aspx');
    expect(p?.embedUrl).not.toContain('nav=');
    expect(decodeURIComponent(p?.embedUrl ?? '')).toContain('ClinicApp.MP4');
    expect(p?.title).toBe('ClinicApp.MP4');
    expect(p?.pageUrl).toContain('stream.aspx');
  });

  it('conserva UniqueId en embed.aspx', () => {
    const p = parseVideoUrl(
      'https://contoso.sharepoint.com/sites/innova/_layouts/15/embed.aspx?UniqueId=9425cf13-ba08-4f36-ae07-3c9869b9b0e6',
    );
    expect(p?.provider).toBe('sharepoint');
    expect(p?.externalOnly).toBeFalsy();
    expect(p?.embedUrl).toContain('UniqueId=9425cf13-ba08-4f36-ae07-3c9869b9b0e6');
    expect(p?.embedUrl).toContain('/embed.aspx');
  });

  it('deja 1drv.ms como enlace externo', () => {
    const p = parseVideoUrl('https://1drv.ms/v/s!abc123');
    expect(p?.provider).toBe('sharepoint');
    expect(p?.externalOnly).toBe(true);
  });
});

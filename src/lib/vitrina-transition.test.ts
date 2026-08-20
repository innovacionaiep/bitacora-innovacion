import { describe, expect, it } from 'vitest';
import {
  VITRINA_ANIM_MS,
  canGoToHero,
  canGoToProjects,
  heroBandFromRects,
  layoutScaleFromSizes,
  unscaleRelativeRect,
  vitrinaCarouselLive,
  vitrinaGridMounted,
  vitrinaTypewriterPaused,
} from '@/lib/vitrina-transition';

describe('vitrinaTypewriterPaused', () => {
  it('sigue activo en la portada cuando no hay transición', () => {
    expect(vitrinaTypewriterPaused('hero', false)).toBe(false);
  });

  it('se pausa en la vista de proyectos y durante toda la transición', () => {
    expect(vitrinaTypewriterPaused('projects', false)).toBe(true);
    expect(vitrinaTypewriterPaused('hero', true)).toBe(true);
    expect(vitrinaTypewriterPaused('projects', true)).toBe(true);
  });
});

describe('vitrinaCarouselLive', () => {
  it('solo anima el marquee en portada y fuera de la transición', () => {
    expect(vitrinaCarouselLive('hero', false)).toBe(true);
    expect(vitrinaCarouselLive('hero', true)).toBe(false);
    expect(vitrinaCarouselLive('projects', false)).toBe(false);
    expect(vitrinaCarouselLive('projects', true)).toBe(false);
  });
});

describe('vitrinaGridMounted', () => {
  it('no monta el grid hasta el primer CTA', () => {
    expect(vitrinaGridMounted(false)).toBe(false);
    expect(vitrinaGridMounted(true)).toBe(true);
  });
});

describe('canGoToProjects / canGoToHero', () => {
  it('bloquea doble click mientras busy', () => {
    expect(canGoToProjects(true, 'hero')).toBe(false);
    expect(canGoToHero(true, 'projects')).toBe(false);
  });

  it('solo deja ir a proyectos desde la portada', () => {
    expect(canGoToProjects(false, 'hero')).toBe(true);
    expect(canGoToProjects(false, 'projects')).toBe(false);
  });

  it('solo deja volver a la portada desde proyectos', () => {
    expect(canGoToHero(false, 'projects')).toBe(true);
    expect(canGoToHero(false, 'hero')).toBe(false);
  });
});

describe('heroBandFromRects', () => {
  it('mide la banda del hero sin depender del typewriter', () => {
    expect(heroBandFromRects(80, 120, 200)).toEqual({ top: 40, height: 200 });
  });

  it('convierte rects visuales a layout cuando hay CSS scale', () => {
    expect(heroBandFromRects(80, 120, 200, 0.5)).toEqual({
      top: 80,
      height: 400,
    });
  });
});

describe('layoutScaleFromSizes', () => {
  it('es 1 si faltan medidas', () => {
    expect(layoutScaleFromSizes(0, 1920)).toBe(1);
    expect(layoutScaleFromSizes(960, 0)).toBe(1);
  });

  it('divide visual entre layout', () => {
    expect(layoutScaleFromSizes(960, 1920)).toBe(0.5);
  });
});

describe('unscaleRelativeRect', () => {
  it('sin escala deja el offset tal cual', () => {
    expect(
      unscaleRelativeRect(
        { left: 10, top: 20 },
        { left: 40, top: 50, width: 80, height: 60 },
        1,
      ),
    ).toEqual({ left: 30, top: 30, width: 80, height: 60 });
  });

  it('divide por el scale del canvas', () => {
    expect(
      unscaleRelativeRect(
        { left: 0, top: 0 },
        { left: 50, top: 20, width: 100, height: 40 },
        0.5,
      ),
    ).toEqual({ left: 100, top: 40, width: 200, height: 80 });
  });
});

describe('VITRINA_ANIM_MS', () => {
  it('usa 500ms para la transición compositor', () => {
    expect(VITRINA_ANIM_MS).toBe(500);
  });
});

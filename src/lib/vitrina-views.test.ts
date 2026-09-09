import { describe, expect, it } from 'vitest';
import {
  vitrinaAiChatIsVisible,
  vitrinaAiToolsAreEnabled,
  type VitrinaProjectsView,
} from '@/lib/vitrina-views';

const ALL_VIEWS: VitrinaProjectsView[] = [
  'proyectos',
  'mapa',
  'avances',
  'analisis',
  'indicadores',
  'data',
  'vinculamos',
];

describe('vitrinaAiChatIsVisible', () => {
  it('muestra el chat solo en Proyectos y Mapa', () => {
    expect(ALL_VIEWS.filter(vitrinaAiChatIsVisible)).toEqual([
      'proyectos',
      'mapa',
    ]);
  });
});

describe('vitrinaAiToolsAreEnabled', () => {
  it('activa tools de la vitrina solo en Proyectos', () => {
    expect(ALL_VIEWS.filter(vitrinaAiToolsAreEnabled)).toEqual(['proyectos']);
  });
});

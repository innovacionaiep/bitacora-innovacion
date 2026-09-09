export type VitrinaProjectsView =
  | 'proyectos'
  | 'mapa'
  | 'avances'
  | 'analisis'
  | 'indicadores'
  | 'data'
  | 'vinculamos';

export function vitrinaAiChatIsVisible(view: VitrinaProjectsView): boolean {
  return view === 'proyectos' || view === 'mapa';
}

export function vitrinaAiToolsAreEnabled(view: VitrinaProjectsView): boolean {
  return view === 'proyectos';
}

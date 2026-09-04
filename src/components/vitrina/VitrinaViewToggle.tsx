'use client';

import { cn } from '@/lib/utils';
import type { VitrinaProjectsView } from '@/lib/vitrina-views';

export type { VitrinaProjectsView };

const TAB_LABELS: Record<VitrinaProjectsView, string> = {
  proyectos: 'Proyectos',
  avances: 'Avances',
  analisis: 'Análisis',
  indicadores: 'Indicadores',
  data: 'Data',
  vinculamos: 'Vinculamos',
};

const DEFAULT_TABS: VitrinaProjectsView[] = [
  'proyectos',
  'avances',
  'analisis',
  'indicadores',
  'data',
  'vinculamos',
];

export function VitrinaViewToggle({
  value,
  onChange,
  tabs = DEFAULT_TABS,
}: {
  value: VitrinaProjectsView;
  onChange: (next: VitrinaProjectsView) => void;
  tabs?: VitrinaProjectsView[];
}) {
  if (tabs.length <= 1) return null;

  return (
    <div
      role="tablist"
      aria-label="Vista de proyectos"
      className="inline-flex rounded-full border border-white/30 p-0.5"
    >
      {tabs.map((tab) => (
        <ToggleTab
          key={tab}
          active={value === tab}
          onClick={() => onChange(tab)}
        >
          {TAB_LABELS[tab]}
        </ToggleTab>
      ))}
    </div>
  );
}

function ToggleTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-1 text-sm font-semibold transition-colors',
        active
          ? 'bg-white text-slate-900'
          : 'text-white/80 hover:text-white',
      )}
    >
      {children}
    </button>
  );
}

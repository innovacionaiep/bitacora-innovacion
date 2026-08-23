'use client';

import { cn } from '@/lib/utils';

export type VitrinaProjectsView = 'proyectos' | 'analisis' | 'data';

export function VitrinaViewToggle({
  value,
  onChange,
}: {
  value: VitrinaProjectsView;
  onChange: (next: VitrinaProjectsView) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Vista de proyectos"
      className="inline-flex rounded-full border border-white/30 p-0.5"
    >
      <ToggleTab
        active={value === 'proyectos'}
        onClick={() => onChange('proyectos')}
      >
        Proyectos
      </ToggleTab>
      <ToggleTab
        active={value === 'analisis'}
        onClick={() => onChange('analisis')}
      >
        Análisis
      </ToggleTab>
      <ToggleTab active={value === 'data'} onClick={() => onChange('data')}>
        Data
      </ToggleTab>
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

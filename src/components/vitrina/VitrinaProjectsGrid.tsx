'use client';

import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';
import { VitrinaProjectCard } from '@/components/vitrina/VitrinaProjectCard';

export function VitrinaProjectsGrid({
  proyectos,
  canEdit,
  emptyHint,
  onOpen,
}: {
  proyectos: VitrinaProyecto[];
  canEdit: boolean;
  emptyHint?: string;
  onOpen: (id: string) => void;
}) {
  if (proyectos.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-8 py-10 lg:px-12">
        {emptyHint ? (
          <p className="text-sm text-slate-500">{emptyHint}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 px-8 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-12">
      {proyectos.map((proyecto) => (
        <VitrinaProjectCard
          key={proyecto.id}
          proyecto={proyecto}
          canEdit={canEdit}
          onOpen={() => onOpen(proyecto.id)}
        />
      ))}
    </div>
  );
}

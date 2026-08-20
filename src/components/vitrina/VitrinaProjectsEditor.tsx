'use client';

import { useState } from 'react';
import { Plus, Settings } from 'lucide-react';
import { VitrinaAiSettingsModal } from '@/components/vitrina/VitrinaAiSettingsModal';
import { VITRINA_PROYECTOS_MAX } from '@/lib/vitrina-proyectos';

type Props = {
  count: number;
  onAdd: () => void;
};

export function VitrinaProjectsEditor({ count, onAdd }: Props) {
  const canAdd = count < VITRINA_PROYECTOS_MAX;
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Añadir proyecto"
      >
        <Plus className="h-5 w-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Configuración"
      >
        <Settings className="h-5 w-5" aria-hidden />
      </button>
      <VitrinaAiSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

'use client';

import { Save, Pencil, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function ActivityFieldSaveCancel({
  isSaving,
  onSave,
  onCancel,
}: {
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-4 mt-2">
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="inline-flex items-center gap-1 text-[13px] font-normal text-gray-900 hover:text-emerald-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
      >
        <Save className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        Guardar
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-1 text-[13px] font-normal text-gray-500 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
      >
        <X className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        Cancelar
      </button>
    </div>
  );
}

export function ActivityHoverEditButton({
  onClick,
  tooltip = 'Editar',
  className = 'right-0 top-0',
}: {
  onClick: () => void;
  tooltip?: string;
  className?: string;
}) {
  return (
    <div className={`absolute z-10 ${className}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className="h-7 w-7 shrink-0 rounded-sm opacity-0 group-hover/field:opacity-100 focus-visible:opacity-100 transition-opacity duration-150 flex items-center justify-center text-gray-400 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
            aria-label={tooltip}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

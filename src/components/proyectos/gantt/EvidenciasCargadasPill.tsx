import { Check } from 'lucide-react';

export function EvidenciasCargadasPill({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <span
      aria-label="Evidencias cargadas"
      className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700"
    >
      <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
      Evidencias cargadas
    </span>
  );
}

'use client';

import {
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Check, Loader2, Pencil, Plus, Save, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GeneralTabTextarea } from '@/app/proyectos/tabs/GeneralTabTextarea';
import { useActiveRolePermissions } from '@/components/permissions/ActiveRolePermissionsProvider';
import {
  getEscalamientoProyecto,
  updateEscalamientoCampo,
  type EscalamientoCampo,
  type EscalamientoData,
} from '@/lib/actions/escalamiento';
import { escalamientoKey } from '@/lib/query-keys';

type EscalamientoTabProps = {
  projectId: string;
  onSaved?: () => void;
};

const EMPTY: EscalamientoData = {
  nuevaInstancia1: '',
  nuevaInstancia2: '',
  acuerdoContinuidad: '',
};

function FieldSaveCancel({
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

function HoverEditButton({
  onClick,
  tooltip = 'Editar',
}: {
  onClick: () => void;
  tooltip?: string;
}) {
  return (
    <div className="absolute z-10 right-0 top-0">
      <TooltipProvider>
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
      </TooltipProvider>
    </div>
  );
}

function AddInfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[13px] font-normal text-gray-500 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
    >
      <Plus className="h-4 w-4 shrink-0" strokeWidth={2} />
      <span>Añadir</span>
    </button>
  );
}

function ReadingSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 scroll-mt-3">
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/90 rounded-t-lg">
          <h2 className="text-[13px] font-medium tracking-wide text-gray-800 truncate">
            {title}
          </h2>
        </div>
        <div className="flex flex-col gap-5 px-5 py-4 min-w-0">{children}</div>
      </div>
    </section>
  );
}

function BodyText({ children }: { children: ReactNode }) {
  return (
    <p className="text-[15px] text-gray-800 leading-[1.75] break-words [overflow-wrap:anywhere] whitespace-pre-wrap">
      {children}
    </p>
  );
}

function EditableSlot({
  field,
  value,
  draftValue,
  canEdit,
  isEditing,
  isSaving,
  onStartEdit,
  onChangeDraft,
  onSave,
  onCancel,
}: {
  field: EscalamientoCampo;
  value: string;
  draftValue: string;
  canEdit: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onStartEdit: (field: EscalamientoCampo) => void;
  onChangeDraft: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const hasValue = Boolean(value.trim());

  if (isEditing) {
    return (
      <div className="min-w-0">
        <GeneralTabTextarea
          value={draftValue}
          onChange={(e) => onChangeDraft(e.target.value)}
          className="text-[15px] leading-[1.75] border-0 border-b border-gray-200 rounded-none focus:border-gray-400 bg-transparent shadow-none px-0 break-words max-w-full"
          autoFocus
        />
        <FieldSaveCancel
          isSaving={isSaving}
          onSave={onSave}
          onCancel={onCancel}
        />
      </div>
    );
  }

  if (hasValue) {
    return (
      <div className="group/field relative min-w-0">
        <BodyText>{value}</BodyText>
        {canEdit ? (
          <HoverEditButton
            onClick={() => onStartEdit(field)}
            tooltip="Editar"
          />
        ) : null}
      </div>
    );
  }

  if (!canEdit) {
    return (
      <p className="text-[13px] text-gray-400 italic">Sin información</p>
    );
  }

  return <AddInfoButton onClick={() => onStartEdit(field)} />;
}

export function EscalamientoTab({ projectId, onSaved }: EscalamientoTabProps) {
  const { can } = useActiveRolePermissions();
  const canEdit = can('projects.edit');
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: escalamientoKey(projectId),
    queryFn: async () => {
      const res = await getEscalamientoProyecto(projectId);
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Error al cargar escalamiento');
      }
      return res.data;
    },
    staleTime: 60_000,
    gcTime: 90_000,
  });

  const data = query.data ?? EMPTY;
  const loading = query.isPending;
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<EscalamientoCampo | null>(
    null
  );
  const [draftValue, setDraftValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (query.isError) {
      setError(
        query.error instanceof Error
          ? query.error.message
          : 'Error al cargar escalamiento'
      );
    }
  }, [query.isError, query.error]);

  useEffect(() => {
    if (!showToast) return;
    const t = window.setTimeout(() => setShowToast(false), 2200);
    return () => window.clearTimeout(t);
  }, [showToast]);

  const handleStartEdit = (field: EscalamientoCampo) => {
    if (!canEdit) return;
    setEditingField(field);
    setDraftValue(data[field] ?? '');
    setError(null);
  };

  const handleCancel = () => {
    setEditingField(null);
    setDraftValue('');
  };

  const handleSave = async () => {
    if (!editingField || !canEdit) return;
    setIsSaving(true);
    setError(null);
    const res = await updateEscalamientoCampo(
      projectId,
      editingField,
      draftValue
    );
    if (!res.success) {
      setError(res.error || 'No se pudo guardar');
      setIsSaving(false);
      return;
    }
    const saved = res.data?.value ?? draftValue.trim();
    queryClient.setQueryData<EscalamientoData>(
      escalamientoKey(projectId),
      (prev) => ({ ...(prev ?? EMPTY), [editingField]: saved })
    );
    setEditingField(null);
    setDraftValue('');
    setIsSaving(false);
    setShowToast(true);
    onSaved?.();
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 px-6">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
        <p className="text-sm text-gray-500">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-2xl mx-auto px-2 py-2">
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
              Estrategia de expansión y continuidad del proyecto
            </h2>
            <p className="mt-1 text-[13px] text-gray-500 leading-relaxed">
              Plan de acción para la continuidad, adaptación y replicabilidad
              del proyecto en otros contextos
            </p>
          </div>

          <div className="space-y-4">
            <ReadingSection title="Nuevas instancias potenciales identificadas">
              <EditableSlot
                field="nuevaInstancia1"
                value={data.nuevaInstancia1}
                draftValue={
                  editingField === 'nuevaInstancia1' ? draftValue : ''
                }
                canEdit={canEdit}
                isEditing={editingField === 'nuevaInstancia1'}
                isSaving={isSaving}
                onStartEdit={handleStartEdit}
                onChangeDraft={setDraftValue}
                onSave={handleSave}
                onCancel={handleCancel}
              />
              <EditableSlot
                field="nuevaInstancia2"
                value={data.nuevaInstancia2}
                draftValue={
                  editingField === 'nuevaInstancia2' ? draftValue : ''
                }
                canEdit={canEdit}
                isEditing={editingField === 'nuevaInstancia2'}
                isSaving={isSaving}
                onStartEdit={handleStartEdit}
                onChangeDraft={setDraftValue}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            </ReadingSection>

            <ReadingSection title="Acuerdos o compromisos de continuidad o expansión">
              <EditableSlot
                field="acuerdoContinuidad"
                value={data.acuerdoContinuidad}
                draftValue={
                  editingField === 'acuerdoContinuidad' ? draftValue : ''
                }
                canEdit={canEdit}
                isEditing={editingField === 'acuerdoContinuidad'}
                isSaving={isSaving}
                onStartEdit={handleStartEdit}
                onChangeDraft={setDraftValue}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            </ReadingSection>
          </div>

          {error && (
            <p className="text-[13px] text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-6 right-6 bg-emerald-500 text-white px-8 py-4 rounded-lg shadow-lg flex items-center space-x-2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Check className="h-6 w-6" />
          <span className="font-semibold text-base">Cambios guardados</span>
        </div>
      )}
    </div>
  );
}

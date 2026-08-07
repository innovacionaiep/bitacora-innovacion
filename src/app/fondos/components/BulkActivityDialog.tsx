'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import {
  confirmBulkActivityFondo,
  previewBulkActivityFondo,
  type BulkActivityPreviewProyecto,
  type BulkActivityTaskInput,
} from '@/lib/actions/operaciones-fondo';

const CHUNK_SIZE = 25;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fondoNombre: string;
  onSuccess?: () => void;
};

type Step = 'form' | 'preview' | 'done';

const emptyTask = (): BulkActivityTaskInput => ({
  name: '',
  description: '',
  startDate: '',
  endDate: '',
});

function formatDateCl(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function BulkActivityDialog({
  open,
  onOpenChange,
  fondoNombre,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [task, setTask] = useState<BulkActivityTaskInput>(emptyTask);
  const [proyectos, setProyectos] = useState<BulkActivityPreviewProyecto[]>(
    []
  );
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const resetWizard = useCallback(() => {
    setStep('form');
    setName('');
    setDescription('');
    setTask(emptyTask());
    setProyectos([]);
    setLoadingPreview(false);
    setConfirming(false);
    setProgress(0);
    setError(null);
    setDoneMessage(null);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) resetWizard();
    onOpenChange(next);
  };

  const formValid =
    Boolean(name.trim()) &&
    Boolean(task.name.trim()) &&
    Boolean(task.startDate) &&
    Boolean(task.endDate) &&
    task.startDate <= task.endDate;

  const runPreview = async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      const result = await previewBulkActivityFondo({
        fondoNombre,
        name,
        description,
        task,
      });
      if (!result.success) {
        setError(result.error ?? 'Error al preparar la vista previa');
        return;
      }
      setProyectos(result.proyectos ?? []);
      setName(result.name ?? name);
      setDescription(result.description ?? description);
      if (result.task) setTask(result.task);
      setStep('preview');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Error al preparar la vista previa'
      );
    } finally {
      setLoadingPreview(false);
    }
  };

  const runConfirm = async () => {
    if (!proyectos.length) return;
    setConfirming(true);
    setError(null);
    setProgress(0);

    let createdTotal = 0;
    const allErrors: string[] = [];
    const ids = proyectos.map((p) => p.id);

    try {
      for (let offset = 0; offset < ids.length; offset += CHUNK_SIZE) {
        const chunk = ids.slice(offset, offset + CHUNK_SIZE);
        const result = await confirmBulkActivityFondo({
          fondoNombre,
          name,
          description,
          task,
          proyectoIds: chunk,
        });

        createdTotal += result.created ?? 0;
        if (result.errors?.length) {
          for (const e of result.errors) {
            const label =
              proyectos.find((p) => p.id === e.proyectoId)?.proyecto ??
              e.proyectoId;
            allErrors.push(`${label}: ${e.error}`);
          }
        }
        if (result.error && !result.created) {
          allErrors.push(result.error);
        }

        setProgress(Math.round(((offset + chunk.length) / ids.length) * 100));
      }

      if (allErrors.length) {
        setError(
          `Creadas ${createdTotal}. Errores: ${allErrors.slice(0, 5).join('; ')}${allErrors.length > 5 ? '…' : ''}`
        );
      } else {
        setDoneMessage(
          `Se creó la actividad «${name}» con la tarea «${task.name}» en ${createdTotal} proyecto(s).`
        );
        setStep('done');
        onSuccess?.();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al confirmar');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[15px]">
            Actividad masiva — {fondoNombre}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <div className="flex flex-col gap-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="bulk-activity-name" className="text-[13px]">
                Nombre de la actividad
              </Label>
              <Input
                id="bulk-activity-name"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre de la actividad"
                className="text-[13px] shadow-none border-gray-200"
              />
              <p className="text-[11px] text-gray-400">
                Máximo 60 caracteres ({name.length}/60)
              </p>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="bulk-activity-description"
                className="text-[13px]"
              >
                Descripción
              </Label>
              <Textarea
                id="bulk-activity-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción opcional"
                className="text-[13px] min-h-[72px] shadow-none border-gray-200"
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 space-y-3">
              <div>
                <p className="text-[12px] font-medium text-gray-800">
                  Tarea obligatoria
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Define la duración de la actividad en el Gantt de cada
                  proyecto.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulk-task-name" className="text-[13px]">
                  Nombre de la tarea
                </Label>
                <Input
                  id="bulk-task-name"
                  value={task.name}
                  maxLength={60}
                  onChange={(e) =>
                    setTask((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Nombre de la tarea"
                  className="text-[13px] shadow-none border-gray-200 bg-white"
                />
                <p className="text-[11px] text-gray-400">
                  Máximo 60 caracteres ({task.name.length}/60)
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bulk-task-start" className="text-[13px]">
                    Fecha inicio
                  </Label>
                  <Input
                    id="bulk-task-start"
                    type="date"
                    value={task.startDate}
                    max={task.endDate || undefined}
                    onChange={(e) =>
                      setTask((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    className="text-[13px] shadow-none border-gray-200 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bulk-task-end" className="text-[13px]">
                    Fecha fin
                  </Label>
                  <Input
                    id="bulk-task-end"
                    type="date"
                    value={task.endDate}
                    min={task.startDate || undefined}
                    onChange={(e) =>
                      setTask((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    className="text-[13px] shadow-none border-gray-200 bg-white"
                  />
                </div>
              </div>
              {task.startDate &&
              task.endDate &&
              task.startDate > task.endDate ? (
                <p className="text-[12px] text-red-600">
                  La fecha de inicio no puede ser posterior a la de fin.
                </p>
              ) : null}
            </div>

            {error ? (
              <p className="text-[13px] text-red-600">{error}</p>
            ) : null}
          </div>
        )}

        {step === 'preview' && (
          <div className="flex flex-col gap-3 py-1">
            <p className="text-[13px] text-gray-700">
              Se creará la actividad{' '}
              <span className="font-medium">«{name}»</span> con la tarea{' '}
              <span className="font-medium">«{task.name}»</span> (
              {formatDateCl(task.startDate)} – {formatDateCl(task.endDate)}) en{' '}
              <span className="font-medium">{proyectos.length}</span> proyecto
              {proyectos.length === 1 ? '' : 's'}:
            </p>
            {proyectos.length === 0 ? (
              <p className="text-[13px] text-amber-700">
                No hay proyectos en este fondo.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[12px]">Proyecto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proyectos.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-[13px] py-2">
                          {p.proyecto}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {confirming ? (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-[12px] text-gray-500">
                  Creando… {progress}%
                </p>
              </div>
            ) : null}
            {error ? (
              <p className="text-[13px] text-red-600">{error}</p>
            ) : null}
          </div>
        )}

        {step === 'done' && (
          <div className="py-2">
            <p className="text-[13px] text-emerald-700">{doneMessage}</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 'form' && (
            <>
              <Button
                type="button"
                variant="outline"
                className="text-[13px] shadow-none border-gray-200"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="text-[13px] shadow-none"
                disabled={!formValid || loadingPreview}
                onClick={runPreview}
              >
                {loadingPreview ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Preparando…
                  </>
                ) : (
                  'Vista previa'
                )}
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button
                type="button"
                variant="outline"
                className="text-[13px] shadow-none border-gray-200"
                disabled={confirming}
                onClick={() => {
                  setError(null);
                  setStep('form');
                }}
              >
                Atrás
              </Button>
              <Button
                type="button"
                className="text-[13px] shadow-none"
                disabled={confirming || proyectos.length === 0 || !!doneMessage}
                onClick={runConfirm}
              >
                {confirming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Creando…
                  </>
                ) : (
                  'Confirmar'
                )}
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button
              type="button"
              className="text-[13px] shadow-none"
              onClick={() => handleOpenChange(false)}
            >
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

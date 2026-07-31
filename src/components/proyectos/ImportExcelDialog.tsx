'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, FileUp, Loader2 } from 'lucide-react';
import type { ImportTemplateTipo, PreviewRowResult } from '@/lib/excel-import';
import {
  previewBulkProyectos,
  confirmBulkProyectos,
  previewImportParticipantes,
  confirmImportParticipantes,
  previewImportActividades,
  confirmImportActividades,
  previewImportIndicadores,
  confirmImportIndicadores,
  previewImportPresupuesto,
  confirmImportPresupuesto,
} from '@/lib/actions/import-excel';

const CHUNK_SIZE = 25;

const TITLES: Record<ImportTemplateTipo, string> = {
  proyectos: 'Carga masiva de proyectos',
  participantes: 'Carga masiva de participantes',
  actividades: 'Carga masiva de actividades',
  indicadores: 'Carga masiva de indicadores',
  presupuesto: 'Carga masiva de presupuesto',
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: ImportTemplateTipo;
  proyectoId?: string;
  onSuccess?: () => void;
};

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function ImportExcelDialog({
  open,
  onOpenChange,
  tipo,
  proyectoId,
  onSuccess,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRowResult[]>([]);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFileName(null);
    setLoadingPreview(false);
    setConfirming(false);
    setProgress(0);
    setError(null);
    setRows([]);
    setDoneMessage(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const templateUrl = useMemo(() => {
    const base = `/api/import-templates/${tipo}`;
    if (tipo === 'proyectos') return base;
    return `${base}?proyectoId=${encodeURIComponent(proyectoId ?? '')}`;
  }, [tipo, proyectoId]);

  const okCount = rows.filter((r) => r.status === 'ok').length;
  const errCount = rows.filter((r) => r.status === 'error').length;
  const canConfirm = rows.length > 0 && errCount === 0 && !confirming && !doneMessage;

  const runPreview = async (file: File) => {
    setLoadingPreview(true);
    setError(null);
    setRows([]);
    setDoneMessage(null);
    setFileName(file.name);
    try {
      const base64 = await fileToBase64(file);
      let result: {
        success: boolean;
        rows?: PreviewRowResult[];
        error?: string;
      };

      if (tipo === 'proyectos') {
        result = await previewBulkProyectos(base64);
      } else if (!proyectoId) {
        setError('Falta el proyecto');
        setLoadingPreview(false);
        return;
      } else if (tipo === 'participantes') {
        result = await previewImportParticipantes(proyectoId, base64);
      } else if (tipo === 'actividades') {
        result = await previewImportActividades(proyectoId, base64);
      } else if (tipo === 'indicadores') {
        result = await previewImportIndicadores(proyectoId, base64);
      } else {
        result = await previewImportPresupuesto(proyectoId, base64);
      }

      if (!result.success) {
        setError(result.error ?? 'Error al validar el archivo');
        setRows([]);
      } else {
        setRows(result.rows ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al leer el archivo');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirm = async () => {
    const validData = rows
      .filter((r) => r.status === 'ok' && r.data)
      .map((r) => r.data!);
    if (!validData.length) return;

    setConfirming(true);
    setError(null);
    setProgress(0);

    let createdTotal = 0;
    const allErrors: string[] = [];

    try {
      for (let offset = 0; offset < validData.length; offset += CHUNK_SIZE) {
        const chunk = validData.slice(offset, offset + CHUNK_SIZE);
        let result: {
          success: boolean;
          created?: number;
          errors?: { index: number; error: string }[];
          error?: string;
        };

        if (tipo === 'proyectos') {
          result = await confirmBulkProyectos(
            chunk as Parameters<typeof confirmBulkProyectos>[0]
          );
        } else if (!proyectoId) {
          setError('Falta el proyecto');
          setConfirming(false);
          return;
        } else if (tipo === 'participantes') {
          result = await confirmImportParticipantes(
            proyectoId,
            chunk as Parameters<typeof confirmImportParticipantes>[1]
          );
        } else if (tipo === 'actividades') {
          result = await confirmImportActividades(
            proyectoId,
            chunk as Parameters<typeof confirmImportActividades>[1]
          );
        } else if (tipo === 'indicadores') {
          result = await confirmImportIndicadores(
            proyectoId,
            chunk as Parameters<typeof confirmImportIndicadores>[1]
          );
        } else {
          result = await confirmImportPresupuesto(
            proyectoId,
            chunk as Parameters<typeof confirmImportPresupuesto>[1]
          );
        }

        createdTotal += result.created ?? 0;
        if (result.errors?.length) {
          for (const e of result.errors) {
            allErrors.push(`Ítem ${offset + e.index + 1}: ${e.error}`);
          }
        }
        if (result.error && !result.created) {
          allErrors.push(result.error);
        }

        setProgress(
          Math.round(
            ((offset + chunk.length) / validData.length) * 100
          )
        );
      }

      if (allErrors.length) {
        setError(
          `Importados ${createdTotal}. Errores: ${allErrors.slice(0, 5).join('; ')}${allErrors.length > 5 ? '…' : ''}`
        );
      } else {
        setDoneMessage(`Se importaron ${createdTotal} elemento(s) correctamente.`);
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
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{TITLES[tipo]}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={templateUrl} download>
              <Download className="h-4 w-4 mr-1.5" />
              Descargar plantilla
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loadingPreview || confirming}
          >
            <FileUp className="h-4 w-4 mr-1.5" />
            Subir Excel
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void runPreview(f);
            }}
          />
          {fileName && (
            <span className="text-sm text-muted-foreground truncate max-w-[200px]">
              {fileName}
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {tipo === 'actividades' ? (
            <>
              Plantilla con dos hojas: <strong>Actividades</strong> (sin fechas)
              y <strong>Tareas</strong> (con fechas). En Tareas, la columna
              Actividad usa el desplegable alimentado por los nombres de
              Actividades. La columna Alerta marca en rojo las actividades sin
              tareas. Solo se agregan elementos nuevos. Confirmar requiere 0
              errores.
            </>
          ) : (
            <>
              Listas con varios valores (sedes, escuelas, etc.): sepáralos con
              punto y coma (;). La plantilla de proyectos (.xlsm) incluye una
              macro: al habilitar macros, cada elección del desplegable se
              agrega con ; (elegir de nuevo el mismo valor lo quita).
              Asignaturas y SociosComunitarios admiten texto libre: si el nombre
              no existe se crea; si ya existe se reutiliza. Solo se agregan
              elementos nuevos. Confirmar requiere 0 errores.
            </>
          )}
        </p>

        {loadingPreview && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Validando archivo…
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {doneMessage && (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
            {doneMessage}
          </div>
        )}

        {rows.length > 0 && !loadingPreview && (
          <>
            <div className="text-sm flex gap-4">
              <span className="text-emerald-700">{okCount} correctas</span>
              <span className={errCount ? 'text-red-600' : 'text-muted-foreground'}>
                {errCount} con error
              </span>
            </div>
            <div className="border rounded-md overflow-auto max-h-[40vh] min-h-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Fila</TableHead>
                    <TableHead className="w-20">Estado</TableHead>
                    <TableHead>Resumen</TableHead>
                    <TableHead>Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => (
                    <TableRow
                      key={`${r.sheetName ?? 'sheet'}-${r.rowNumber}-${idx}`}
                    >
                      <TableCell className="text-xs whitespace-nowrap">
                        {r.sheetName
                          ? `${r.sheetName} · ${r.rowNumber}`
                          : r.rowNumber}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            r.status === 'ok'
                              ? 'text-emerald-700'
                              : 'text-red-600'
                          }
                        >
                          {r.status === 'ok' ? 'OK' : 'Error'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{r.summary}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.errors.length ? r.errors.join(' · ') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {confirming && (
          <div className="space-y-1">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground text-center">
              Importando… {progress}%
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={confirming}
          >
            Cerrar
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={!canConfirm}>
            {confirming ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Importando…
              </>
            ) : (
              'Confirmar importación'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

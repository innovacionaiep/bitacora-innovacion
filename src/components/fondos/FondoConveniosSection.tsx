'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { Download, FileDown, Replace, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getConveniosPorFondo,
  guardarConvenioFirmado,
  type ConvenioDashboardRow,
} from '@/lib/actions/convenios';
import {
  buildCloudinaryDownloadUrl,
  CONVENIO_ACCEPT,
  uploadConvenioFirmado,
} from '@/lib/convenios-upload';
import { cn } from '@/lib/utils';

function formatFecha(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function safeZipEntryName(proyecto: string, archivo: string): string {
  const base = `${proyecto}-${archivo}`
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return base.slice(0, 180) || 'convenio';
}

async function fetchAsBlob(url: string, filename: string): Promise<Blob> {
  const apiUrl = buildCloudinaryDownloadUrl(url, filename);
  const res = await fetch(apiUrl);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error al descargar ${filename}`);
  }
  return res.blob();
}

type Props = {
  fondoNombre: string;
  onChanged?: () => void;
};

export function FondoConveniosSection({ fondoNombre, onChanged }: Props) {
  const [rows, setRows] = useState<ConvenioDashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingUploadIdRef = useRef<string | null>(null);

  const load = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!opts?.quiet) setLoading(true);
      setError(null);
      const res = await getConveniosPorFondo(fondoNombre);
      if (!res.success) {
        setError(res.error || 'Error al cargar convenios');
        if (!opts?.quiet) setRows([]);
      } else {
        setRows(res.data);
      }
      if (!opts?.quiet) setLoading(false);
    },
    [fondoNombre]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const firmados = useMemo(() => rows.filter((r) => r.firmado), [rows]);
  const pendientes = rows.length - firmados.length;

  const openFilePicker = (proyectoId: string) => {
    pendingUploadIdRef.current = proyectoId;
    setError(null);
    inputRef.current?.click();
  };

  const handleFile = async (file: File | null) => {
    const proyectoId = pendingUploadIdRef.current;
    pendingUploadIdRef.current = null;
    if (!file || !proyectoId) return;

    const wasFirmado = rows.some((r) => r.id === proyectoId && r.firmado);
    setUploadingId(proyectoId);
    setError(null);
    try {
      const uploaded = await uploadConvenioFirmado(file, proyectoId);
      if ('error' in uploaded) {
        setError(uploaded.error);
        return;
      }
      const saved = await guardarConvenioFirmado({
        proyectoId,
        url: uploaded.url,
        publicId: uploaded.publicId,
        nombreArchivo: uploaded.nombreArchivo,
      });
      if (!saved.success) {
        setError(saved.error || 'No se pudo guardar el convenio.');
        return;
      }
      await load({ quiet: true });
      onChanged?.();
    } catch {
      setError(
        wasFirmado
          ? 'Error inesperado al reemplazar el convenio.'
          : 'Error inesperado al subir el convenio.'
      );
    } finally {
      setUploadingId(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDownloadOne = async (row: ConvenioDashboardRow) => {
    if (!row.convenioFirmadoUrl) return;
    setDownloadingId(row.id);
    setError(null);
    try {
      const filename = row.convenioFirmadoNombre || 'convenio-firmado.pdf';
      const blob = await fetchAsBlob(row.convenioFirmadoUrl, filename);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al descargar');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (firmados.length === 0) return;
    setZipping(true);
    setError(null);
    try {
      const zip = new JSZip();
      const usedNames = new Set<string>();
      for (const row of firmados) {
        if (!row.convenioFirmadoUrl) continue;
        const filename = row.convenioFirmadoNombre || 'convenio-firmado.pdf';
        let entry = safeZipEntryName(row.proyecto, filename);
        if (usedNames.has(entry)) {
          entry = `${row.id.slice(0, 6)}-${entry}`;
        }
        usedNames.add(entry);
        const blob = await fetchAsBlob(row.convenioFirmadoUrl, filename);
        zip.file(entry, blob);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = `convenios-${fondoNombre}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Error al generar el ZIP de convenios firmados.'
      );
    } finally {
      setZipping(false);
    }
  };

  if (loading) {
    return <div className="min-h-[80px] py-8" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-[13px] text-gray-500">
          {rows.length} proyecto{rows.length === 1 ? '' : 's'}
          {rows.length > 0 && (
            <>
              {' '}
              ·{' '}
              <span className="text-emerald-700 font-medium">
                {firmados.length} firmado{firmados.length === 1 ? '' : 's'}
              </span>
              {pendientes > 0 && (
                <>
                  {' '}
                  ·{' '}
                  <span className="text-red-600 font-medium">
                    {pendientes} pendiente{pendientes === 1 ? '' : 's'}
                  </span>
                </>
              )}
            </>
          )}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={handleDownloadAll}
          disabled={zipping || firmados.length === 0}
          className="border-gray-200 text-[13px] shadow-none"
        >
          <FileDown className="h-4 w-4 mr-2" />
          {zipping ? 'Generando ZIP…' : 'Descargar todo'}
        </Button>
      </div>

      {error && (
        <p className="text-[13px] text-red-600" role="alert">
          {error}
        </p>
      )}

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-200 px-4 py-10 text-center">
          <p className="text-[13px] text-gray-500">
            No hay proyectos en este fondo.
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                <TableHead className="text-[12px] font-medium text-gray-500 uppercase tracking-wide pl-4">
                  Proyecto
                </TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">
                  Estado
                </TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">
                  Fecha
                </TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">
                  Archivo
                </TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500 uppercase tracking-wide text-right pr-4">
                  Acción
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-gray-50/50">
                  <TableCell className="pl-4 text-[13px] text-gray-800 font-medium max-w-[280px] whitespace-normal break-words">
                    {row.proyecto}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'font-normal border',
                        row.firmado
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      )}
                    >
                      {row.firmado ? 'Firmado' : 'No firmado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600">
                    {formatFecha(row.convenioFirmadoAt)}
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600 max-w-[180px] truncate">
                    {row.convenioFirmadoNombre || '—'}
                  </TableCell>
                  <TableCell className="text-right pr-4 whitespace-nowrap">
                    <div className="inline-flex flex-nowrap items-center justify-end gap-0.5">
                      {row.firmado ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={
                              downloadingId === row.id ||
                              uploadingId === row.id ||
                              zipping
                            }
                            onClick={() => handleDownloadOne(row)}
                            className="h-8 px-2 text-[13px] text-gray-600 hover:text-gray-900"
                          >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            {downloadingId === row.id ? '…' : 'Descargar'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={
                              uploadingId !== null ||
                              downloadingId === row.id ||
                              zipping
                            }
                            onClick={() => openFilePicker(row.id)}
                            className="h-8 px-2 text-[13px] text-gray-600 hover:text-gray-900"
                          >
                            <Replace className="h-3.5 w-3.5 mr-1" />
                            {uploadingId === row.id ? 'Subiendo…' : 'Reemplazar'}
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={
                            uploadingId !== null || zipping
                          }
                          onClick={() => openFilePicker(row.id)}
                          className="h-8 px-2 text-[13px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                        >
                          <Upload className="h-3.5 w-3.5 mr-1" />
                          {uploadingId === row.id ? 'Subiendo…' : 'Subir'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={CONVENIO_ACCEPT}
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0] ?? null);
        }}
      />
    </div>
  );
}

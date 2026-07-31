'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { Download, FileDown } from 'lucide-react';
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
  getConveniosDashboard,
  type ConvenioDashboardRow,
} from '@/lib/actions/convenios';
import { buildCloudinaryDownloadUrl } from '@/lib/convenios-upload';
import { cn } from '@/lib/utils';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';

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

export function ConveniosTab() {
  const [rows, setRows] = useState<ConvenioDashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getConveniosDashboard();
    if (!res.success) {
      setError(res.error || 'Error al cargar convenios');
      setRows([]);
    } else {
      setRows(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const firmados = useMemo(() => rows.filter((r) => r.firmado), [rows]);
  const pendientes = rows.length - firmados.length;

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
      a.download = 'convenios-firmados.zip';
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

  usePageTopLoader(loading);

  if (loading) {
    return <div className="min-h-[120px] py-16" />;
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] text-gray-500">
            {rows.length} proyecto{rows.length === 1 ? '' : 's'} con convenios
            habilitados
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
        </div>
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
        <div className="rounded-md border border-dashed border-gray-200 px-4 py-12 text-center">
          <p className="text-[13px] text-gray-500">
            No hay proyectos con convenios habilitados. Activa fondos en
            Configuración → Convenios.
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
                  Fondo
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
                  <TableCell className="text-[13px] text-gray-600">
                    {row.fondo || '—'}
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
                  <TableCell className="text-right pr-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!row.firmado || downloadingId === row.id}
                      onClick={() => handleDownloadOne(row)}
                      className="h-8 text-[13px] text-gray-600 hover:text-gray-900"
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      {downloadingId === row.id ? '…' : 'Descargar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

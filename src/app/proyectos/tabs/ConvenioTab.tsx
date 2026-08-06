'use client';

import { useRef, useState } from 'react';
import {
  Download,
  Upload,
  FileCheck2,
  FileWarning,
  Replace,
  Eye,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProyectoWithRelations } from '@/types/proyecto';
import {
  CONVENIO_ACCEPT,
  buildCloudinaryDownloadUrl,
  getConvenioBrutoMetaClient,
  uploadConvenioFirmado,
} from '@/lib/convenios-upload';
import {
  eliminarConvenioFirmado,
  guardarConvenioFirmado,
} from '@/lib/actions/convenios';

type ConvenioTabProps = {
  project: ProyectoWithRelations;
  setProject: React.Dispatch<
    React.SetStateAction<ProyectoWithRelations | null>
  >;
};

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

async function triggerDownload(url: string, filename: string) {
  const apiUrl = buildCloudinaryDownloadUrl(url, filename);
  const res = await fetch(apiUrl);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'No se pudo descargar el archivo.');
  }
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

export function ConvenioTab({ project, setProject }: ConvenioTabProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingBruto, setDownloadingBruto] = useState(false);
  const [downloadingFirmado, setDownloadingFirmado] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const firmado = Boolean(project.convenioFirmadoUrl);
  const bruto = getConvenioBrutoMetaClient();

  const clearFirmadoLocal = () => {
    setProject((prev) =>
      prev
        ? {
            ...prev,
            convenioFirmadoUrl: null,
            convenioFirmadoPublicId: null,
            convenioFirmadoNombre: null,
            convenioFirmadoAt: null,
            convenioFirmadoByUserId: null,
          }
        : prev
    );
  };

  const handleDownloadBruto = async () => {
    setError(null);
    if (!bruto.url) {
      setError('No está configurada la URL de la plantilla de convenio.');
      return;
    }
    setDownloadingBruto(true);
    try {
      await triggerDownload(bruto.url, bruto.filename);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Error al descargar el formato.'
      );
    } finally {
      setDownloadingBruto(false);
    }
  };

  const handleDownloadFirmado = async () => {
    setError(null);
    if (!project.convenioFirmadoUrl) return;
    setDownloadingFirmado(true);
    try {
      await triggerDownload(
        project.convenioFirmadoUrl,
        project.convenioFirmadoNombre || 'convenio-firmado.pdf'
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Error al descargar el convenio firmado.'
      );
    } finally {
      setDownloadingFirmado(false);
    }
  };

  /** Abre el PDF vía proxy (inline); la URL pública de Cloudinary suele dar 401 si PDF delivery está bloqueado. */
  const handleVisualizarFirmado = () => {
    setError(null);
    if (!project.convenioFirmadoUrl) return;
    const filename = project.convenioFirmadoNombre || 'convenio-firmado.pdf';
    const apiUrl = buildCloudinaryDownloadUrl(
      project.convenioFirmadoUrl,
      filename,
      { disposition: 'inline' }
    );
    window.open(apiUrl, '_blank', 'noopener,noreferrer');
  };

  const handleEliminar = async () => {
    setError(null);
    setSuccessMsg(null);
    const nombre = project.convenioFirmadoNombre || 'el convenio firmado';
    const ok = window.confirm(
      `¿Eliminar ${nombre}? Se borrará también de Cloudinary y no se podrá recuperar.`
    );
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await eliminarConvenioFirmado(project.id);
      if (!res.success) {
        setError(res.error || 'No se pudo eliminar el convenio.');
        return;
      }
      clearFirmadoLocal();
      setSuccessMsg('Convenio firmado eliminado correctamente.');
    } catch {
      setError('Error inesperado al eliminar el convenio.');
    } finally {
      setDeleting(false);
    }
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setSuccessMsg(null);
    setUploading(true);
    try {
      const uploaded = await uploadConvenioFirmado(file, project.id);
      if ('error' in uploaded) {
        setError(uploaded.error);
        return;
      }
      const saved = await guardarConvenioFirmado({
        proyectoId: project.id,
        url: uploaded.url,
        publicId: uploaded.publicId,
        nombreArchivo: uploaded.nombreArchivo,
      });
      if (!saved.success || !saved.data) {
        setError(saved.error || 'No se pudo guardar el convenio.');
        return;
      }
      setProject((prev) =>
        prev
          ? {
              ...prev,
              convenioFirmadoUrl: saved.data!.convenioFirmadoUrl,
              convenioFirmadoPublicId: saved.data!.convenioFirmadoPublicId,
              convenioFirmadoNombre: saved.data!.convenioFirmadoNombre,
              convenioFirmadoAt: saved.data!.convenioFirmadoAt,
              convenioFirmadoByUserId: saved.data!.convenioFirmadoByUserId,
            }
          : prev
      );
      setSuccessMsg(
        firmado
          ? 'Convenio firmado reemplazado correctamente.'
          : 'Convenio firmado subido correctamente.'
      );
    } catch {
      setError('Error inesperado al subir el convenio.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const busy = uploading || deleting || downloadingFirmado;

  return (
    <div className="w-full max-w-2xl mx-auto px-2 py-2">
      <div className="space-y-8">
        <div id="tour-convenio-intro">
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
            Convenio
          </h2>
          <p className="mt-1 text-[13px] text-gray-500 leading-relaxed">
            Descarga el formato, fírmalo y súbelo aquí. Solo se guarda un
            archivo firmado por proyecto; al reemplazar se pierde el anterior.
          </p>
        </div>

        <section id="tour-convenio-formato" className="space-y-3">
          <h3 className="text-[13px] font-medium text-gray-700 uppercase tracking-wide">
            Formato
          </h3>
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadBruto}
            disabled={downloadingBruto || !bruto.url}
            className="border-gray-200 text-[13px] shadow-none"
          >
            <Download className="h-4 w-4 mr-2" />
            {downloadingBruto ? 'Descargando…' : 'Descargar formato'}
          </Button>
          <p className="text-[12px] text-gray-400">{bruto.filename}</p>
        </section>

        <section
          id="tour-convenio-documento"
          className="space-y-3 border-t border-gray-100 pt-6"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-medium text-gray-700 uppercase tracking-wide">
              Documento firmado
            </h3>
            {firmado ? (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700">
                <FileCheck2 className="h-3.5 w-3.5" />
                Firmado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-red-600">
                <FileWarning className="h-3.5 w-3.5" />
                No firmado
              </span>
            )}
          </div>

          {firmado ? (
            <div className="rounded-md border border-gray-200 bg-gray-50/60 px-4 py-3 space-y-3">
              <div className="text-[13px] text-gray-700">
                <p className="font-medium break-words">
                  {project.convenioFirmadoNombre || 'Convenio firmado'}
                </p>
                <p className="text-gray-500 mt-0.5">
                  Subido el {formatFecha(project.convenioFirmadoAt)}
                </p>
              </div>
              <div id="tour-convenio-acciones" className="flex flex-wrap gap-2">
                {project.convenioFirmadoUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleVisualizarFirmado}
                    disabled={busy}
                    title="Abrir documento firmado"
                    className="border-gray-200 text-[13px] shadow-none"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadFirmado}
                  disabled={busy}
                  className="border-gray-200 text-[13px] shadow-none"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloadingFirmado ? 'Descargando…' : 'Descargar firmado'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => inputRef.current?.click()}
                  disabled={busy}
                  className="border-gray-200 text-[13px] shadow-none"
                >
                  <Replace className="h-4 w-4 mr-2" />
                  {uploading ? 'Subiendo…' : 'Reemplazar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEliminar}
                  disabled={busy}
                  className="border-gray-200 text-[13px] text-red-600 hover:text-red-700 hover:bg-red-50 shadow-none"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? 'Eliminando…' : 'Eliminar'}
                </Button>
              </div>
            </div>
          ) : (
            <div
              id="tour-convenio-acciones"
              className="rounded-md border border-dashed border-red-200 bg-red-50/40 px-4 py-6 flex flex-col items-start gap-3"
            >
              <p className="text-[13px] text-gray-600">
                Aún no hay convenio firmado para este proyecto. Sube un PDF o
                Word (.docx), máximo 2 MB.
              </p>
              <Button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] shadow-none"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Subiendo…' : 'Subir convenio firmado'}
              </Button>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={CONVENIO_ACCEPT}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </section>

        {error && (
          <p className="text-[13px] text-red-600" role="alert">
            {error}
          </p>
        )}
        {successMsg && (
          <p className="text-[13px] text-emerald-700" role="status">
            {successMsg}
          </p>
        )}
      </div>
    </div>
  );
}

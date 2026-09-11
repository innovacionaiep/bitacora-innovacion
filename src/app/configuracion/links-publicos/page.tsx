'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Copy, Loader2 } from 'lucide-react';
import {
  caducarLinkPublico,
  generarLinkPublico,
  getLinkPublicoActivo,
  listLinksPublicosActivos,
  listProyectosNombresLinksPublicos,
  type LinkPublicoActivo,
  type LinkPublicoActivoRow,
  type ProyectoNombreRow,
} from '@/lib/actions/configuracion-links-publicos';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';

export default function ConfiguracionLinksPublicosPage() {
  const [proyectos, setProyectos] = useState<ProyectoNombreRow[]>([]);
  const [activos, setActivos] = useState<LinkPublicoActivoRow[]>([]);
  const [proyectoId, setProyectoId] = useState<string>('');
  const [link, setLink] = useState<LinkPublicoActivo | null | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [caducandoId, setCaducandoId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  usePageTopLoader(loading);

  const refreshActivos = useCallback(async () => {
    const res = await listLinksPublicosActivos();
    if (!res.success) {
      setError(res.error ?? 'Error al cargar los links activos');
      return;
    }
    setActivos(res.data ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [nombres, links] = await Promise.all([
        listProyectosNombresLinksPublicos(),
        listLinksPublicosActivos(),
      ]);
      if (cancelled) return;
      if (!nombres.success) {
        setError(nombres.error ?? 'Error al cargar proyectos');
        setLoading(false);
        return;
      }
      if (!links.success) {
        setError(links.error ?? 'Error al cargar los links activos');
        setProyectos(nombres.data ?? []);
        setLoading(false);
        return;
      }
      setProyectos(nombres.data ?? []);
      setActivos(links.data ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!proyectoId) {
      setLink(undefined);
      return;
    }
    let cancelled = false;
    setLink(undefined);
    void (async () => {
      const res = await getLinkPublicoActivo(proyectoId);
      if (cancelled) return;
      if (!res.success) {
        setError(res.error ?? 'Error al cargar el link');
        setLink(null);
        return;
      }
      setLink(res.data ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [proyectoId]);

  const handleGenerate = useCallback(async () => {
    if (!proyectoId) return;
    setBusy(true);
    setError(null);
    const res = await generarLinkPublico(proyectoId);
    setBusy(false);
    if (!res.success || !res.data) {
      setError(res.error ?? 'No se pudo generar el link');
      return;
    }
    setLink(res.data);
    await refreshActivos();
  }, [proyectoId, refreshActivos]);

  const handleCaducarFila = useCallback(
    async (id: string) => {
      setError(null);
      setCaducandoId(id);
      const res = await caducarLinkPublico(id);
      setCaducandoId(null);
      if (!res.success) {
        setError(res.error ?? 'No se pudo caducar el link');
        return;
      }
      if (proyectoId === id) setLink(null);
      await refreshActivos();
    },
    [proyectoId, refreshActivos]
  );

  const handleCopyFila = useCallback(async (id: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 2000);
  }, []);

  const canGenerate = Boolean(proyectoId) && link === null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden pt-4">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando proyectos…
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <section
            aria-labelledby="zona-generar-link"
            className="flex-shrink-0 rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-3"
          >
            <h3
              id="zona-generar-link"
              className="text-sm font-medium text-gray-900"
            >
              Generar link
            </h3>
            <p className="mt-0.5 text-[12px] text-gray-500">
              Elige un proyecto y genera un link. Copiar o caducar se hace en la
              tabla de abajo.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="min-w-[16rem] flex-1 space-y-1.5">
                <Label htmlFor="proyecto-publico">Proyecto</Label>
                <select
                  id="proyecto-publico"
                  value={proyectoId}
                  onChange={(e) => setProyectoId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                >
                  <option value="">Seleccionar proyecto</option>
                  {proyectos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.proyecto}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex h-9 items-center">
                {proyectoId && link === undefined ? (
                  <span className="inline-flex items-center gap-2 text-[13px] text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando…
                  </span>
                ) : canGenerate ? (
                  <Button
                    type="button"
                    onClick={() => void handleGenerate()}
                    disabled={busy}
                    className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {busy ? 'Generando…' : 'Generar link público'}
                  </Button>
                ) : proyectoId && link ? (
                  <p className="text-[13px] text-gray-500">
                    Este proyecto ya tiene un link activo.
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section
            aria-labelledby="zona-links-activos"
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white"
          >
            <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3">
              <h3
                id="zona-links-activos"
                className="text-sm font-medium text-gray-900"
              >
                Links activos
              </h3>
              <p className="mt-0.5 text-[12px] text-gray-500">
                Copia o caduca los links ya generados.
              </p>
            </div>
            {activos.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-gray-500">
                Ningún proyecto tiene un link público activo.
              </p>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white [&_tr]:bg-white">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[28%]">Proyecto</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead className="w-[13.5rem] text-right">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activos.map((row) => (
                      <TableRow key={row.proyectoId}>
                        <TableCell className="align-middle font-medium text-gray-900">
                          {row.proyecto}
                        </TableCell>
                        <TableCell className="align-middle break-all text-[13px] text-gray-700">
                          {row.url}
                        </TableCell>
                        <TableCell className="align-middle">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                void handleCopyFila(row.proyectoId, row.url)
                              }
                              aria-label={`Copiar link de ${row.proyecto}`}
                              className="border-gray-200 text-[13px]"
                            >
                              <Copy className="mr-1.5 h-3.5 w-3.5" />
                              {copiedId === row.proyectoId ? 'Copiado' : 'Copiar'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void handleCaducarFila(row.proyectoId)}
                              disabled={caducandoId === row.proyectoId}
                              aria-label={`Caducar link de ${row.proyecto}`}
                              className="border-gray-200 text-[13px] text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              {caducandoId === row.proyectoId
                                ? 'Caducando…'
                                : 'Caducar'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </div>
      )}

      {error && (
        <p className="mt-3 flex-shrink-0 text-[13px] text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

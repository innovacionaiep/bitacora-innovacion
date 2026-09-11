'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy, Loader2 } from 'lucide-react';
import {
  caducarLinkPublico,
  generarLinkPublico,
  getLinkPublicoActivo,
  listProyectosNombresLinksPublicos,
  type LinkPublicoActivo,
  type ProyectoNombreRow,
} from '@/lib/actions/configuracion-links-publicos';
import {
  publicLinkAbsoluteUrl,
  resolvePublicLinkOrigin,
} from '@/lib/public-link';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';

export default function ConfiguracionLinksPublicosPage() {
  const [proyectos, setProyectos] = useState<ProyectoNombreRow[]>([]);
  const [proyectoId, setProyectoId] = useState<string>('');
  const [link, setLink] = useState<LinkPublicoActivo | null | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  usePageTopLoader(loading);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await listProyectosNombresLinksPublicos();
      if (cancelled) return;
      if (!res.success) {
        setError(res.error ?? 'Error al cargar proyectos');
        setLoading(false);
        return;
      }
      setProyectos(res.data ?? []);
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

  const publicUrl = useMemo(() => {
    if (link?.url) return link.url;
    if (!link?.token) return '';
    return publicLinkAbsoluteUrl(
      resolvePublicLinkOrigin(
        process.env.NEXT_PUBLIC_NEXTAUTH_URL,
        process.env.NEXTAUTH_URL
      ),
      link.token
    );
  }, [link?.url, link?.token]);

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
  }, [proyectoId]);

  const handleCaducar = useCallback(async () => {
    if (!proyectoId) return;
    setBusy(true);
    setError(null);
    const res = await caducarLinkPublico(proyectoId);
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? 'No se pudo caducar el link');
      return;
    }
    setLink(null);
  }, [proyectoId]);

  const handleCopy = useCallback(async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [publicUrl]);

  return (
    <div className="h-full min-h-0 overflow-y-auto custom-scrollbar pt-4 pb-8">
      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Links públicos</h2>
          <p className="mt-1 text-[13px] text-gray-500 leading-relaxed">
            Genera un link para que cualquiera vea la ficha del proyecto sin
            iniciar sesión. El link no caduca solo; puedes romperlo aquí.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando proyectos…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="proyecto-publico">Proyecto</Label>
              <select
                id="proyecto-publico"
                value={proyectoId}
                onChange={(e) => setProyectoId(e.target.value)}
                className="flex h-9 w-full max-w-lg rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              >
                <option value="">Seleccionar proyecto</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.proyecto}
                  </option>
                ))}
              </select>
            </div>

            {proyectoId && link === undefined && (
              <p className="text-[13px] text-gray-500">Cargando link…</p>
            )}

            {proyectoId && link === null && (
              <Button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={busy}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {busy ? 'Generando…' : 'Generar link público'}
              </Button>
            )}

            {proyectoId && link && (
              <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50/70 px-4 py-3">
                <p className="break-all text-[13px] text-gray-800">{publicUrl}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleCopy()}
                    className="border-gray-200 text-[13px]"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copied ? 'Copiado' : 'Copiar link'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleCaducar()}
                    disabled={busy}
                    className="border-gray-200 text-[13px] text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    {busy ? 'Caducando…' : 'Caducar link'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-[13px] text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

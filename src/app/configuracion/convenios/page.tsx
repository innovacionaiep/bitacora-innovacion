'use client';

import { useCallback, useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getFondosConveniosConfig,
  setFondoConveniosEnabled,
  type FondoConvenioConfig,
} from '@/lib/actions/convenios';
import { FileText } from 'lucide-react';

export default function ConfiguracionConveniosPage() {
  const [fondos, setFondos] = useState<FondoConvenioConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getFondosConveniosConfig();
    if (!res.success) {
      setError(res.error || 'Error al cargar fondos');
      setFondos([]);
    } else {
      setFondos(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (fondo: FondoConvenioConfig, enabled: boolean) => {
    setTogglingId(fondo.id);
    setError(null);
    setFondos((prev) =>
      prev.map((f) =>
        f.id === fondo.id ? { ...f, conveniosEnabled: enabled } : f
      )
    );
    const res = await setFondoConveniosEnabled(fondo.id, enabled);
    if (!res.success) {
      setError(res.error || 'No se pudo actualizar');
      setFondos((prev) =>
        prev.map((f) =>
          f.id === fondo.id ? { ...f, conveniosEnabled: !enabled } : f
        )
      );
    }
    setTogglingId(null);
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto custom-scrollbar pt-4 pb-8">
      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Convenios</h2>
          <p className="mt-1 text-[13px] text-gray-500 leading-relaxed">
            Solo los proyectos de fondos en On verán el tab Convenio y aparecerán
            en Dashboard → Convenios. La plantilla bruta es global (
            <span className="font-medium text-gray-700">Convenio_2026.docx</span>
            ).
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50/70 px-4 py-3">
          <FileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-[13px] text-gray-600 leading-relaxed">
            El archivo firmado se guarda por proyecto en la carpeta{' '}
            <code className="text-[12px] bg-white border border-gray-200 px-1 rounded">
              convenios
            </code>{' '}
            de Cloudinary. Al reemplazar se pierde el anterior.
          </p>
        </div>

        {loading ? (
          <div className="py-10 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto mb-3" />
            <p className="text-[13px] text-gray-500">Cargando fondos…</p>
          </div>
        ) : fondos.length === 0 ? (
          <p className="text-[13px] text-gray-500">
            No hay fondos en el catálogo. Créalos en Validación de datos → Fondos.
          </p>
        ) : (
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                  <TableHead className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">
                    Fondo
                  </TableHead>
                  <TableHead className="text-[12px] font-medium text-gray-500 uppercase tracking-wide w-[140px] text-right">
                    Convenios
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fondos.map((fondo) => (
                  <TableRow key={fondo.id} className="hover:bg-gray-50/50">
                    <TableCell className="text-[13px] text-gray-800 font-medium">
                      {fondo.nombre}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <span
                          className={`text-[12px] ${
                            fondo.conveniosEnabled
                              ? 'text-emerald-700'
                              : 'text-gray-400'
                          }`}
                        >
                          {fondo.conveniosEnabled ? 'On' : 'Off'}
                        </span>
                        <Switch
                          checked={fondo.conveniosEnabled}
                          disabled={togglingId === fondo.id}
                          onCheckedChange={(checked) =>
                            handleToggle(fondo, checked)
                          }
                          aria-label={`Convenios para ${fondo.nombre}`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

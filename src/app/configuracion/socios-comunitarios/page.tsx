'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  createSocioComunitarioAdmin,
  deleteSocioComunitarioAdmin,
  listSociosComunitariosAdmin,
  updateSocioComunitarioAdmin,
  type SocioComunitarioAdminRow,
} from '@/lib/actions/configuracion-socios';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';
import { useQueryClient } from '@tanstack/react-query';
import { catalogosGeneralKey } from '@/lib/query-keys';

type SheetMode = 'add' | 'edit';

export default function ConfiguracionSociosComunitariosPage() {
  const [socios, setSocios] = useState<SocioComunitarioAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>('add');
  const [editId, setEditId] = useState<string | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formNombreContacto, setFormNombreContacto] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formProyectos, setFormProyectos] = useState<
    SocioComunitarioAdminRow['proyectos']
  >([]);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  usePageTopLoader(loading);

  const invalidateSocioCaches = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: catalogosGeneralKey });
    void queryClient.invalidateQueries({ queryKey: ['proyecto'] });
    void queryClient.invalidateQueries({ queryKey: ['proyectos-listado'] });
  }, [queryClient]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listSociosComunitariosAdmin();
    if (!res.success) {
      setError(res.error || 'Error al cargar socios comunitarios');
      setSocios([]);
    } else {
      setSocios(res.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setFormNombre('');
    setFormDescripcion('');
    setFormNombreContacto('');
    setFormEmail('');
    setFormProyectos([]);
    setEditId(null);
  };

  const openAdd = () => {
    setSheetMode('add');
    resetForm();
    setSheetOpen(true);
    setError(null);
  };

  const openEdit = (row: SocioComunitarioAdminRow) => {
    setSheetMode('edit');
    setEditId(row.id);
    setFormNombre(row.nombre);
    setFormDescripcion(row.descripcion ?? '');
    setFormNombreContacto(row.nombreContacto ?? '');
    setFormEmail(row.email ?? '');
    setFormProyectos(row.proyectos);
    setSheetOpen(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!formNombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      nombre: formNombre,
      descripcion: formDescripcion,
      nombreContacto: formNombreContacto,
      email: formEmail,
    };
    const res =
      sheetMode === 'add'
        ? await createSocioComunitarioAdmin(payload)
        : editId
          ? await updateSocioComunitarioAdmin(editId, payload)
          : { success: false, error: 'Socio no especificado' };
    setSaving(false);
    if (res.success) {
      setSheetOpen(false);
      invalidateSocioCaches();
      void load();
    } else {
      setError(res.error ?? 'Error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este socio comunitario?')) return;
    setError(null);
    const res = await deleteSocioComunitarioAdmin(id);
    if (res.success) {
      invalidateSocioCaches();
      void load();
    } else setError(res.error ?? 'Error');
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto custom-scrollbar pt-4 pb-8">
      <div className="max-w-5xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Socios comunitarios
            </h2>
            <p className="mt-1 text-[13px] text-gray-500 leading-relaxed">
              Catálogo global de socios. Se asocian a proyectos y a
              beneficiarios. Puedes completar contacto y email aquí; desde un
              proyecto solo se crea el nombre.
            </p>
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Agregar socio
          </Button>
        </div>

        {error && (
          <p className="text-[13px] text-red-600" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <div className="py-10" />
        ) : socios.length === 0 ? (
          <p className="text-[13px] text-gray-500">
            No hay socios comunitarios registrados.
          </p>
        ) : (
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                  <TableHead className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">
                    Nombre
                  </TableHead>
                  <TableHead className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">
                    Contacto
                  </TableHead>
                  <TableHead className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">
                    Email
                  </TableHead>
                  <TableHead className="text-[12px] font-medium text-gray-500 uppercase tracking-wide w-[110px]">
                    Proyectos
                  </TableHead>
                  <TableHead className="text-[12px] font-medium text-gray-500 uppercase tracking-wide w-[120px]">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {socios.map((s) => (
                  <TableRow key={s.id} className="hover:bg-gray-50/50">
                    <TableCell className="text-[13px] text-gray-800 font-medium">
                      {s.nombre}
                    </TableCell>
                    <TableCell className="text-[13px] text-gray-600">
                      {s.nombreContacto || '—'}
                    </TableCell>
                    <TableCell className="text-[13px] text-gray-600">
                      {s.email || '—'}
                    </TableCell>
                    <TableCell className="text-[13px] text-gray-600">
                      {s.proyectos.length}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(s)}
                        aria-label={`Editar ${s.nombre}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(s.id)}
                        aria-label={`Eliminar ${s.nombre}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {sheetMode === 'add' ? 'Agregar socio comunitario' : 'Editar socio comunitario'}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            {error && (
              <p className="text-[13px] text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="socio-nombre">Nombre</Label>
              <Input
                id="socio-nombre"
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                placeholder="Nombre del socio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="socio-descripcion">Descripción (opcional)</Label>
              <Textarea
                id="socio-descripcion"
                value={formDescripcion}
                onChange={(e) => setFormDescripcion(e.target.value)}
                placeholder="Descripción"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="socio-contacto">Nombre de contacto</Label>
              <Input
                id="socio-contacto"
                value={formNombreContacto}
                onChange={(e) => setFormNombreContacto(e.target.value)}
                placeholder="Persona de contacto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="socio-email">Email</Label>
              <Input
                id="socio-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="contacto@ejemplo.cl"
              />
            </div>
            {sheetMode === 'edit' && (
              <div className="space-y-2">
                <Label>Proyectos asociados</Label>
                {formProyectos.length === 0 ? (
                  <p className="text-[13px] text-gray-500">
                    Este socio no está asociado a ningún proyecto.
                  </p>
                ) : (
                  <ul className="space-y-1.5 rounded-md border border-gray-200 bg-gray-50/60 px-3 py-2">
                    {formProyectos.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/proyectos?id=${p.id}`}
                          className="text-[13px] text-emerald-700 hover:underline"
                        >
                          {p.proyecto || 'Sin nombre'}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

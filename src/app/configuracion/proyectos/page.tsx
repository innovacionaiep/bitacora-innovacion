'use client';

import { useEffect, useRef, useState } from 'react';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  listProyectosConfig,
  deleteProyectoConfig,
  updateProyectoFondoConfig,
  type ProyectoListRow,
} from '@/lib/actions/configuracion-proyectos';
import { getFondos } from '@/lib/actions/configuracion';
import { verifyConfigUnlock } from '@/lib/actions/configuracion-usuarios';
import { Lock, Unlock, Trash2 } from 'lucide-react';

function formatDate(d: Date): string {
  return new Date(d).toLocaleString('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function ConfiguracionProyectosPage() {
  const [proyectos, setProyectos] = useState<ProyectoListRow[]>([]);
  const [fondos, setFondos] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProyectoListRow | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingFondoId, setUpdatingFondoId] = useState<string | null>(null);
  const unlockPasswordRef = useRef<string | null>(null);
  const pageRootRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const tableHeaderRef = useRef<HTMLTableSectionElement>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const [res, fondosList] = await Promise.all([
      listProyectosConfig(),
      getFondos(),
    ]);
    if (res.success && res.data) {
      setProyectos(res.data);
    } else {
      setError(res.error ?? 'Error al cargar proyectos');
    }
    setFondos(fondosList ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleUnlock = async () => {
    setUnlockError(null);
    const res = await verifyConfigUnlock(unlockPassword);
    if (res.success) {
      unlockPasswordRef.current = unlockPassword;
      setUnlocked(true);
      setUnlockOpen(false);
      setUnlockPassword('');
    } else {
      setUnlockError(res.error ?? 'Contraseña incorrecta');
    }
  };

  const openDeleteConfirm = (p: ProyectoListRow) => {
    setDeleteTarget(p);
    setDeletePassword(unlockPasswordRef.current ?? '');
    setDeleteError(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await deleteProyectoConfig(deleteTarget.id, deletePassword);
    if (res.success) {
      setProyectos((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeletePassword('');
    } else {
      setDeleteError(res.error ?? 'Error al eliminar');
    }
    setDeleting(false);
  };

  const handleFondoChange = async (proyectoId: string, fondo: string) => {
    const prev = proyectos.find((p) => p.id === proyectoId)?.fondo;
    if (prev === fondo) return;
    setUpdatingFondoId(proyectoId);
    setProyectos((rows) =>
      rows.map((p) => (p.id === proyectoId ? { ...p, fondo } : p))
    );
    const res = await updateProyectoFondoConfig(proyectoId, fondo);
    if (!res.success) {
      setProyectos((rows) =>
        rows.map((p) =>
          p.id === proyectoId ? { ...p, fondo: prev ?? '' } : p
        )
      );
      setError(res.error ?? 'Error al actualizar el fondo');
    }
    setUpdatingFondoId(null);
  };

  return (
    <div ref={pageRootRef} className="h-full flex flex-col min-h-0 gap-6">
      <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-0">
        <div className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Proyectos</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Listado de proyectos registrados. Puedes asignar el fondo desde el
              catálogo de validación. Desbloquea con la contraseña de
              administración para poder eliminar proyectos y todo su contenido.
            </p>
          </div>
          <div className="flex gap-2">
            {unlocked ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  unlockPasswordRef.current = null;
                  setUnlocked(false);
                }}
                className="flex items-center gap-2"
              >
                <Lock className="h-4 w-4" />
                Bloquear
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUnlockOpen(true);
                  setUnlockError(null);
                  setUnlockPassword('');
                }}
                className="flex items-center gap-2"
              >
                <Unlock className="h-4 w-4" />
                Desbloquear
              </Button>
            )}
          </div>
        </div>
      </div>
      <div
        ref={scrollAreaRef}
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
      >
        {error && (
          <p className="text-sm text-red-600 mb-4 px-6 pt-4">{error}</p>
        )}
        {loading ? (
          <p className="text-muted-foreground px-6 pt-4">Cargando...</p>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col px-6 pt-0 pb-6">
            <div className="rounded-t-md border border-b-0 overflow-hidden flex-shrink-0">
              <Table className="table-fixed w-full">
                <colgroup>
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '16%' }} />
                  {unlocked && <col style={{ width: '10%' }} />}
                </colgroup>
                <TableHeader ref={tableHeaderRef}>
                  <TableRow className="[&_th]:bg-muted/50 [&_th]:border-b [&_th]:font-medium [&_th]:text-muted-foreground [&_th]:h-10 [&_th]:px-2 [&_th]:text-left [&_th]:align-middle">
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Fondo</TableHead>
                    <TableHead>Sede</TableHead>
                    <TableHead>Participantes</TableHead>
                    <TableHead>Creado</TableHead>
                    {unlocked && <TableHead>Eliminar</TableHead>}
                  </TableRow>
                </TableHeader>
              </Table>
            </div>
            <div className="flex-1 min-h-0 overflow-auto rounded-b-md border">
              <Table className="table-fixed w-full">
                <colgroup>
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '16%' }} />
                  {unlocked && <col style={{ width: '10%' }} />}
                </colgroup>
                <TableBody>
                  {proyectos.map((p) => {
                    const fondoEnCatalogo = fondos.some(
                      (f) => f.nombre === p.fondo
                    );
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.proyecto}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={p.fondo || undefined}
                            onValueChange={(value) =>
                              handleFondoChange(p.id, value)
                            }
                            disabled={
                              updatingFondoId === p.id || fondos.length === 0
                            }
                          >
                            <SelectTrigger className="h-8 w-full max-w-[180px]">
                              <SelectValue
                                placeholder={
                                  fondos.length === 0
                                    ? 'Sin fondos en catálogo'
                                    : 'Seleccionar fondo'
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {!fondoEnCatalogo && p.fondo ? (
                                <SelectItem value={p.fondo}>
                                  {p.fondo} (actual)
                                </SelectItem>
                              ) : null}
                              {fondos.map((f) => (
                                <SelectItem key={f.id} value={f.nombre}>
                                  {f.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.sede}
                        </TableCell>
                        <TableCell>{p.participantes}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(p.createdAt)}
                        </TableCell>
                        {unlocked && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteConfirm(p)}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Eliminar
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Dialog Desbloquear */}
      <Dialog open={unlockOpen} onOpenChange={setUnlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desbloquear eliminación de proyectos</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ingresa la contraseña de administración (bitacora) para poder
            eliminar proyectos y todo su contenido asociado.
          </p>
          <div className="space-y-2">
            <Label>Contraseña</Label>
            <Input
              type="password"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              placeholder="Contraseña"
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            />
            {unlockError && (
              <p className="text-sm text-red-600">{unlockError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUnlock}>Desbloquear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar eliminar */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar este proyecto?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se eliminará el proyecto &quot;{deleteTarget?.proyecto}&quot; y todo
            su contenido: actividades, indicadores, presupuesto, participantes,
            reuniones, etc. Esta acción no se puede deshacer. Vuelve a ingresar
            la contraseña de administración para confirmar.
          </p>
          <div className="space-y-2 py-2">
            <Label>Contraseña</Label>
            <Input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Contraseña (bitacora)"
            />
            {deleteError && (
              <p className="text-sm text-red-600">{deleteError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Eliminando...' : 'Eliminar proyecto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

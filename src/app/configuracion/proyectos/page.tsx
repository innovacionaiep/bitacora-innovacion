'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  MultiSelectNombres,
  MULTI_VALUE_SEP,
} from '@/components/ui/multi-select-nombres';
import {
  listProyectosConfig,
  deleteProyectoConfig,
  updateProyectoCamposConfig,
  type ProyectoListRow,
  type ProyectoCamposConfigUpdate,
} from '@/lib/actions/configuracion-proyectos';
import {
  getFondos,
  getLineas,
  getSedes,
  getEscuelas,
} from '@/lib/actions/configuracion';
import { verifyConfigUnlock } from '@/lib/actions/configuracion-usuarios';
import { Lock, Unlock, Trash2 } from 'lucide-react';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';

const SIN_LINEA = '__sin_linea__';

function formatDate(d: Date): string {
  return new Date(d).toLocaleString('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/** Parsea sede almacenada (coma o pipe) al formato MultiSelectNombres. */
function sedeToMultiValue(sede: string): string {
  return (sede ?? '')
    .split(/\s*\|\s*|\s*,\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(MULTI_VALUE_SEP);
}

function escuelasToMultiValue(
  escuelas: { nombre: string }[]
): string {
  return escuelas.map((e) => e.nombre).join(MULTI_VALUE_SEP);
}

function parseMultiNames(value: string): string[] {
  return value
    .split(MULTI_VALUE_SEP)
    .map((s) => s.trim())
    .filter(Boolean);
}

function mapNamesToIds(
  names: string[],
  catalogo: { id: string; nombre: string }[]
): string[] {
  const map = new Map(
    catalogo.map((item) => [item.nombre.toLowerCase(), item.id])
  );
  return names
    .map((n) => map.get(n.toLowerCase()))
    .filter((id): id is string => Boolean(id));
}

type LineaCatalog = {
  id: string;
  nombre: string;
  fondoId: string;
  fondo: { id: string; nombre: string };
};

export default function ConfiguracionProyectosPage() {
  const [proyectos, setProyectos] = useState<ProyectoListRow[]>([]);
  const [fondos, setFondos] = useState<{ id: string; nombre: string }[]>([]);
  const [lineas, setLineas] = useState<LineaCatalog[]>([]);
  const [sedes, setSedes] = useState<{ id: string; nombre: string }[]>([]);
  const [escuelas, setEscuelas] = useState<{ id: string; nombre: string }[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  usePageTopLoader(loading);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProyectoListRow | null>(
    null
  );
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [nombreDrafts, setNombreDrafts] = useState<Record<string, string>>(
    {}
  );
  const unlockPasswordRef = useRef<string | null>(null);
  const saveSeqRef = useRef(0);
  const proyectosRef = useRef<ProyectoListRow[]>([]);
  const multiSaveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const pageRootRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const tableHeaderRef = useRef<HTMLTableSectionElement>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const [res, fondosList, lineasList, sedesList, escuelasList] =
      await Promise.all([
        listProyectosConfig(),
        getFondos(),
        getLineas(),
        getSedes(),
        getEscuelas(),
      ]);
    if (res.success && res.data) {
      setProyectos(res.data);
      proyectosRef.current = res.data;
      setNombreDrafts(
        Object.fromEntries(res.data.map((p) => [p.id, p.proyecto]))
      );
    } else {
      setError(res.error ?? 'Error al cargar proyectos');
    }
    setFondos(fondosList ?? []);
    setLineas((lineasList as LineaCatalog[]) ?? []);
    setSedes(sedesList ?? []);
    setEscuelas(escuelasList ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    return () => {
      Object.values(multiSaveTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  const lineasByFondoNombre = useMemo(() => {
    const map = new Map<string, LineaCatalog[]>();
    for (const linea of lineas) {
      const key = linea.fondo.nombre;
      const list = map.get(key) ?? [];
      list.push(linea);
      map.set(key, list);
    }
    return map;
  }, [lineas]);

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
      setProyectos((prev) => {
        const next = prev.filter((x) => x.id !== deleteTarget.id);
        proyectosRef.current = next;
        return next;
      });
      setDeleteTarget(null);
      setDeletePassword('');
    } else {
      setDeleteError(res.error ?? 'Error al eliminar');
    }
    setDeleting(false);
  };

  const applyOptimistic = (
    proyectoId: string,
    patch: Partial<ProyectoListRow>
  ) => {
    setProyectos((rows) => {
      const next = rows.map((p) =>
        p.id === proyectoId ? { ...p, ...patch } : p
      );
      proyectosRef.current = next;
      return next;
    });
  };

  const saveCampos = async (
    proyectoId: string,
    campos: ProyectoCamposConfigUpdate,
    optimistic: Partial<ProyectoListRow>,
    rollback: ProyectoListRow
  ) => {
    const seq = ++saveSeqRef.current;
    setUpdatingId(proyectoId);
    applyOptimistic(proyectoId, optimistic);
    if (optimistic.proyecto !== undefined) {
      setNombreDrafts((d) => ({ ...d, [proyectoId]: optimistic.proyecto! }));
    }
    const res = await updateProyectoCamposConfig(proyectoId, campos);
    // Ignorar respuestas obsoletas (p. ej. toggles rápidos en multi-select)
    if (seq !== saveSeqRef.current) return;
    if (!res.success) {
      setProyectos((rows) => {
        const next = rows.map((p) => (p.id === proyectoId ? rollback : p));
        proyectosRef.current = next;
        return next;
      });
      setNombreDrafts((d) => ({ ...d, [proyectoId]: rollback.proyecto }));
      setError(res.error ?? 'Error al actualizar el proyecto');
    } else if (campos.fondo !== undefined) {
      // Tras cambio de fondo, alinear línea en UI si el server la limpió
      const lineasDelFondo =
        lineasByFondoNombre.get(campos.fondo.trim()) ?? [];
      const lineaActual =
        optimistic.linea !== undefined
          ? optimistic.linea
          : rollback.linea;
      if (
        lineaActual &&
        !lineasDelFondo.some((l) => l.nombre === lineaActual)
      ) {
        applyOptimistic(proyectoId, { linea: null });
      }
    }
    setUpdatingId(null);
  };

  const handleNombreSave = async (proyectoId: string) => {
    const row = proyectos.find((p) => p.id === proyectoId);
    if (!row) return;
    const next = (nombreDrafts[proyectoId] ?? row.proyecto).trim();
    if (!next || next === row.proyecto) {
      setNombreDrafts((d) => ({ ...d, [proyectoId]: row.proyecto }));
      return;
    }
    await saveCampos(
      proyectoId,
      { proyecto: next },
      { proyecto: next },
      row
    );
  };

  const handleFondoChange = async (proyectoId: string, fondo: string) => {
    const row = proyectos.find((p) => p.id === proyectoId);
    if (!row || row.fondo === fondo) return;
    const lineasDelFondo = lineasByFondoNombre.get(fondo) ?? [];
    const lineaOk =
      row.linea && lineasDelFondo.some((l) => l.nombre === row.linea)
        ? row.linea
        : null;
    await saveCampos(
      proyectoId,
      { fondo, linea: lineaOk },
      { fondo, linea: lineaOk },
      row
    );
  };

  const handleLineaChange = async (proyectoId: string, value: string) => {
    const row = proyectos.find((p) => p.id === proyectoId);
    if (!row) return;
    const linea = value === SIN_LINEA ? null : value;
    if ((row.linea ?? null) === linea) return;
    await saveCampos(proyectoId, { linea }, { linea }, row);
  };

  const handleSedesChange = (proyectoId: string, value: string) => {
    const row = proyectosRef.current.find((p) => p.id === proyectoId);
    if (!row) return;
    const current = sedeToMultiValue(row.sede);
    if (current === value) return;
    const prevSede = row.sede;
    const sede = parseMultiNames(value).join(', ');
    applyOptimistic(proyectoId, { sede });
    const key = `${proyectoId}:sede`;
    clearTimeout(multiSaveTimersRef.current[key]);
    multiSaveTimersRef.current[key] = setTimeout(() => {
      const rollbackBase =
        proyectosRef.current.find((p) => p.id === proyectoId) ?? row;
      void saveCampos(
        proyectoId,
        { sede },
        { sede },
        { ...rollbackBase, sede: prevSede }
      );
    }, 400);
  };

  const handleEscuelasChange = (proyectoId: string, value: string) => {
    const row = proyectosRef.current.find((p) => p.id === proyectoId);
    if (!row) return;
    const current = escuelasToMultiValue(row.escuelas);
    if (current === value) return;
    const prevEscuelas = row.escuelas;
    const names = parseMultiNames(value);
    const escuelasIds = mapNamesToIds(names, escuelas);
    const nextEscuelas = names
      .map((nombre) => {
        const found = escuelas.find(
          (e) => e.nombre.toLowerCase() === nombre.toLowerCase()
        );
        return found ? { id: found.id, nombre: found.nombre } : null;
      })
      .filter((e): e is { id: string; nombre: string } => Boolean(e));
    applyOptimistic(proyectoId, { escuelas: nextEscuelas });
    const key = `${proyectoId}:escuelas`;
    clearTimeout(multiSaveTimersRef.current[key]);
    multiSaveTimersRef.current[key] = setTimeout(() => {
      const rollbackBase =
        proyectosRef.current.find((p) => p.id === proyectoId) ?? row;
      void saveCampos(
        proyectoId,
        { escuelasIds },
        { escuelas: nextEscuelas },
        { ...rollbackBase, escuelas: prevEscuelas }
      );
    }, 400);
  };

  const colCount = unlocked ? 8 : 7;

  return (
    <div ref={pageRootRef} className="h-full flex flex-col min-h-0 gap-6">
      <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-0">
        <div className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Proyectos</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Listado de proyectos registrados. Puedes editar nombre, fondo,
              línea, sedes y escuelas. Desbloquea con la contraseña de
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
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '11%' }} />
                  {unlocked && <col style={{ width: '8%' }} />}
                </colgroup>
                <TableHeader ref={tableHeaderRef}>
                  <TableRow className="[&_th]:bg-muted/50 [&_th]:border-b [&_th]:font-medium [&_th]:text-muted-foreground [&_th]:h-10 [&_th]:px-2 [&_th]:text-left [&_th]:align-middle">
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Fondo</TableHead>
                    <TableHead>Línea</TableHead>
                    <TableHead>Sedes</TableHead>
                    <TableHead>Escuelas</TableHead>
                    <TableHead>Participantes</TableHead>
                    <TableHead>Fecha de creación</TableHead>
                    {unlocked && <TableHead>Eliminar</TableHead>}
                  </TableRow>
                </TableHeader>
              </Table>
            </div>
            <div className="flex-1 min-h-0 overflow-auto rounded-b-md border">
              <Table className="table-fixed w-full">
                <colgroup>
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '11%' }} />
                  {unlocked && <col style={{ width: '8%' }} />}
                </colgroup>
                <TableBody>
                  {proyectos.map((p) => {
                    const fondoEnCatalogo = fondos.some(
                      (f) => f.nombre === p.fondo
                    );
                    const lineasDelFondo =
                      lineasByFondoNombre.get(p.fondo) ?? [];
                    const lineaEnCatalogo = lineasDelFondo.some(
                      (l) => l.nombre === p.linea
                    );
                    const busy = updatingId === p.id;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="align-top py-2">
                          <Input
                            className="h-8 text-sm font-medium"
                            value={nombreDrafts[p.id] ?? p.proyecto}
                            disabled={busy}
                            onChange={(e) =>
                              setNombreDrafts((d) => ({
                                ...d,
                                [p.id]: e.target.value,
                              }))
                            }
                            onBlur={() => handleNombreSave(p.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="align-top py-2">
                          <Select
                            value={p.fondo || undefined}
                            onValueChange={(value) =>
                              handleFondoChange(p.id, value)
                            }
                            disabled={busy || fondos.length === 0}
                          >
                            <SelectTrigger className="h-8 w-full">
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
                        <TableCell className="align-top py-2">
                          <Select
                            value={p.linea || SIN_LINEA}
                            onValueChange={(value) =>
                              handleLineaChange(p.id, value)
                            }
                            disabled={busy}
                          >
                            <SelectTrigger className="h-8 w-full">
                              <SelectValue placeholder="Sin línea" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={SIN_LINEA}>
                                Sin línea
                              </SelectItem>
                              {p.linea && !lineaEnCatalogo ? (
                                <SelectItem value={p.linea}>
                                  {p.linea} (actual)
                                </SelectItem>
                              ) : null}
                              {lineasDelFondo.map((l) => (
                                <SelectItem key={l.id} value={l.nombre}>
                                  {l.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="align-top py-2">
                          <MultiSelectNombres
                            options={sedes}
                            value={sedeToMultiValue(p.sede)}
                            onChange={(v) => handleSedesChange(p.id, v)}
                            placeholder="Seleccionar sedes"
                            triggerClassName="h-8 min-h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell className="align-top py-2">
                          <MultiSelectNombres
                            options={escuelas}
                            value={escuelasToMultiValue(p.escuelas)}
                            onChange={(v) => handleEscuelasChange(p.id, v)}
                            placeholder="Seleccionar escuelas"
                            triggerClassName="h-8 min-h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell className="align-top py-2">
                          {p.participantes.length === 0 ? (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          ) : (
                            <ul className="space-y-0.5 text-sm break-words">
                              {p.participantes.map((part, idx) => (
                                <li
                                  key={`${p.id}-${part.nombre}-${part.rol}-${idx}`}
                                  className="text-muted-foreground"
                                >
                                  <span className="text-foreground font-medium">
                                    {part.nombre}
                                  </span>
                                  {' · '}
                                  {part.rol}
                                </li>
                              ))}
                            </ul>
                          )}
                        </TableCell>
                        <TableCell className="align-top py-2 text-muted-foreground text-sm">
                          {formatDate(p.createdAt)}
                        </TableCell>
                        {unlocked && (
                          <TableCell className="align-top py-2">
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
                  {proyectos.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={colCount}
                        className="text-center text-muted-foreground py-8"
                      >
                        No hay proyectos registrados.
                      </TableCell>
                    </TableRow>
                  )}
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
            Ingresa la contraseña de administración configurada en el servidor
            para poder
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
              placeholder="Contraseña de desbloqueo"
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

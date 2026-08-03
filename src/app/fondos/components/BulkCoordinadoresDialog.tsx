'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Plus, X } from 'lucide-react';
import {
  listUsersByAppRole,
  type UserByRoleOption,
} from '@/lib/actions/usuarios';
import {
  confirmBulkCoordinadoresFondo,
  previewBulkCoordinadoresFondo,
  type BulkCoordinadorPreviewRow,
  type FondoCoordinadorResumen,
} from '@/lib/actions/operaciones-fondo';
import { cn } from '@/lib/utils';

const CHUNK_SIZE = 25;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fondoNombre: string;
  /** Cobertura actual de coordinadores en el fondo (para destacar masivos). */
  fondoCoordinadores?: FondoCoordinadorResumen[];
  onSuccess?: () => void;
};

type Step = 'form' | 'preview' | 'done';

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function BulkCoordinadoresDialog({
  open,
  onOpenChange,
  fondoNombre,
  fondoCoordinadores = [],
  onSuccess,
}: Props) {
  const [step, setStep] = useState<Step>('form');
  const [users, setUsers] = useState<UserByRoleOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<BulkCoordinadorPreviewRow[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addNombre, setAddNombre] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRut, setAddRut] = useState('');
  const [addCargo, setAddCargo] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const resetAddForm = useCallback(() => {
    setShowAddForm(false);
    setAddNombre('');
    setAddEmail('');
    setAddRut('');
    setAddCargo('');
    setAddError(null);
  }, []);

  const resetWizard = useCallback(() => {
    setStep('form');
    setSelectedEmails(new Set());
    setRows([]);
    setLoadingPreview(false);
    setConfirming(false);
    setProgress(0);
    setError(null);
    setDoneMessage(null);
    resetAddForm();
  }, [resetAddForm]);

  const handleOpenChange = (next: boolean) => {
    if (!next) resetWizard();
    onOpenChange(next);
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingUsers(true);
    listUsersByAppRole('Coordinador').then((res) => {
      if (cancelled) return;
      setUsers(res.success ? (res.data ?? []) : []);
      setLoadingUsers(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const addCoordinatorToList = () => {
    const email = normEmail(addEmail);
    const nombre = addNombre.trim();
    if (!email || !email.includes('@')) {
      setAddError('Ingresa un correo válido');
      return;
    }
    if (!nombre) {
      setAddError('Ingresa el nombre');
      return;
    }

    const existing = users.find((u) => normEmail(u.email) === email);
    if (existing) {
      setSelectedEmails((prev) => new Set(prev).add(existing.email));
      resetAddForm();
      setError(null);
      return;
    }

    const entry: UserByRoleOption = {
      id: `manual:${email}`,
      name: nombre,
      email,
      rut: addRut.trim() || null,
      cargo: addCargo.trim() || null,
      sedeId: null,
      escuelaId: null,
      sedeNombre: null,
      escuelaNombre: null,
      hasAccount: false,
    };
    setUsers((prev) =>
      [...prev, entry].sort((a, b) =>
        (a.name || a.email).localeCompare(b.name || b.email, 'es')
      )
    );
    setSelectedEmails((prev) => new Set(prev).add(email));
    resetAddForm();
    setError(null);
  };

  const removeManualCoordinator = (id: string, email: string) => {
    if (!id.startsWith('manual:')) return;
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      next.delete(email);
      return next;
    });
  };

  const coverageByEmail = useMemo(() => {
    const map = new Map<string, FondoCoordinadorResumen>();
    for (const c of fondoCoordinadores) {
      map.set(normEmail(c.email), c);
    }
    return map;
  }, [fondoCoordinadores]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const ca = coverageByEmail.get(normEmail(a.email));
      const cb = coverageByEmail.get(normEmail(b.email));
      const aTodos = ca?.enTodos ? 1 : 0;
      const bTodos = cb?.enTodos ? 1 : 0;
      if (aTodos !== bTodos) return bTodos - aTodos;
      const aCount = ca?.proyectoCount ?? 0;
      const bCount = cb?.proyectoCount ?? 0;
      if (aCount !== bCount) return bCount - aCount;
      return (a.name || a.email).localeCompare(b.name || b.email, 'es');
    });
  }, [users, coverageByEmail]);

  const selectedCoords = useMemo(
    () =>
      users
        .filter((u) => selectedEmails.has(u.email))
        .map((u) => ({
          nombre: u.name?.trim() || u.email,
          email: u.email,
          rut: u.rut,
          cargo: u.cargo,
          sedeId: u.sedeId,
          escuelaId: u.escuelaId,
        })),
    [users, selectedEmails]
  );

  const createRows = useMemo(
    () => rows.filter((r) => r.action === 'crear'),
    [rows]
  );
  const skipRows = useMemo(
    () => rows.filter((r) => r.action === 'omitir'),
    [rows]
  );

  const runPreview = async () => {
    if (selectedCoords.length === 0) {
      setError('Selecciona al menos un coordinador');
      return;
    }
    setLoadingPreview(true);
    setError(null);
    try {
      const result = await previewBulkCoordinadoresFondo({
        fondoNombre,
        coordinadores: selectedCoords,
      });
      if (!result.success) {
        setError(result.error ?? 'Error al preparar la vista previa');
        return;
      }
      setRows(result.rows ?? []);
      setStep('preview');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Error al preparar la vista previa'
      );
    } finally {
      setLoadingPreview(false);
    }
  };

  const runConfirm = async () => {
    const toCreate = createRows.map((r) => ({
      proyectoId: r.proyectoId,
      nombre: r.nombre,
      email: r.email,
      rut: r.rut,
      cargo: r.cargo,
      sedeId: r.sedeId,
      escuelaId: r.escuelaId,
    }));
    if (toCreate.length === 0) {
      setDoneMessage(
        `Nada que crear. ${skipRows.length} alta(s) omitida(s) (ya existían).`
      );
      setStep('done');
      return;
    }

    setConfirming(true);
    setError(null);
    setProgress(0);

    let createdTotal = 0;
    let skippedTotal = 0;
    const allErrors: string[] = [];

    try {
      for (let offset = 0; offset < toCreate.length; offset += CHUNK_SIZE) {
        const chunk = toCreate.slice(offset, offset + CHUNK_SIZE);
        const result = await confirmBulkCoordinadoresFondo({
          fondoNombre,
          items: chunk,
        });

        createdTotal += result.created ?? 0;
        skippedTotal += result.skipped ?? 0;
        if (result.errors?.length) {
          for (const e of result.errors) {
            allErrors.push(`${e.email}: ${e.error}`);
          }
        }
        if (result.error && !result.created) {
          allErrors.push(result.error);
        }

        setProgress(
          Math.round(((offset + chunk.length) / toCreate.length) * 100)
        );
      }

      const omitPrevias = skipRows.length;
      if (allErrors.length) {
        setError(
          `Creadas ${createdTotal}. Errores: ${allErrors.slice(0, 5).join('; ')}${allErrors.length > 5 ? '…' : ''}`
        );
      } else {
        setDoneMessage(
          `Se agregaron ${createdTotal} coordinador(es). Omitidas ${omitPrevias + skippedTotal} (ya existían).`
        );
        setStep('done');
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[15px]">
            Coordinadores masivos — {fondoNombre}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <div className="flex flex-col gap-3 py-1">
            <p className="text-[13px] text-gray-600">
              Selecciona uno o más coordinadores. Se agregarán a todos los
              proyectos del fondo; si ya existen en un proyecto, se omiten. Quienes
              ya están en todos los proyectos aparecen destacados.
            </p>
            {loadingUsers ? (
              <div className="flex items-center gap-2 text-[13px] text-gray-500 py-6 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando coordinadores…
              </div>
            ) : users.length === 0 && !showAddForm ? (
              <p className="text-[13px] text-amber-700 py-2">
                No hay usuarios con rol Coordinador. Puedes agregar uno abajo.
              </p>
            ) : users.length > 0 ? (
              <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-md divide-y divide-gray-50">
                {sortedUsers.map((u) => {
                  const checked = selectedEmails.has(u.email);
                  const isManual = u.id.startsWith('manual:');
                  const coverage = coverageByEmail.get(normEmail(u.email));
                  const enTodos = coverage?.enTodos ?? false;
                  const parcial =
                    coverage && !enTodos && coverage.proyectoCount > 0
                      ? coverage
                      : null;
                  return (
                    <div
                      key={u.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50/80',
                        enTodos && 'bg-emerald-50/70 border-l-2 border-l-emerald-500',
                        !enTodos && checked && 'bg-emerald-50/40'
                      )}
                    >
                      <label className="flex min-w-0 flex-1 items-center gap-3 cursor-pointer">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleEmail(u.email)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] text-gray-800 font-medium truncate">
                            {u.name || u.email}
                            {enTodos ? (
                              <span className="ml-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-800">
                                Ya en todos
                              </span>
                            ) : isManual ? (
                              <span className="ml-1.5 text-[11px] font-normal text-blue-700">
                                nuevo
                              </span>
                            ) : !u.hasAccount ? (
                              <span className="ml-1.5 text-[11px] font-normal text-amber-700">
                                sin cuenta
                              </span>
                            ) : null}
                          </span>
                          {u.name ? (
                            <span className="block text-[12px] text-gray-500 truncate">
                              {u.email}
                            </span>
                          ) : null}
                          <span className="block text-[11px] text-gray-500 mt-0.5 truncate">
                            {parcial
                              ? `En ${parcial.proyectoCount}/${parcial.totalProyectos} proyectos · `
                              : enTodos
                                ? `${coverage!.proyectoCount}/${coverage!.totalProyectos} proyectos · `
                                : ''}
                            {[
                              u.rut ? `RUT ${u.rut}` : null,
                              u.cargo,
                              u.sedeNombre,
                              u.escuelaNombre,
                            ]
                              .filter(Boolean)
                              .join(' · ') ||
                              (parcial || enTodos
                                ? ''
                                : 'Sin RUT / cargo / sede / escuela')}
                          </span>
                        </span>
                      </label>
                      {isManual ? (
                        <button
                          type="button"
                          className="shrink-0 p-1 text-gray-400 hover:text-gray-700"
                          title="Quitar del listado"
                          onClick={() => removeManualCoordinator(u.id, u.email)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {showAddForm ? (
              <div className="rounded-md border border-gray-200 bg-gray-50/50 p-3 space-y-2.5">
                <p className="text-[12px] font-medium text-gray-700">
                  Nuevo coordinador
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="bulk-coord-nombre" className="text-[12px]">
                      Nombre *
                    </Label>
                    <Input
                      id="bulk-coord-nombre"
                      value={addNombre}
                      onChange={(e) => setAddNombre(e.target.value)}
                      placeholder="Nombre completo"
                      className="h-8 text-[13px] shadow-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bulk-coord-email" className="text-[12px]">
                      Correo *
                    </Label>
                    <Input
                      id="bulk-coord-email"
                      type="email"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      placeholder="correo@ejemplo.cl"
                      className="h-8 text-[13px] shadow-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bulk-coord-rut" className="text-[12px]">
                      RUT
                    </Label>
                    <Input
                      id="bulk-coord-rut"
                      value={addRut}
                      onChange={(e) => setAddRut(e.target.value)}
                      placeholder="Opcional"
                      className="h-8 text-[13px] shadow-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bulk-coord-cargo" className="text-[12px]">
                      Cargo
                    </Label>
                    <Input
                      id="bulk-coord-cargo"
                      value={addCargo}
                      onChange={(e) => setAddCargo(e.target.value)}
                      placeholder="Opcional"
                      className="h-8 text-[13px] shadow-none"
                    />
                  </div>
                </div>
                {addError ? (
                  <p className="text-[12px] text-red-600">{addError}</p>
                ) : null}
                <div className="flex justify-end gap-2 pt-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 text-[12px] shadow-none border-gray-200"
                    onClick={resetAddForm}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    className="h-8 text-[12px] shadow-none"
                    onClick={addCoordinatorToList}
                  >
                    Agregar al listado
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-8 w-full text-[12px] shadow-none border-dashed border-gray-300 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/40"
                onClick={() => {
                  setShowAddForm(true);
                  setAddError(null);
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Agregar coordinador
              </Button>
            )}

            {error ? (
              <p className="text-[13px] text-red-600">{error}</p>
            ) : null}
          </div>
        )}

        {step === 'preview' && (
          <div className="flex flex-col gap-3 py-1">
            <p className="text-[13px] text-gray-700">
              <span className="font-medium text-emerald-700">
                {createRows.length} a crear
              </span>
              {skipRows.length > 0 ? (
                <>
                  {' '}
                  ·{' '}
                  <span className="text-gray-500">
                    {skipRows.length} a omitir
                  </span>
                </>
              ) : null}
            </p>
            <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[12px]">Proyecto</TableHead>
                    <TableHead className="text-[12px]">Coordinador</TableHead>
                    <TableHead className="text-[12px]">Perfil</TableHead>
                    <TableHead className="text-[12px]">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={`${r.proyectoId}-${r.email}-${i}`}>
                      <TableCell className="text-[13px] py-2 max-w-[140px] truncate">
                        {r.proyecto}
                      </TableCell>
                      <TableCell className="text-[13px] py-2 max-w-[120px] truncate">
                        <span className="block truncate">{r.nombre}</span>
                        <span className="block text-[11px] text-gray-500 truncate">
                          {r.email}
                        </span>
                      </TableCell>
                      <TableCell className="text-[11px] py-2 text-gray-500 max-w-[160px]">
                        {[r.rut ? `RUT ${r.rut}` : null, r.cargo]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </TableCell>
                      <TableCell className="text-[13px] py-2">
                        {r.action === 'crear' ? (
                          <span className="text-emerald-700">Crear</span>
                        ) : (
                          <span className="text-gray-500">Omitir</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {confirming ? (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-[12px] text-gray-500">
                  Agregando… {progress}%
                </p>
              </div>
            ) : null}
            {error ? (
              <p className="text-[13px] text-red-600">{error}</p>
            ) : null}
          </div>
        )}

        {step === 'done' && (
          <div className="py-2">
            <p className="text-[13px] text-emerald-700">{doneMessage}</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 'form' && (
            <>
              <Button
                type="button"
                variant="outline"
                className="text-[13px] shadow-none border-gray-200"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="text-[13px] shadow-none"
                disabled={selectedCoords.length === 0 || loadingPreview}
                onClick={runPreview}
              >
                {loadingPreview ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Preparando…
                  </>
                ) : (
                  'Vista previa'
                )}
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button
                type="button"
                variant="outline"
                className="text-[13px] shadow-none border-gray-200"
                disabled={confirming}
                onClick={() => {
                  setError(null);
                  setStep('form');
                }}
              >
                Atrás
              </Button>
              <Button
                type="button"
                className="text-[13px] shadow-none"
                disabled={confirming || rows.length === 0}
                onClick={runConfirm}
              >
                {confirming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Confirmando…
                  </>
                ) : (
                  'Confirmar'
                )}
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button
              type="button"
              className="text-[13px] shadow-none"
              onClick={() => handleOpenChange(false)}
            >
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

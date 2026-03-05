'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
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
  listUsersAdmin,
  listUsersAdminWithPasswords,
  createUserAdmin,
  updateUserAdmin,
  updateUserRolesAdmin,
  updateUserPasswordAdmin,
  deleteUserAdmin,
  type UserListRow,
  type UserListRowWithPassword,
} from '@/lib/actions/configuracion-usuarios';
import { AVAILABLE_ROLES, type Role } from '@/lib/auth-utils';
import {
  MultiSelectOptions,
  MULTI_SELECT_SEP,
} from '@/components/ui/multi-select-options';
import { Lock, Unlock, Pencil, UserPlus, Trash2 } from 'lucide-react';

function formatDate(d: Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

// Colores característicos por rol (ver docs/SISTEMA-ROLES.md)
function getRolTagClasses(rol: string): string {
  const r = rol.toLowerCase();
  switch (r) {
    case 'admin':
      return 'bg-yellow-100 text-yellow-800';
    case 'coordinador':
      return 'bg-blue-100 text-blue-800';
    case 'colaborador':
      return 'bg-violet-100 text-violet-800';
    case 'encargado':
      return 'bg-orange-100 text-orange-800';
    case 'docente':
      return 'bg-green-100 text-green-800';
    case 'estudiante':
      return 'bg-red-100 text-red-800';
    case 'beneficiario':
      return 'bg-cyan-100 text-cyan-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function ConfiguracionUsuariosPage() {
  const { data: session, update: updateSession } = useSession();
  const [users, setUsers] = useState<UserListRowWithPassword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserListRowWithPassword | null>(
    null
  );
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRoles, setEditRoles] = useState<Role[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<Role>('Colaborador');
  const [addSaving, setAddSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserListRowWithPassword | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const unlockPasswordRef = useRef<string | null>(null);
  const pageRootRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const tableHeaderRef = useRef<HTMLTableSectionElement>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await listUsersAdmin();
    if (res.success && res.data) {
      setUsers(res.data.map((r) => ({ ...r, passwordPlain: null })));
    } else setError(res.error ?? 'Error');
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleUnlock = async () => {
    setUnlockError(null);
    const res = await listUsersAdminWithPasswords(unlockPassword);
    if (res.success && res.data) {
      unlockPasswordRef.current = unlockPassword;
      setUsers(res.data);
      setUnlocked(true);
      setUnlockOpen(false);
      setUnlockPassword('');
    } else {
      setUnlockError(res.error ?? 'Contraseña incorrecta');
    }
  };

  const openEdit = (u: UserListRowWithPassword) => {
    setEditUser(u);
    setEditName(u.name ?? '');
    setEditEmail(u.email);
    setEditPassword('');
    setEditRoles(
      u.roles.filter((r): r is Role => AVAILABLE_ROLES.includes(r as Role))
    );
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditSaving(true);
    const res = await updateUserAdmin(editUser.id, {
      name: editName || undefined,
      email: editEmail || undefined,
    });
    if (res.success) {
      const resRoles = await updateUserRolesAdmin(editUser.id, editRoles);
      if (!resRoles.success) {
        setError(resRoles.error ?? 'Error al actualizar roles');
        setEditSaving(false);
        return;
      }
    }
    if (res.success && editPassword.trim() && unlocked) {
      const resPw = await updateUserPasswordAdmin(editUser.id, editPassword);
      if (!resPw.success) {
        setError(resPw.error ?? 'Error al actualizar contraseña');
        setEditSaving(false);
        return;
      }
    }
    if (res.success) {
      const currentUserId = session?.user?.id ?? null;
      const editingSelf = Boolean(currentUserId && editUser.id === currentUserId);
      if (editingSelf) {
        await updateSession({ name: (editName?.trim() || session?.user?.name || '').trim() || undefined });
      }
      setEditUser(null);
      if (unlocked && unlockPasswordRef.current) {
        const resList = await listUsersAdminWithPasswords(
          unlockPasswordRef.current
        );
        if (resList.success && resList.data) setUsers(resList.data);
        else await load();
      } else {
        await load();
      }
    } else {
      setError(res.error ?? 'Error');
    }
    setEditSaving(false);
  };

  const handleAddUser = async () => {
    if (!addName.trim() || !addEmail.trim() || !addPassword.trim()) {
      setError('Nombre, correo y contraseña son obligatorios');
      return;
    }
    setAddSaving(true);
    setError(null);
    const res = await createUserAdmin({
      name: addName.trim(),
      email: addEmail.trim(),
      password: addPassword,
      initialRole: addRole,
    });
    if (res.success) {
      setAddOpen(false);
      setAddName('');
      setAddEmail('');
      setAddPassword('');
      setAddRole('Colaborador');
      if (unlocked && unlockPasswordRef.current) {
        const resList = await listUsersAdminWithPasswords(
          unlockPasswordRef.current
        );
        if (resList.success && resList.data) setUsers(resList.data);
        else await load();
      } else {
        await load();
      }
    } else {
      setError(res.error ?? 'Error');
    }
    setAddSaving(false);
  };

  const openDeleteConfirm = (u: UserListRowWithPassword) => {
    setDeleteTarget(u);
    setDeletePassword(unlockPasswordRef.current ?? '');
    setDeleteError(null);
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await deleteUserAdmin(deleteTarget.id, deletePassword);
    if (res.success) {
      setUsers((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeletePassword('');
      if (editUser?.id === deleteTarget.id) {
        setEditUser(null);
      }
    } else {
      setDeleteError(res.error ?? 'Error al eliminar');
    }
    setDeleting(false);
  };

  return (
    <div ref={pageRootRef} className="h-full flex flex-col min-h-0 gap-6">
      <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-0">
        <div className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Usuarios</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Lista de usuarios, roles y participación en proyectos. Desbloquea
              para editar contraseñas.
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
                  load();
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
            <Button
              size="sm"
              onClick={() => {
                setAddOpen(true);
                setError(null);
              }}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Agregar usuario
            </Button>
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
            {/* Encabezados fuera del scroll: no se mueven */}
            <div className="rounded-t-md border border-b-0 overflow-hidden flex-shrink-0">
              <Table className="table-fixed w-full">
                <colgroup>
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: unlocked ? '38%' : '43%' }} />
                  <col style={{ width: '8%' }} />
                  {unlocked && <col style={{ width: '7%' }} />}
                </colgroup>
                <TableHeader ref={tableHeaderRef}>
                  <TableRow className="[&_th]:bg-muted/50 [&_th]:border-b [&_th]:font-medium [&_th]:text-muted-foreground [&_th]:h-10 [&_th]:px-2 [&_th]:text-left [&_th]:align-middle">
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Contraseña</TableHead>
                    <TableHead>Última actividad</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Proyectos (rol)</TableHead>
                    <TableHead>Editar</TableHead>
                    {unlocked && <TableHead>Eliminar</TableHead>}
                  </TableRow>
                </TableHeader>
              </Table>
            </div>
            {/* Solo el cuerpo de la tabla hace scroll */}
            <div className="flex-1 min-h-0 overflow-auto rounded-b-md border">
              <Table className="table-fixed w-full">
                <colgroup>
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: unlocked ? '38%' : '43%' }} />
                  <col style={{ width: '8%' }} />
                  {unlocked && <col style={{ width: '7%' }} />}
                </colgroup>
                <TableBody>
                  {users.map((u) => {
                    const isEditing = editUser?.id === u.id;
                    return (
                      <TableRow
                        key={u.id}
                        className={isEditing ? 'bg-muted/30' : undefined}
                      >
                        <TableCell className="font-medium">
                          {isEditing ? (
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Nombre"
                              className="h-8 text-sm"
                            />
                          ) : (
                            (u.name ?? '—')
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              placeholder="correo@ejemplo.com"
                              className="h-8 text-sm"
                            />
                          ) : (
                            u.email
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {isEditing && unlocked ? (
                            <Input
                              type="password"
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              placeholder="Dejar vacío para no cambiar"
                              className="h-8 text-sm font-mono"
                            />
                          ) : unlocked ? (
                            (u.passwordPlain ?? '—')
                          ) : (
                            '****'
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(u.lastSessionExpires)}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <MultiSelectOptions
                              options={AVAILABLE_ROLES.map((r) => ({
                                value: r,
                                label: r,
                              }))}
                              value={editRoles.join(` ${MULTI_SELECT_SEP} `)}
                              onChange={(value) =>
                                setEditRoles(
                                  value
                                    .split(MULTI_SELECT_SEP)
                                    .map((s) => s.trim())
                                    .filter(Boolean) as Role[]
                                )
                              }
                              placeholder="Seleccionar roles..."
                              triggerClassName="h-8 text-sm min-h-8"
                            />
                          ) : (
                            <span className="text-sm">
                              {u.roles.length ? u.roles.join(', ') : '—'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="min-w-0">
                          <div className="text-sm text-muted-foreground">
                            {u.proyectos.length ? (
                              <ul className="list-disc list-inside space-y-0.5 my-0 pl-0">
                                {u.proyectos.map((p, i) => (
                                  <li
                                    key={i}
                                    className="flex flex-wrap items-center gap-1"
                                  >
                                    <span>{p.proyectoNombre}</span>
                                    <span
                                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${getRolTagClasses(p.rol)}`}
                                    >
                                      #{p.rol}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              '—'
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditUser(null);
                                  setEditPassword('');
                                  setEditRoles([]);
                                }}
                                disabled={editSaving}
                                className="h-8 px-2"
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSaveEdit}
                                disabled={editSaving}
                                className="h-8 px-2"
                              >
                                {editSaving ? '...' : 'Guardar'}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(u)}
                              className="flex items-center gap-1"
                            >
                              <Pencil className="h-4 w-4" />
                              Editar
                            </Button>
                          )}
                        </TableCell>
                        {unlocked && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteConfirm(u)}
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
            <DialogTitle>Desbloquear edición de contraseñas</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ingresa la contraseña de administración para poder ver y editar
            contraseñas de usuarios.
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

      {/* Sheet Agregar usuario */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Agregar usuario</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Nombre"
              />
            </div>
            <div className="space-y-2">
              <Label>Correo</Label>
              <Input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label>Rol inicial</Label>
              <Select
                value={addRole}
                onValueChange={(v) => setAddRole(v as Role)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddUser} disabled={addSaving}>
              {addSaving ? 'Creando...' : 'Crear usuario'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Dialog Confirmar eliminar usuario */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar este usuario?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se eliminará el usuario &quot;{deleteTarget?.name ?? deleteTarget?.email}&quot; y toda su
            información asociada (sesiones, roles, participación en proyectos,
            etc.). Esta acción no se puede deshacer. Vuelve a ingresar la
            contraseña de administración para confirmar.
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
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleting}
            >
              {deleting ? 'Eliminando...' : 'Eliminar usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

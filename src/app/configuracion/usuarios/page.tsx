'use client';

import { useEffect, useRef, useState } from 'react';
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
  updateUserPasswordAdmin,
  type UserListRow,
  type UserListRowWithPassword,
} from '@/lib/actions/configuracion-usuarios';
import { AVAILABLE_ROLES, type Role } from '@/lib/auth-utils';
import { Lock, Unlock, Pencil, UserPlus } from 'lucide-react';

function formatDate(d: Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function ConfiguracionUsuariosPage() {
  const [users, setUsers] = useState<UserListRowWithPassword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserListRowWithPassword | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<Role>('Colaborador');
  const [addSaving, setAddSaving] = useState(false);
  const unlockPasswordRef = useRef<string | null>(null);

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
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditSaving(true);
    const res = await updateUserAdmin(editUser.id, {
      name: editName || undefined,
      email: editEmail || undefined,
    });
    if (res.success && editPassword.trim() && unlocked) {
      const resPw = await updateUserPasswordAdmin(editUser.id, editPassword);
      if (!resPw.success) {
        setError(resPw.error ?? 'Error al actualizar contraseña');
        setEditSaving(false);
        return;
      }
    }
    if (res.success) {
      setEditUser(null);
      if (unlocked && unlockPasswordRef.current) {
        const resList = await listUsersAdminWithPasswords(unlockPasswordRef.current);
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
        const resList = await listUsersAdminWithPasswords(unlockPasswordRef.current);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Usuarios</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Lista de usuarios, roles y participación en proyectos. Desbloquea para editar contraseñas.
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
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-red-600 mb-4">{error}</p>
          )}
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Contraseña</TableHead>
                    <TableHead>Última sesión</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Proyectos (rol)</TableHead>
                    <TableHead className="w-[80px]">Editar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name ?? '—'}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {unlocked
                          ? (u.passwordPlain ?? '—')
                          : '****'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(u.lastSessionExpires)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {u.roles.length ? u.roles.join(', ') : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <span className="text-sm text-muted-foreground">
                          {u.proyectos.length
                            ? u.proyectos
                                .slice(0, 3)
                                .map((p) => `${p.proyectoNombre} (${p.rol})`)
                                .join(', ') +
                              (u.proyectos.length > 3
                                ? ` +${u.proyectos.length - 3} más`
                                : '')
                            : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(u)}
                          className="flex items-center gap-1"
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Desbloquear */}
      <Dialog open={unlockOpen} onOpenChange={setUnlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desbloquear edición de contraseñas</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ingresa la contraseña de administración para poder ver y editar contraseñas de usuarios.
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

      {/* Sheet Editar usuario */}
      <Sheet open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Editar usuario</SheetTitle>
          </SheetHeader>
          {editUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <Label>Correo</Label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              {unlocked && (
                <div className="space-y-2">
                  <Label>Nueva contraseña (dejar en blanco para no cambiar)</Label>
                  <Input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              )}
            </div>
          )}
          <SheetFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={editSaving}>
              {editSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
    </div>
  );
}

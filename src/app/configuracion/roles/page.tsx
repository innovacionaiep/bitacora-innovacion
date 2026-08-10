'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
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
  getRolePermissionsMatrix,
  saveRolePermissionsMatrix,
  type RoleMatrixRow,
} from '@/lib/actions/configuracion-roles';
import type { PermissionKey } from '@/lib/permissions/catalog';
import type { Role } from '@/lib/auth-utils';
import { Check, Loader2, Save } from 'lucide-react';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';

type CellState = Record<string, boolean>;

function cellId(role: Role, key: PermissionKey): string {
  return `${role}::${key}`;
}

export default function ConfiguracionRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [rows, setRows] = useState<RoleMatrixRow[]>([]);
  const [cells, setCells] = useState<CellState>({});
  const [initialCells, setInitialCells] = useState<CellState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveToast, setShowSaveToast] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getRolePermissionsMatrix();
    if (!res.success || !res.data) {
      setError(res.error ?? 'No se pudo cargar la matriz');
      setLoading(false);
      return;
    }
    setRoles(res.data.roles);
    setRows(res.data.rows);
    const next: CellState = {};
    for (const row of res.data.rows) {
      for (const cell of row.cells) {
        next[cellId(cell.role, cell.permissionKey)] = cell.enabled;
      }
    }
    setCells(next);
    setInitialCells(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!showSaveToast) return;
    const t = setTimeout(() => setShowSaveToast(false), 3000);
    return () => clearTimeout(t);
  }, [showSaveToast]);

  const dirty = useMemo(() => {
    const keys = Object.keys(cells);
    if (keys.length !== Object.keys(initialCells).length) return true;
    return keys.some((k) => cells[k] !== initialCells[k]);
  }, [cells, initialCells]);

  const disabledMap = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const row of rows) {
      for (const cell of row.cells) {
        m.set(cellId(cell.role, cell.permissionKey), cell.disabled);
      }
    }
    return m;
  }, [rows]);

  const handleToggle = (role: Role, key: PermissionKey, enabled: boolean) => {
    const id = cellId(role, key);
    if (disabledMap.get(id)) return;
    setCells((prev) => ({ ...prev, [id]: enabled }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const previousInitial = initialCells;
    setInitialCells(cells);
    const payload = Object.entries(cells).map(([id, enabled]) => {
      const [role, permissionKey] = id.split('::') as [Role, PermissionKey];
      return { role, permissionKey, enabled };
    });
    const res = await saveRolePermissionsMatrix({ cells: payload });
    setSaving(false);
    if (!res.success) {
      setInitialCells(previousInitial);
      setError(res.error ?? 'Error al guardar');
      return;
    }
    setShowSaveToast(true);
  };

  const grouped = useMemo(() => {
    const groups: { group: string; groupLabel: string; rows: RoleMatrixRow[] }[] =
      [];
    for (const row of rows) {
      const last = groups[groups.length - 1];
      if (!last || last.group !== row.group) {
        groups.push({
          group: row.group,
          groupLabel: row.groupLabel,
          rows: [row],
        });
      } else {
        last.rows.push(row);
      }
    }
    return groups;
  }, [rows]);

  usePageTopLoader(loading);

  if (loading) {
    return <div className="h-full min-h-[200px] py-16" />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden pt-4">
      {showSaveToast && (
        <div className="fixed bottom-6 right-6 z-[100] flex animate-in fade-in slide-in-from-bottom-4 items-center space-x-2 rounded-lg bg-emerald-500 px-8 py-4 text-white shadow-lg duration-300">
          <Check className="h-6 w-6" />
          <span className="text-base font-semibold">Cambios guardados</span>
        </div>
      )}

      <div className="flex flex-shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Roles</h2>
          <p className="mt-1 text-sm text-gray-500">
            Define qué puede hacer cada tipo de rol. A nivel de cuenta, los
            permisos de navegación y vistas son la unión de todos los roles
            habilitados del usuario. Dentro de un proyecto solo aplican las
            atribuciones del rol de participación asignado en ese proyecto. La
            columna Admin permanece siempre activa. Ajustes solo puede estar ON
            para Admin.
          </p>
        </div>
        <Button
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          className="shrink-0"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="sticky left-0 z-10 min-w-[200px] bg-gray-50">
                Permiso
              </TableHead>
              {roles.map((role) => (
                <TableHead
                  key={role}
                  className="min-w-[100px] text-center whitespace-nowrap"
                >
                  {role}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.map((g) => (
              <Fragment key={g.group}>
                <TableRow className="bg-gray-100/80">
                  <TableCell
                    colSpan={roles.length + 1}
                    className="sticky left-0 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600"
                  >
                    {g.groupLabel}
                  </TableCell>
                </TableRow>
                {g.rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="sticky left-0 z-10 bg-white text-sm font-medium text-gray-800">
                      {row.label}
                    </TableCell>
                    {row.cells.map((cell) => {
                      const id = cellId(cell.role, cell.permissionKey);
                      const disabled = disabledMap.get(id) ?? false;
                      return (
                        <TableCell key={id} className="text-center">
                          <div className="flex justify-center">
                            <Switch
                              checked={cells[id] ?? false}
                              disabled={disabled}
                              onCheckedChange={(v) =>
                                handleToggle(
                                  cell.role,
                                  cell.permissionKey,
                                  v
                                )
                              }
                              aria-label={`${row.label} — ${cell.role}`}
                            />
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

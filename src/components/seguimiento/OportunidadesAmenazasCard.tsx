'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createOportunidadAmenaza,
  updatePlanDeAccionOportunidadAmenaza,
  toggleOkCoordinadorOportunidadAmenaza,
} from '@/lib/actions/seguimiento';
import { Plus, Loader2, Lightbulb, Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { OportunidadAmenaza as OportunidadAmenazaType } from '@prisma/client';

type OportunidadAmenazaWithUsuario = OportunidadAmenazaType & {
  okCoordinadorPor?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
};

interface OportunidadesAmenazasCardProps {
  projectId: string;
  oportunidadesAmenazas: OportunidadAmenazaWithUsuario[];
  rolEnProyecto?: string | null;
  activeRole?: string | null;
  /** Usuario actual para actualización optimista y visualización de quién dio el OK. */
  currentUser?: {
    id: string;
    name?: string | null;
    image?: string | null;
  } | null;
  onSuccess: () => void | Promise<void>;
  /** Actualización optimista para el checkbox OK coordinador. */
  onOptimisticOAUpdate?: (
    id: string,
    patch: {
      okCoordinador?: boolean;
      okCoordinadorPor?: {
        id: string;
        name: string | null;
        image: string | null;
      } | null;
      okCoordinadorPorRolActivo?: string | null;
    }
  ) => void;
}

function getInitials(nameOrEmail: string | null | undefined): string {
  if (!nameOrEmail) return '?';
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (nameOrEmail.includes('@')) {
    return nameOrEmail[0].toUpperCase();
  }
  return nameOrEmail.slice(0, 2).toUpperCase();
}

export function OportunidadesAmenazasCard({
  projectId,
  oportunidadesAmenazas,
  rolEnProyecto,
  activeRole,
  currentUser,
  onSuccess,
  onOptimisticOAUpdate,
}: OportunidadesAmenazasCardProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTipo, setAddTipo] = useState<'Oportunidad' | 'Amenaza'>(
    'Oportunidad'
  );
  const [addNombre, setAddNombre] = useState('');
  const [addDescripcion, setAddDescripcion] = useState('');
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingPlanValue, setEditingPlanValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [togglingOkId, setTogglingOkId] = useState<string | null>(null);

  const isCoordinadorOrAdmin =
    rolEnProyecto === 'Coordinador' || activeRole === 'Admin';
  const canEditPlan =
    rolEnProyecto === 'Coordinador' ||
    rolEnProyecto === 'Encargado' ||
    activeRole === 'Admin';

  const handleAdd = async () => {
    if (!addDescripcion.trim()) return;
    setSubmitting(true);
    const result = await createOportunidadAmenaza(
      projectId,
      addTipo,
      addNombre.trim() || '',
      addDescripcion.trim()
    );
    setSubmitting(false);
    if (result.success) {
      setShowAddModal(false);
      setAddDescripcion('');
      setAddNombre('');
      setAddTipo('Oportunidad');
      await onSuccess();
    }
  };

  const handleSavePlan = async (id: string) => {
    setSubmitting(true);
    const result = await updatePlanDeAccionOportunidadAmenaza(
      id,
      editingPlanValue.trim() || null
    );
    setSubmitting(false);
    if (result.success) {
      setEditingPlanId(null);
      setEditingPlanValue('');
      await onSuccess();
    }
  };

  const handleToggleOk = async (id: string) => {
    const item = oportunidadesAmenazas.find((o) => o.id === id);
    if (item) {
      const nuevoOk = !item.okCoordinador;
      onOptimisticOAUpdate?.(id, {
        okCoordinador: nuevoOk,
        okCoordinadorPor:
          nuevoOk && currentUser
            ? {
                id: currentUser.id,
                name: currentUser.name ?? null,
                image: currentUser.image ?? null,
              }
            : null,
        okCoordinadorPorRolActivo: nuevoOk ? (activeRole ?? null) : null,
      });
    }
    setTogglingOkId(id);
    const result = await toggleOkCoordinadorOportunidadAmenaza(id);
    setTogglingOkId(null);
    if (result.success) {
      await onSuccess();
    } else {
      onSuccess();
    }
  };

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="flex-shrink-0 flex items-center justify-between w-full px-3 py-2 bg-gray-100 border-b border-gray-200 rounded-t-xl">
          <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-emerald-600" />
            Oportunidades y Amenazas
          </h4>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="h-7 w-7 rounded-full bg-emerald-600 hover:bg-emerald-700 flex-shrink-0"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="h-3.5 w-3.5 text-white" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Agregar oportunidad o amenaza</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </header>
        <div className="flex-1 overflow-auto min-h-0 p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Tipo</TableHead>
                <TableHead className="w-[160px]">Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Plan de acción</TableHead>
                <TableHead className="min-w-[240px] text-center">
                  OK Coordinador
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {oportunidadesAmenazas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-gray-500 py-6"
                  >
                    No hay oportunidades ni amenazas registradas
                  </TableCell>
                </TableRow>
              ) : (
                oportunidadesAmenazas.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.tipo}</TableCell>
                    <TableCell className="max-w-[160px]">
                      <span className="line-clamp-2 text-sm">
                        {item.nombre || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="line-clamp-2 text-sm">
                        {item.descripcion}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      {editingPlanId === item.id ? (
                        <div className="flex gap-2 items-center">
                          <Textarea
                            value={editingPlanValue}
                            onChange={(e) =>
                              setEditingPlanValue(e.target.value)
                            }
                            placeholder="Plan de acción..."
                            className="min-h-[60px] text-sm"
                            rows={2}
                          />
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleSavePlan(item.id)}
                              disabled={submitting}
                            >
                              {submitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Guardar'
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingPlanId(null);
                                setEditingPlanValue('');
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (canEditPlan) {
                              setEditingPlanId(item.id);
                              setEditingPlanValue(item.planDeAccion ?? '');
                            }
                          }}
                          className={`text-left text-sm w-full min-h-[32px] px-2 py-1 rounded ${
                            canEditPlan
                              ? 'hover:bg-gray-100 cursor-pointer'
                              : 'cursor-default'
                          }`}
                        >
                          {item.planDeAccion ? (
                            <span className="line-clamp-2">
                              {item.planDeAccion}
                            </span>
                          ) : (
                            <span className="text-gray-400">
                              {canEditPlan
                                ? 'Clic para agregar plan de acción'
                                : '-'}
                            </span>
                          )}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isCoordinadorOrAdmin ? (
                        togglingOkId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mx-auto text-gray-400" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleOk(item.id)}
                            className="flex items-center justify-center gap-2 w-full min-h-[36px] rounded-md hover:bg-gray-50 transition-colors"
                          >
                            {item.okCoordinador ? (
                              <>
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                                </span>
                                {(item.okCoordinadorPor ||
                                  (currentUser &&
                                    item.okCoordinadorPorId ===
                                      currentUser.id)) && (
                                  <span className="flex items-center gap-2 text-left min-w-0">
                                    <Avatar className="h-6 w-6 shrink-0">
                                      <AvatarImage
                                        src={
                                          (item.okCoordinadorPor?.image ??
                                            currentUser?.image) ||
                                          undefined
                                        }
                                      />
                                      <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">
                                        {getInitials(
                                          item.okCoordinadorPor?.name ??
                                            currentUser?.name
                                        )}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-gray-700 truncate">
                                      {item.okCoordinadorPor?.name ??
                                        currentUser?.name ??
                                        'Usuario'}
                                    </span>
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-300" />
                            )}
                          </button>
                        )
                      ) : item.okCoordinador ? (
                        <div className="flex items-center justify-center gap-2 w-full">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </span>
                          {item.okCoordinadorPor && (
                            <span className="flex items-center gap-2 text-left min-w-0">
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarImage
                                  src={item.okCoordinadorPor.image ?? undefined}
                                />
                                <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">
                                  {getInitials(item.okCoordinadorPor.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-gray-700 truncate">
                                {item.okCoordinadorPor.name ?? 'Usuario'}
                              </span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar oportunidad o amenaza</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={addTipo}
                onValueChange={(v) =>
                  setAddTipo(v as 'Oportunidad' | 'Amenaza')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Oportunidad">Oportunidad</SelectItem>
                  <SelectItem value="Amenaza">Amenaza</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={addNombre}
                onChange={(e) => setAddNombre(e.target.value)}
                placeholder="Nombre de la oportunidad o amenaza"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={addDescripcion}
                onChange={(e) => setAddDescripcion(e.target.value)}
                placeholder="Describa la oportunidad o amenaza..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddModal(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!addDescripcion.trim() || submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Agregar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

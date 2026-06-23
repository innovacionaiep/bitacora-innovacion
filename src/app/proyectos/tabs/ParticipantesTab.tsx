'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { MultiSelectOptions, MULTI_SELECT_SEP } from '@/components/ui/multi-select-options';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  Users,
  Handshake,
  GraduationCap,
  BookOpen,
  Heart,
  Crown,
  UserCog,
  FileDown,
  X,
} from 'lucide-react';
import type { ProyectoWithRelations } from '@/types/proyecto';
import {
  ROLES,
  ROLE_COLORS,
  SELECT_NONE_VALUE,
  emptyNewParticipanteData,
} from './participantes-tab-utils';
import { useParticipantesTab } from './useParticipantesTab';

type ProyectoTabName =
  | 'Resumen'
  | 'General'
  | 'Participantes'
  | 'Gantt'
  | 'Indicadores'
  | 'Presupuesto'
  | 'Historial'
  | 'Seguimiento';

export function ParticipantesTab({
  project,
  setProject,
  fetchProyectos,
  selectedTab,
  onSaveSuccess,
}: {
  project: ProyectoWithRelations;
  setProject: React.Dispatch<React.SetStateAction<ProyectoWithRelations | null>>;
  fetchProyectos: (opts?: { silent?: boolean; activeRole?: string }) => void;
  selectedTab: ProyectoTabName;
  onSaveSuccess: () => void;
}) {
  const {
    filterParticipantesNombre,
    setFilterParticipantesNombre,
    filterParticipantesRol,
    setFilterParticipantesRol,
    filterParticipantesCargo,
    setFilterParticipantesCargo,
    filterParticipantesSocio,
    setFilterParticipantesSocio,
    isAddingParticipante,
    setIsAddingParticipante,
    isEditModeParticipante,
    setIsEditModeParticipante,
    isDeleteModeParticipante,
    setIsDeleteModeParticipante,
    editingParticipanteId,
    setEditingParticipanteId,
    newParticipanteData,
    setNewParticipanteData,
    sedesParticipantes,
    escuelasParticipantes,
    participanteSubmitting,
    isEditarSociosOpen,
    setIsEditarSociosOpen,
    editarSociosIds,
    setEditarSociosIds,
    editarSociosCatalog,
    nuevoSocioNombre,
    setNuevoSocioNombre,
    nuevoSocioDescripcion,
    setNuevoSocioDescripcion,
    nuevoSocioSaving,
    editarSociosSaving,
    handleSaveNewParticipante,
    handleUpdateParticipante,
    handleDeleteParticipante,
    openEditarSociosDialog,
    handleCreateNuevoSocio,
    handleSaveEditarSocios,
  } = useParticipantesTab({
    project,
    setProject,
    fetchProyectos,
    selectedTab,
    onSaveSuccess,
  });

  const list = project.participantes_rel ?? [];
  const rolesSelected = filterParticipantesRol
    ? filterParticipantesRol
        .split(MULTI_SELECT_SEP)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const cargosSelected = filterParticipantesCargo
    ? filterParticipantesCargo
        .split(MULTI_SELECT_SEP)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const sociosSelected = filterParticipantesSocio
    ? filterParticipantesSocio
        .split(MULTI_SELECT_SEP)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const filteredParticipants = useMemo(
    () =>
      list.filter((p) => {
        const nombre = (p.user?.name ?? p.nombre ?? '').toLowerCase();
        const email = (p.user?.email ?? p.email ?? '').toLowerCase();
        const cargo = (p.cargo ?? '').toLowerCase();
        const socioId = p.socioComunitario?.id ?? '';
        const q = filterParticipantesNombre.trim().toLowerCase();
        if (q && !nombre.includes(q) && !email.includes(q)) return false;
        if (rolesSelected.length > 0 && !rolesSelected.includes(p.rol))
          return false;
        if (cargosSelected.length > 0) {
          const cargoNorm = (p.cargo ?? '').trim().toLowerCase();
          const match =
            cargoNorm &&
            cargosSelected.some((c) => c.trim().toLowerCase() === cargoNorm);
          if (!match) return false;
        }
        if (sociosSelected.length > 0 && p.rol === 'Beneficiario') {
          if (!socioId || !sociosSelected.includes(socioId)) return false;
        }
        return true;
      }),
    [
      list,
      filterParticipantesNombre,
      rolesSelected,
      cargosSelected,
      sociosSelected,
    ]
  );
  const uniqueCargos = useMemo(() => {
    const set = new Set<string>();
    list.forEach((p) => {
      if (p.cargo?.trim()) set.add(p.cargo.trim());
    });
    return Array.from(set).sort();
  }, [list]);
  const cargoOptions = uniqueCargos.map((c) => ({ value: c, label: c }));
  const sociosFromProject =
    project.sociosComunitarios?.map((sc) => ({
      value: sc.socioComunitario.id,
      label: sc.socioComunitario.nombre,
    })) ?? [];
  const sociosFromParticipants = useMemo(() => {
    const seen = new Set<string>();
    return list
      .filter((p) => p.rol === 'Beneficiario' && p.socioComunitario)
      .map((p) => p.socioComunitario!)
      .filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      })
      .map((s) => ({ value: s.id, label: s.nombre }));
  }, [list]);
  const socioOptions =
    sociosFromProject.length > 0 ? sociosFromProject : sociosFromParticipants;
  const counts = useMemo(() => {
    const encargados = list.filter((p) => p.rol === 'Encargado').length;
    const coordinadores = list.filter((p) => p.rol === 'Coordinador').length;
    const colaboradores = list.filter((p) => p.rol === 'Colaborador').length;
    const docentes = list.filter((p) => p.rol === 'Docente').length;
    const estudiantes = list.filter((p) => p.rol === 'Estudiante').length;
    const beneficiarios = list.filter((p) => p.rol === 'Beneficiario').length;
    const sociosUnicos = new Set(
      list
        .filter((p) => p.rol === 'Beneficiario' && p.socioComunitario?.id)
        .map((p) => p.socioComunitario!.id)
    );
    return {
      encargados,
      coordinadores,
      colaboradores,
      docentes,
      estudiantes,
      beneficiarios,
      sociosComunitarios: sociosUnicos.size,
    };
  }, [list]);
  const showActionsColumn =
    isEditModeParticipante || isDeleteModeParticipante || isAddingParticipante;

  return (
    <>
                    <div className="h-full overflow-hidden flex flex-col pt-4 px-4">
                      {/* Tarjetas de cantidades - colores por rol según SISTEMA-ROLES.md */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4 flex-shrink-0">
                        <Card className="py-2 px-3">
                          <CardContent className="p-0 flex items-center justify-center gap-2">
                            <Crown className="h-8 w-8 shrink-0 text-orange-600" />
                            <span className="text-[25px] font-bold text-orange-600">
                              {counts.encargados}
                            </span>
                            <span className="text-sm font-bold text-orange-600">
                              Encargados
                            </span>
                          </CardContent>
                        </Card>
                        <Card className="py-2 px-3">
                          <CardContent className="p-0 flex items-center justify-center gap-2">
                            <UserCog className="h-8 w-8 shrink-0 text-blue-600" />
                            <span className="text-[25px] font-bold text-blue-600">
                              {counts.coordinadores}
                            </span>
                            <span className="text-sm font-bold text-blue-600">
                              Coordinadores
                            </span>
                          </CardContent>
                        </Card>
                        <Card className="py-2 px-3">
                          <CardContent className="p-0 flex items-center justify-center gap-2">
                            <Users className="h-8 w-8 shrink-0 text-violet-600" />
                            <span className="text-[25px] font-bold text-violet-600">
                              {counts.colaboradores}
                            </span>
                            <span className="text-sm font-bold text-violet-600">
                              Colaboradores
                            </span>
                          </CardContent>
                        </Card>
                        <Card className="py-2 px-3">
                          <CardContent className="p-0 flex items-center justify-center gap-2">
                            <GraduationCap className="h-8 w-8 shrink-0 text-green-600" />
                            <span className="text-[25px] font-bold text-green-600">
                              {counts.docentes}
                            </span>
                            <span className="text-sm font-bold text-green-600">
                              Docentes
                            </span>
                          </CardContent>
                        </Card>
                        <Card className="py-2 px-3">
                          <CardContent className="p-0 flex items-center justify-center gap-2">
                            <BookOpen className="h-8 w-8 shrink-0 text-red-600" />
                            <span className="text-[25px] font-bold text-red-600">
                              {counts.estudiantes}
                            </span>
                            <span className="text-sm font-bold text-red-600">
                              Estudiantes
                            </span>
                          </CardContent>
                        </Card>
                        <Card className="py-2 px-3">
                          <CardContent className="p-0 flex items-center justify-center gap-2">
                            <Heart className="h-8 w-8 shrink-0 text-cyan-600" />
                            <span className="text-[25px] font-bold text-cyan-600">
                              {counts.beneficiarios}
                            </span>
                            <span className="text-sm font-bold text-cyan-600">
                              Beneficiarios
                            </span>
                          </CardContent>
                        </Card>
                        <Card className="py-2 px-3">
                          <CardContent className="p-0 flex items-center justify-center gap-2">
                            <Handshake className="h-8 w-8 shrink-0 text-gray-600" />
                            <span className="text-[25px] font-bold text-gray-600">
                              {counts.sociosComunitarios}
                            </span>
                            <span className="text-sm font-bold text-gray-600">
                              Socios comunitarios
                            </span>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Filtros + Botones */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 flex-shrink-0">
                        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-[180px]">
                            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                            <Input
                              placeholder="Buscar por nombre o correo..."
                              value={filterParticipantesNombre}
                              onChange={(e) =>
                                setFilterParticipantesNombre(e.target.value)
                              }
                              className="max-w-[220px] h-9"
                            />
                          </div>
                          <div className="w-[160px]">
                            <MultiSelectOptions
                              options={ROLES}
                              value={filterParticipantesRol}
                              onChange={setFilterParticipantesRol}
                              placeholder="Rol"
                            />
                          </div>
                          <div className="w-[160px]">
                            <MultiSelectOptions
                              options={cargoOptions}
                              value={filterParticipantesCargo}
                              onChange={setFilterParticipantesCargo}
                              placeholder="Cargo"
                            />
                          </div>
                          <div className="w-[180px]">
                            <MultiSelectOptions
                              options={socioOptions}
                              value={filterParticipantesSocio}
                              onChange={setFilterParticipantesSocio}
                              placeholder="Socio comunitario"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  onClick={() => {
                                    setIsAddingParticipante((v) => !v);
                                    if (isAddingParticipante)
                                      setNewParticipanteData({
                                        rol: 'Colaborador',
                                        nombre: '',
                                        email: '',
                                        cargo: '',
                                        socioComunitarioId: '',
                                        sedeId: '',
                                        escuelaId: '',
                                      });
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className={`h-10 w-10 rounded-lg transition-all duration-200 flex items-center justify-center border shadow-sm ${
                                    isAddingParticipante
                                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                                  }`}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {isAddingParticipante
                                    ? 'Cancelar agregar participante'
                                    : 'Agregar participante'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  onClick={() => {
                                    setIsEditModeParticipante((v) => !v);
                                    if (isEditModeParticipante)
                                      setEditingParticipanteId(null);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className={`h-10 w-10 rounded-lg transition-all duration-200 flex items-center justify-center border shadow-sm ml-1 ${
                                    isEditModeParticipante
                                      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                                  }`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {isEditModeParticipante
                                    ? 'Salir del modo edición'
                                    : 'Editar participantes'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  onClick={() =>
                                    setIsDeleteModeParticipante((v) => !v)
                                  }
                                  variant="ghost"
                                  size="sm"
                                  className={`h-10 w-10 rounded-lg transition-all duration-200 flex items-center justify-center border shadow-sm ml-1 ${
                                    isDeleteModeParticipante
                                      ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                                  }`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {isDeleteModeParticipante
                                    ? 'Salir del modo eliminación'
                                    : 'Eliminar participantes'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  onClick={openEditarSociosDialog}
                                  variant="ghost"
                                  size="sm"
                                  className="h-10 rounded-lg transition-all duration-200 flex items-center justify-center border shadow-sm ml-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 gap-1.5 px-3"
                                >
                                  <Handshake className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    Editar socios
                                  </span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Agregar o editar socios comunitarios del proyecto</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  onClick={async () => {
                                    const XLSX = await import('xlsx');
                                    const headers = [
                                      'Rol',
                                      'Nombre',
                                      'Correo',
                                      'Cargo',
                                      'Sede',
                                      'Escuela',
                                      'Socio comunitario',
                                    ];
                                    const rows = filteredParticipants.map(
                                      (p) => [
                                        p.rol,
                                        p.user?.name ??
                                          p.nombre ??
                                          'Sin nombre',
                                        p.user?.email ?? p.email ?? '',
                                        p.cargo ?? '',
                                        p.sede?.nombre ?? '—',
                                        p.escuela?.nombre ?? '—',
                                        p.rol === 'Beneficiario'
                                          ? (p.socioComunitario?.nombre ?? '—')
                                          : '—',
                                      ]
                                    );
                                    const wsData = [headers, ...rows];
                                    const ws = XLSX.utils.aoa_to_sheet(wsData);
                                    const wb = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(
                                      wb,
                                      ws,
                                      'Participantes'
                                    );
                                    const nombreProyecto = (
                                      project?.proyecto ?? 'proyecto'
                                    )
                                      .replace(/[^\w\s-]/gi, '')
                                      .trim()
                                      .slice(0, 50);
                                    XLSX.writeFile(
                                      wb,
                                      `participantes_${nombreProyecto}.xlsx`
                                    );
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="h-10 rounded-lg transition-all duration-200 flex items-center justify-center border shadow-sm ml-1 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1.5 px-3"
                                >
                                  <FileDown className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    Exportar
                                  </span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Exportar tabla de participantes a Excel (XLSX)
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>

                      {/* Tabla con encabezados sticky y cuerpo scrolleable */}
                      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden flex flex-col">
                        <div className="overflow-auto flex-1 custom-scrollbar">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/60 hover:bg-muted/60">
                                <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 w-[140px] text-center">
                                  Rol
                                </TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 min-w-[200px] text-center">
                                  Nombre
                                </TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 min-w-[180px] text-center">
                                  Correo
                                </TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 min-w-[160px] text-center">
                                  Cargo
                                </TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 min-w-[140px] text-center">
                                  Sede
                                </TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 min-w-[140px] text-center">
                                  Escuela
                                </TableHead>
                                <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 min-w-[180px] text-center">
                                  Socio comunitario
                                </TableHead>
                                {showActionsColumn && (
                                  <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 w-[60px] text-center" />
                                )}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {isAddingParticipante && (
                                <TableRow className="bg-green-50/80 border-2 border-green-200">
                                  <TableCell className="align-middle text-center">
                                    <Select
                                      value={newParticipanteData.rol}
                                      onValueChange={(v) =>
                                        setNewParticipanteData((prev) => ({
                                          ...prev,
                                          rol: v as typeof prev.rol,
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="h-8 text-sm w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ROLES.map((r) => (
                                          <SelectItem
                                            key={r.value}
                                            value={r.value}
                                          >
                                            {r.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    <Input
                                      value={newParticipanteData.nombre}
                                      onChange={(e) =>
                                        setNewParticipanteData((prev) => ({
                                          ...prev,
                                          nombre: e.target.value,
                                        }))
                                      }
                                      placeholder="Nombre *"
                                      className="h-8 text-sm"
                                    />
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    <Input
                                      value={newParticipanteData.email}
                                      onChange={(e) =>
                                        setNewParticipanteData((prev) => ({
                                          ...prev,
                                          email: e.target.value,
                                        }))
                                      }
                                      placeholder="Correo"
                                      className="h-8 text-sm"
                                    />
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    <Input
                                      value={newParticipanteData.cargo}
                                      onChange={(e) =>
                                        setNewParticipanteData((prev) => ({
                                          ...prev,
                                          cargo: e.target.value,
                                        }))
                                      }
                                      placeholder="Cargo"
                                      className="h-8 text-sm"
                                    />
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    <Select
                                      value={
                                        newParticipanteData.sedeId ||
                                        SELECT_NONE_VALUE
                                      }
                                      onValueChange={(v) =>
                                        setNewParticipanteData((prev) => ({
                                          ...prev,
                                          sedeId:
                                            v === SELECT_NONE_VALUE ? '' : v,
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="h-8 text-sm w-full">
                                        <SelectValue placeholder="Sede" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value={SELECT_NONE_VALUE}>
                                          —
                                        </SelectItem>
                                        {sedesParticipantes.map((s) => (
                                          <SelectItem key={s.id} value={s.id}>
                                            {s.nombre}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    <Select
                                      value={
                                        newParticipanteData.escuelaId ||
                                        SELECT_NONE_VALUE
                                      }
                                      onValueChange={(v) =>
                                        setNewParticipanteData((prev) => ({
                                          ...prev,
                                          escuelaId:
                                            v === SELECT_NONE_VALUE ? '' : v,
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="h-8 text-sm w-full">
                                        <SelectValue placeholder="Escuela" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value={SELECT_NONE_VALUE}>
                                          —
                                        </SelectItem>
                                        {escuelasParticipantes.map((e) => (
                                          <SelectItem key={e.id} value={e.id}>
                                            {e.nombre}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    {newParticipanteData.rol ===
                                    'Beneficiario' ? (
                                      <Select
                                        value={
                                          newParticipanteData.socioComunitarioId
                                        }
                                        onValueChange={(v) =>
                                          setNewParticipanteData((prev) => ({
                                            ...prev,
                                            socioComunitarioId: v,
                                          }))
                                        }
                                      >
                                        <SelectTrigger className="h-8 text-sm w-full">
                                          <SelectValue placeholder="Socio comunitario *" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {socioOptions.map((s) => (
                                            <SelectItem
                                              key={s.value}
                                              value={s.value}
                                            >
                                              {s.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      '—'
                                    )}
                                  </TableCell>
                                  {showActionsColumn && (
                                    <TableCell className="align-middle text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <Button
                                          size="sm"
                                          onClick={handleSaveNewParticipante}
                                          disabled={participanteSubmitting}
                                          className="bg-green-600 hover:bg-green-700 text-white"
                                        >
                                          {participanteSubmitting
                                            ? 'Guardando...'
                                            : 'Guardar'}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setIsAddingParticipante(false);
                                            setNewParticipanteData({
                                              rol: 'Colaborador',
                                              nombre: '',
                                              email: '',
                                              cargo: '',
                                              socioComunitarioId: '',
                                              sedeId: '',
                                              escuelaId: '',
                                            });
                                          }}
                                        >
                                          Cancelar
                                        </Button>
                                      </div>
                                    </TableCell>
                                  )}
                                </TableRow>
                              )}
                              {filteredParticipants.length === 0 &&
                              !isAddingParticipante ? (
                                <TableRow>
                                  <TableCell
                                    colSpan={showActionsColumn ? 8 : 7}
                                    className="text-center text-muted-foreground py-8"
                                  >
                                    No hay participantes que coincidan con los
                                    filtros.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredParticipants.map((p) => {
                                  const nombre =
                                    p.displayName ??
                                    p.user?.name ??
                                    p.nombre ??
                                    'Sin nombre';
                                  const email = p.user?.email ?? p.email ?? '';
                                  const avatarImage =
                                    p.displayImage ?? p.user?.image;
                                  const cargo = p.cargo ?? '';
                                  const sedeNombre = p.sede?.nombre ?? '—';
                                  const escuelaNombre =
                                    p.escuela?.nombre ?? '—';
                                  const socioComunitario =
                                    p.rol === 'Beneficiario'
                                      ? (p.socioComunitario?.nombre ?? '—')
                                      : '—';
                                  const colorClass =
                                    ROLE_COLORS[p.rol] ??
                                    'bg-gray-100 text-gray-800 border-gray-200';
                                  const isEditing =
                                    editingParticipanteId === p.id;
                                  return (
                                    <TableRow
                                      key={p.id}
                                      className={`hover:bg-muted/50 ${isEditing ? 'bg-blue-50/80' : ''}`}
                                    >
                                      <TableCell className="align-middle text-center">
                                        {isEditing ? (
                                          <Select
                                            value={p.rol}
                                            onValueChange={(v) =>
                                              handleUpdateParticipante(p.id, {
                                                rol: v,
                                              })
                                            }
                                          >
                                            <SelectTrigger className="h-8 text-sm w-full">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {ROLES.map((r) => (
                                                <SelectItem
                                                  key={r.value}
                                                  value={r.value}
                                                >
                                                  {r.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <span
                                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${colorClass}`}
                                          >
                                            #{p.rol}
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell className="align-middle">
                                        {isEditing ? (
                                          <Input
                                            defaultValue={nombre}
                                            onBlur={(e) => {
                                              const v = e.target.value.trim();
                                              if (v && v !== nombre)
                                                handleUpdateParticipante(p.id, {
                                                  nombre: v,
                                                });
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                const v = (
                                                  e.target as HTMLInputElement
                                                ).value.trim();
                                                if (v && v !== nombre)
                                                  handleUpdateParticipante(
                                                    p.id,
                                                    { nombre: v }
                                                  );
                                              }
                                            }}
                                            className="h-8 text-sm"
                                          />
                                        ) : (
                                          <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 rounded-full ring-2 ring-gray-200">
                                              {avatarImage ? (
                                                <AvatarImage
                                                  src={avatarImage}
                                                  alt={nombre}
                                                />
                                              ) : null}
                                              <AvatarFallback className="bg-gray-100 text-gray-700">
                                                <Users className="h-4 w-4" />
                                              </AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium truncate">
                                              {nombre}
                                            </span>
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell className="align-middle text-muted-foreground truncate max-w-[200px]">
                                        {isEditing ? (
                                          <Input
                                            defaultValue={email}
                                            onBlur={(e) => {
                                              const v = e.target.value.trim();
                                              if (v !== (email || ''))
                                                handleUpdateParticipante(p.id, {
                                                  email: v || undefined,
                                                });
                                            }}
                                            className="h-8 text-sm"
                                          />
                                        ) : (
                                          email || '—'
                                        )}
                                      </TableCell>
                                      <TableCell className="align-middle truncate max-w-[160px]">
                                        {isEditing ? (
                                          <Input
                                            defaultValue={cargo}
                                            onBlur={(e) => {
                                              const v = e.target.value.trim();
                                              if (v !== (cargo || ''))
                                                handleUpdateParticipante(p.id, {
                                                  cargo: v || undefined,
                                                });
                                            }}
                                            className="h-8 text-sm"
                                          />
                                        ) : (
                                          cargo || '—'
                                        )}
                                      </TableCell>
                                      <TableCell className="align-middle truncate max-w-[140px]">
                                        {isEditing ? (
                                          <Select
                                            value={
                                              p.sede?.id ?? SELECT_NONE_VALUE
                                            }
                                            onValueChange={(v) =>
                                              handleUpdateParticipante(p.id, {
                                                sedeId:
                                                  v === SELECT_NONE_VALUE
                                                    ? undefined
                                                    : v,
                                              })
                                            }
                                          >
                                            <SelectTrigger className="h-8 text-sm w-full">
                                              <SelectValue placeholder="Sede" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem
                                                value={SELECT_NONE_VALUE}
                                              >
                                                —
                                              </SelectItem>
                                              {sedesParticipantes.map((s) => (
                                                <SelectItem
                                                  key={s.id}
                                                  value={s.id}
                                                >
                                                  {s.nombre}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          sedeNombre
                                        )}
                                      </TableCell>
                                      <TableCell className="align-middle truncate max-w-[140px]">
                                        {isEditing ? (
                                          <Select
                                            value={
                                              p.escuela?.id ?? SELECT_NONE_VALUE
                                            }
                                            onValueChange={(v) =>
                                              handleUpdateParticipante(p.id, {
                                                escuelaId:
                                                  v === SELECT_NONE_VALUE
                                                    ? undefined
                                                    : v,
                                              })
                                            }
                                          >
                                            <SelectTrigger className="h-8 text-sm w-full">
                                              <SelectValue placeholder="Escuela" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem
                                                value={SELECT_NONE_VALUE}
                                              >
                                                —
                                              </SelectItem>
                                              {escuelasParticipantes.map(
                                                (e) => (
                                                  <SelectItem
                                                    key={e.id}
                                                    value={e.id}
                                                  >
                                                    {e.nombre}
                                                  </SelectItem>
                                                )
                                              )}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          escuelaNombre
                                        )}
                                      </TableCell>
                                      <TableCell className="align-middle truncate max-w-[180px]">
                                        {isEditing &&
                                        p.rol === 'Beneficiario' ? (
                                          <Select
                                            value={p.socioComunitario?.id ?? ''}
                                            onValueChange={(v) =>
                                              handleUpdateParticipante(p.id, {
                                                socioComunitarioId: v,
                                              })
                                            }
                                          >
                                            <SelectTrigger className="h-8 text-sm w-full">
                                              <SelectValue placeholder="Socio comunitario" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {socioOptions.map((s) => (
                                                <SelectItem
                                                  key={s.value}
                                                  value={s.value}
                                                >
                                                  {s.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          socioComunitario
                                        )}
                                      </TableCell>
                                      {showActionsColumn && (
                                        <TableCell className="align-middle text-center">
                                          {isEditModeParticipante && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className={`h-6 w-6 p-0 ${
                                                isEditing
                                                  ? 'text-blue-600 bg-blue-50'
                                                  : 'text-gray-600 hover:bg-blue-50'
                                              }`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingParticipanteId(
                                                  isEditing ? null : p.id
                                                );
                                              }}
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                          )}
                                          {isDeleteModeParticipante && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteParticipante(p.id);
                                              }}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          )}
                                        </TableCell>
                                      )}
                                    </TableRow>
                                  );
                                })
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
            {/* Dialog Editar socios comunitarios (tab Participantes) */}
      <Dialog open={isEditarSociosOpen} onOpenChange={setIsEditarSociosOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar socios comunitarios</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Socios del proyecto
              </Label>
              <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto rounded-md border bg-gray-50/50 p-2">
                {editarSociosIds.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">
                    No hay socios agregados. Agrega uno desde el catálogo abajo.
                  </p>
                ) : (
                  editarSociosIds.map((id) => {
                    const socio = editarSociosCatalog.find((s) => s.id === id);
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-gray-900">
                          {socio?.nombre ?? id}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() =>
                            setEditarSociosIds((prev) => prev.filter((x) => x !== id))
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Agregar socio desde el catálogo
              </Label>
              <Select
                key={`socio-add-${editarSociosIds.length}`}
                value={SELECT_NONE_VALUE}
                onValueChange={(value) => {
                  if (value && value !== SELECT_NONE_VALUE && !editarSociosIds.includes(value)) {
                    setEditarSociosIds((prev) => [...prev, value]);
                  }
                }}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Seleccionar socio comunitario..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE_VALUE} disabled>
                    — Seleccionar —
                  </SelectItem>
                  {editarSociosCatalog
                    .filter((s) => !editarSociosIds.includes(s.id))
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nombre}
                      </SelectItem>
                    ))}
                  {editarSociosCatalog.filter(
                    (s) => !editarSociosIds.includes(s.id)
                  ).length === 0 && (
                    <span className="text-sm text-gray-500 px-2 py-1.5 block">
                      Todos los socios ya están agregados
                    </span>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-2 border-t">
              <Label className="text-sm font-medium text-gray-700">
                Crear nuevo socio comunitario
              </Label>
              <div className="mt-2 space-y-2">
                <Input
                  placeholder="Nombre del socio comunitario"
                  value={nuevoSocioNombre}
                  onChange={(e) => setNuevoSocioNombre(e.target.value)}
                />
                <Textarea
                  placeholder="Descripción (opcional)"
                  value={nuevoSocioDescripcion}
                  onChange={(e) => setNuevoSocioDescripcion(e.target.value)}
                  className="min-h-[72px]"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={nuevoSocioSaving || !nuevoSocioNombre.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleCreateNuevoSocio}
                >
                  {nuevoSocioSaving ? 'Creando socio...' : 'Crear y agregar al catálogo'}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditarSociosOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={editarSociosSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSaveEditarSocios}
            >
              {editarSociosSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

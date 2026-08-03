'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MULTI_SELECT_SEP } from '@/components/ui/multi-select-options';
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
  FileSpreadsheet,
  Check,
  X,
  ChevronDown,
} from 'lucide-react';
import type { ProyectoWithRelations } from '@/types/proyecto';
import { getProyectoParticipantes } from '@/lib/actions/proyectos';
import {
  ROLES,
  ROLE_COLORS,
  SELECT_NONE_VALUE,
  NEW_PERSONA_VALUE,
  isSyncableParticipanteRol,
} from './participantes-tab-utils';
import { useParticipantesTab } from './useParticipantesTab';
import { EditarSociosComunitariosDialog } from '@/components/proyectos/EditarSociosComunitariosDialog';
import { ImportExcelDialog } from '@/components/proyectos/ImportExcelDialog';
import { useCanProjectImport } from '@/hooks/useCanProjectImport';
import { cn } from '@/lib/utils';

type ProyectoTabName =
  | 'Convenio'
  | 'Resumen'
  | 'General'
  | 'Participantes'
  | 'Gantt'
  | 'Indicadores'
  | 'Presupuesto'
  | 'Historial'
  | 'Seguimiento';

type SortKey =
  | 'rol'
  | 'nombre'
  | 'rut'
  | 'correo'
  | 'cargo'
  | 'sede'
  | 'escuela'
  | 'carrera'
  | 'asignatura'
  | 'socio'
  | 'labor';

type SortState = { key: SortKey | null; dir: 'asc' | 'desc' };

type FilterOption = { value: string; label: string };

const COL_COUNT = 12;

const CELL_TEXT = 'text-[11px]';
const INPUT_CELL = 'h-7 text-[11px] w-full min-w-0';
const SELECT_TRIGGER = 'h-7 text-[11px] w-full min-w-0';

/** Anchos fijos proporcionales (suma 100%) para caber sin scroll horizontal. */
const COL_W = {
  acciones: 'w-[5%]',
  rol: 'w-[7%]',
  nombre: 'w-[12%]',
  rut: 'w-[7%]',
  correo: 'w-[11%]',
  cargo: 'w-[8%]',
  sede: 'w-[7%]',
  escuela: 'w-[8%]',
  carrera: 'w-[8%]',
  asignatura: 'w-[8%]',
  socio: 'w-[9%]',
  labor: 'w-[10%]',
} as const;

const CELL_BASE = `${CELL_TEXT} align-middle whitespace-normal break-words leading-snug px-1 py-1.5`;
const CELL_BASE_CENTER = `${CELL_BASE} text-center`;
const ACCIONES_CELL =
  'text-center align-middle whitespace-normal px-0.5 py-1 border-r border-gray-200 w-[5%]';

function parseMultiFilter(value: string): string[] {
  if (!value) return [];
  return value
    .split(MULTI_SELECT_SEP)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatMultiFilter(values: string[]): string {
  return values.join(` ${MULTI_SELECT_SEP} `);
}

function toggleFilterValue(current: string, optionValue: string): string {
  const values = parseMultiFilter(current);
  const has = values.includes(optionValue);
  const next = has
    ? values.filter((v) => v !== optionValue)
    : [...values, optionValue];
  return formatMultiFilter(next);
}

export function ParticipantesTab({
  project,
  setProject,
  selectedTab,
  onSaveSuccess,
}: {
  project: ProyectoWithRelations;
  setProject: React.Dispatch<React.SetStateAction<ProyectoWithRelations | null>>;
  selectedTab: ProyectoTabName;
  onSaveSuccess: () => void;
}) {
  const {
    filterParticipantesRol,
    setFilterParticipantesRol,
    filterParticipantesCargo,
    setFilterParticipantesCargo,
    filterParticipantesSocio,
    setFilterParticipantesSocio,
    filterParticipantesSede,
    setFilterParticipantesSede,
    filterParticipantesEscuela,
    setFilterParticipantesEscuela,
    isAddingParticipante,
    startAddingParticipante,
    cancelAddingParticipante,
    startEditParticipante,
    cancelEditParticipante,
    editDraft,
    setEditDraft,
    editingParticipanteId,
    newParticipanteData,
    setNewParticipanteData,
    sedesParticipantes,
    escuelasParticipantes,
    carrerasParticipantes,
    asignaturasParticipantes,
    usuariosPorRolApp,
    applyPersonaUserToForm,
    clearPersonaFormFields,
    handleNewParticipanteRolChange,
    handleEditParticipanteRolChange,
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
    handleSaveEditParticipante,
    handleDeleteParticipante,
    openEditarSociosDialog,
    handleCreateNuevoSocio,
    handleSaveEditarSocios,
  } = useParticipantesTab({
    project,
    setProject,
    selectedTab,
    onSaveSuccess,
  });

  const [importOpen, setImportOpen] = useState(false);
  const [newPersonaIsManual, setNewPersonaIsManual] = useState(false);
  const [editPersonaIsManual, setEditPersonaIsManual] = useState(false);
  const canImport = useCanProjectImport(
    'projects.import_participantes',
    project
  );

  const [sort, setSort] = useState<SortState>({ key: null, dir: 'asc' });

  const list = project.participantes_rel ?? [];
  const rolesSelected = parseMultiFilter(filterParticipantesRol);
  const cargosSelected = parseMultiFilter(filterParticipantesCargo);
  const sociosSelected = parseMultiFilter(filterParticipantesSocio);
  const sedesSelected = parseMultiFilter(filterParticipantesSede);
  const escuelasSelected = parseMultiFilter(filterParticipantesEscuela);

  const uniqueCargos = useMemo(() => {
    const set = new Set<string>();
    list.forEach((p) => {
      if (p.cargo?.trim()) set.add(p.cargo.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [list]);
  const cargoOptions: FilterOption[] = uniqueCargos.map((c) => ({
    value: c,
    label: c,
  }));
  const sedeOptions: FilterOption[] = sedesParticipantes.map((s) => ({
    value: s.id,
    label: s.nombre,
  }));
  const escuelaOptions: FilterOption[] = escuelasParticipantes.map((e) => ({
    value: e.id,
    label: e.nombre,
  }));
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

  const getSortValue = (key: SortKey, p: (typeof list)[number]): string => {
    switch (key) {
      case 'rol':
        return p.rol ?? '';
      case 'nombre':
        return p.displayName ?? p.user?.name ?? p.nombre ?? '';
      case 'rut':
        return p.rut ?? '';
      case 'correo':
        return p.user?.email ?? p.email ?? '';
      case 'cargo':
        return p.cargo ?? '';
      case 'sede':
        return p.sede?.nombre ?? '';
      case 'escuela':
        return p.escuela?.nombre ?? '';
      case 'carrera':
        return p.carrera?.nombre ?? '';
      case 'asignatura':
        return p.asignatura?.nombre ?? '';
      case 'socio':
        return p.rol === 'Beneficiario'
          ? (p.socioComunitario?.nombre ?? '')
          : '';
      case 'labor':
        return p.laborEnProyecto ?? '';
      default:
        return '';
    }
  };

  const filteredParticipants = useMemo(() => {
    let filtered = list.filter((p) => {
      const cargo = (p.cargo ?? '').trim().toLowerCase();
      const socioId = p.socioComunitario?.id ?? '';
      const sedeId = p.sede?.id ?? '';
      const escuelaId = p.escuela?.id ?? '';

      if (rolesSelected.length > 0 && !rolesSelected.includes(p.rol))
        return false;
      if (cargosSelected.length > 0) {
        const match =
          cargo &&
          cargosSelected.some((c) => c.trim().toLowerCase() === cargo);
        if (!match) return false;
      }
      if (sedesSelected.length > 0 && !sedesSelected.includes(sedeId))
        return false;
      if (escuelasSelected.length > 0 && !escuelasSelected.includes(escuelaId))
        return false;
      if (sociosSelected.length > 0 && p.rol === 'Beneficiario') {
        if (!socioId || !sociosSelected.includes(socioId)) return false;
      }
      return true;
    });

    if (sort.key) {
      filtered = [...filtered].sort((a, b) => {
        const va = getSortValue(sort.key!, a);
        const vb = getSortValue(sort.key!, b);
        const res = String(va).localeCompare(String(vb), 'es');
        return sort.dir === 'asc' ? res : -res;
      });
    }

    return filtered;
  }, [
    list,
    rolesSelected,
    cargosSelected,
    sociosSelected,
    sedesSelected,
    escuelasSelected,
    sort,
  ]);

  /** Personas con el rol indicado aún no agregadas con ese rol en este proyecto. */
  const getPersonaOptions = (
    rol: string,
    excludeParticipanteId?: string | null
  ) => {
    const pool = usuariosPorRolApp[rol] ?? [];
    const already = new Set(
      list
        .filter(
          (p) =>
            p.rol === rol &&
            (!excludeParticipanteId || p.id !== excludeParticipanteId)
        )
        .flatMap((p) => {
          const keys: string[] = [];
          if (p.userId) keys.push(`id:${p.userId}`);
          const email = (p.user?.email ?? p.email)?.trim().toLowerCase();
          if (email) keys.push(`email:${email}`);
          return keys;
        })
    );
    return pool.filter((u) => {
      if (already.has(`id:${u.id}`)) return false;
      if (already.has(`email:${u.email.trim().toLowerCase()}`)) return false;
      return true;
    });
  };

  const resolvePersonaSelectValue = (
    rol: string,
    email: string,
    nombre: string,
    isManual: boolean
  ) => {
    if (isManual) return NEW_PERSONA_VALUE;
    const pool = usuariosPorRolApp[rol] ?? [];
    const emailLower = email.trim().toLowerCase();
    if (emailLower) {
      const byEmail = pool.find(
        (u) => u.email.trim().toLowerCase() === emailLower
      );
      if (byEmail) return byEmail.id;
    }
    return '';
  };

  const isPersonaFromList = (rol: string, email: string) => {
    if (!isSyncableParticipanteRol(rol) || !email.trim()) return false;
    const pool = usuariosPorRolApp[rol] ?? [];
    return pool.some(
      (u) => u.email.trim().toLowerCase() === email.trim().toLowerCase()
    );
  };

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

  const handleExport = async () => {
    const XLSX = await import('xlsx');
    const headers = [
      'Rol',
      'Nombre',
      'Rut',
      'Correo',
      'Cargo',
      'Sede',
      'Escuela',
      'Carrera',
      'Asignatura',
      'Socio comunitario',
      'Labor en el proyecto',
    ];
    const rows = filteredParticipants.map((p) => [
      p.rol,
      p.user?.name ?? p.nombre ?? 'Sin nombre',
      p.rut ?? '',
      p.user?.email ?? p.email ?? '',
      p.cargo ?? '',
      p.sede?.nombre ?? '—',
      p.escuela?.nombre ?? '—',
      p.carrera?.nombre ?? '—',
      p.asignatura?.nombre ?? '—',
      p.rol === 'Beneficiario' ? (p.socioComunitario?.nombre ?? '—') : '—',
      p.laborEnProyecto ?? '',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participantes');
    const nombreProyecto = (project?.proyecto ?? 'proyecto')
      .replace(/[^\w\s-]/gi, '')
      .trim()
      .slice(0, 50);
    XLSX.writeFile(wb, `participantes_${nombreProyecto}.xlsx`);
  };

  const renderColumnHead = (
    titulo: string,
    columna: SortKey,
    className: string,
    filter?: {
      value: string;
      onChange: (value: string) => void;
      options: FilterOption[];
    }
  ) => {
    const isSorted = sort.key === columna;
    const hasFilter = filter ? parseMultiFilter(filter.value).length > 0 : false;
    const isActive = isSorted || hasFilter;

    return (
      <TableHead
        className={cn(
          'sticky top-0 z-10 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/90 text-center text-[11px] font-medium tracking-wide text-gray-600 whitespace-normal break-words leading-tight px-1 py-1.5 h-auto',
          className
        )}
      >
        <div className="flex items-start justify-center gap-0.5">
          <span className="leading-tight break-words">{titulo}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-6 w-6 p-0',
                  isActive
                    ? 'text-emerald-600 hover:text-emerald-700'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[200px]">
              <DropdownMenuItem
                onClick={() => setSort({ key: columna, dir: 'asc' })}
              >
                Ordenar ASC
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSort({ key: columna, dir: 'desc' })}
              >
                Ordenar DESC
              </DropdownMenuItem>
              {filter && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Filtrar
                  </div>
                  {filter.options.length === 0 ? (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">
                      Sin opciones
                    </p>
                  ) : (
                    <div className="max-h-[220px] overflow-y-auto px-1 pb-1 space-y-0.5">
                      {filter.options.map((opt) => {
                        const checked = parseMultiFilter(filter.value).includes(
                          opt.value
                        );
                        return (
                          <label
                            key={opt.value}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-accent"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() =>
                                filter.onChange(
                                  toggleFilterValue(filter.value, opt.value)
                                )
                              }
                            />
                            <span className="text-sm">{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {hasFilter && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => filter.onChange('')}>
                        Limpiar filtro
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableHead>
    );
  };

  const countCards = [
    {
      key: 'encargados',
      icon: Crown,
      value: counts.encargados,
      label: 'Encargados',
    },
    {
      key: 'coordinadores',
      icon: UserCog,
      value: counts.coordinadores,
      label: 'Coordinadores',
    },
    {
      key: 'colaboradores',
      icon: Users,
      value: counts.colaboradores,
      label: 'Colaboradores',
    },
    {
      key: 'docentes',
      icon: GraduationCap,
      value: counts.docentes,
      label: 'Docentes',
    },
    {
      key: 'estudiantes',
      icon: BookOpen,
      value: counts.estudiantes,
      label: 'Estudiantes',
    },
    {
      key: 'beneficiarios',
      icon: Heart,
      value: counts.beneficiarios,
      label: 'Beneficiarios',
    },
    {
      key: 'socios',
      icon: Handshake,
      value: counts.sociosComunitarios,
      label: 'Socios comunitarios',
    },
  ] as const;

  return (
    <>
      <div className="h-full overflow-hidden flex flex-col pt-4 px-4">
        {/* Tarjetas compactas a la izquierda + botones a la derecha */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-shrink-0">
          <div className="flex flex-wrap gap-2">
            {countCards.map(({ key, icon: Icon, value, label }) => (
              <Card
                key={key}
                className="py-2.5 px-3 border-gray-200 shadow-none rounded-lg bg-white w-auto shrink-0"
              >
                <CardContent className="p-0 flex items-center justify-center gap-2 text-gray-500">
                  <Icon
                    className="h-5 w-5 shrink-0 text-gray-400"
                    strokeWidth={1.75}
                  />
                  <span className="text-[18px] font-semibold tabular-nums text-gray-800">
                    {value}
                  </span>
                  <span className="text-[12px] font-medium tracking-wide text-gray-500">
                    {label}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex items-center gap-1 shrink-0 self-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    onClick={openEditarSociosDialog}
                    variant="ghost"
                    size="sm"
                    className="h-9 rounded-md transition-colors flex items-center justify-center border bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-purple-700 gap-1.5 px-3"
                  >
                    <Handshake className="h-3.5 w-3.5" />
                    <span className="text-[13px] font-medium tracking-wide">
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
                    onClick={handleExport}
                    variant="ghost"
                    size="sm"
                    className="h-9 rounded-md transition-colors flex items-center justify-center border ml-1 bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-emerald-700 gap-1.5 px-3"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    <span className="text-[13px] font-medium tracking-wide">
                      Exportar
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Exportar tabla de participantes a Excel (XLSX)</p>
                </TooltipContent>
              </Tooltip>
              {canImport && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={() => setImportOpen(true)}
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-md transition-colors flex items-center justify-center border ml-1 bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-blue-700 gap-1.5 px-3"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      <span className="text-[13px] font-medium tracking-wide">
                        Carga masiva
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Importar participantes desde Excel (solo altas)</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>

        <ImportExcelDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          tipo="participantes"
          proyectoId={project.id}
          onSuccess={async () => {
            const result = await getProyectoParticipantes(project.id);
            if (result.success && result.data) {
              setProject(
                (prev) =>
                  ({
                    ...prev,
                    participantes_rel: result.data,
                    participantes: result.data.length,
                  }) as ProyectoWithRelations
              );
            }
          }}
        />

        {/* Tabla */}
        <div className="flex-1 min-h-0 border border-gray-200 rounded-lg overflow-hidden flex flex-col bg-white">
          <div className="overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="border-b border-gray-100 hover:bg-transparent">
                  <TableHead
                    className={cn(
                      'sticky top-0 z-10 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/90 text-center border-r border-gray-200 px-0.5',
                      COL_W.acciones
                    )}
                  />
                  {renderColumnHead('Rol', 'rol', COL_W.rol, {
                    value: filterParticipantesRol,
                    onChange: setFilterParticipantesRol,
                    options: ROLES,
                  })}
                  {renderColumnHead('Nombre', 'nombre', COL_W.nombre)}
                  {renderColumnHead('Rut', 'rut', COL_W.rut)}
                  {renderColumnHead('Correo', 'correo', COL_W.correo)}
                  {renderColumnHead('Cargo', 'cargo', COL_W.cargo, {
                    value: filterParticipantesCargo,
                    onChange: setFilterParticipantesCargo,
                    options: cargoOptions,
                  })}
                  {renderColumnHead('Sede', 'sede', COL_W.sede, {
                    value: filterParticipantesSede,
                    onChange: setFilterParticipantesSede,
                    options: sedeOptions,
                  })}
                  {renderColumnHead('Escuela', 'escuela', COL_W.escuela, {
                    value: filterParticipantesEscuela,
                    onChange: setFilterParticipantesEscuela,
                    options: escuelaOptions,
                  })}
                  {renderColumnHead('Carrera', 'carrera', COL_W.carrera)}
                  {renderColumnHead(
                    'Asignatura',
                    'asignatura',
                    COL_W.asignatura
                  )}
                  {renderColumnHead('Socio comunitario', 'socio', COL_W.socio, {
                    value: filterParticipantesSocio,
                    onChange: setFilterParticipantesSocio,
                    options: socioOptions,
                  })}
                  {renderColumnHead(
                    'Labor en el proyecto',
                    'labor',
                    COL_W.labor
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.length === 0 && !isAddingParticipante ? (
                  <TableRow>
                    <TableCell
                      colSpan={COL_COUNT}
                      className="text-center text-[11px] text-gray-400 leading-[1.75] py-10"
                    >
                      No hay participantes que coincidan con los filtros.
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
                    const avatarImage = p.displayImage ?? p.user?.image;
                    const cargo = p.cargo ?? '';
                    const rut = p.rut ?? '';
                    const laborEnProyecto = p.laborEnProyecto ?? '';
                    const sedeNombre = p.sede?.nombre ?? '—';
                    const escuelaNombre = p.escuela?.nombre ?? '—';
                    const carreraNombre = p.carrera?.nombre ?? '—';
                    const asignaturaNombre = p.asignatura?.nombre ?? '—';
                    const socioComunitario =
                      p.rol === 'Beneficiario'
                        ? (p.socioComunitario?.nombre ?? '—')
                        : '—';
                    const colorClass =
                      ROLE_COLORS[p.rol] ??
                      'bg-gray-100 text-gray-800 border-gray-200';
                    const isEditing = editingParticipanteId === p.id;
                    const draft = isEditing ? editDraft : null;
                    const rutRequired =
                      (draft?.rol ?? p.rol) === 'Docente' ||
                      (draft?.rol ?? p.rol) === 'Estudiante';
                    const carreraAsignaturaRequired =
                      (draft?.rol ?? p.rol) === 'Estudiante';
                    return (
                      <TableRow
                        key={p.id}
                        className={`hover:bg-gray-50/80 border-b border-gray-100 ${isEditing ? 'bg-blue-50/50' : ''}`}
                      >
                        <TableCell className={ACCIONES_CELL}>
                          <div className="flex items-center justify-center gap-0.5">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={handleSaveEditParticipante}
                                  disabled={participanteSubmitting}
                                  className="p-1.5 bg-gray-100 rounded-full hover:bg-green-100 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Guardar cambios"
                                >
                                  <Check className="h-3.5 w-3.5 text-gray-700" />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditParticipante}
                                  disabled={participanteSubmitting}
                                  className="p-1.5 bg-gray-100 rounded-full hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Cancelar edición"
                                >
                                  <X className="h-3.5 w-3.5 text-gray-700" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditParticipante(p.id)}
                                  className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                                  title="Editar participante"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-gray-700" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteParticipante(p.id)}
                                  className="p-1.5 bg-gray-100 rounded-full hover:bg-red-100 transition-colors cursor-pointer"
                                  title="Eliminar participante"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-gray-700" />
                                </button>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={cn(CELL_BASE_CENTER, COL_W.rol)}>
                          {isEditing && draft ? (
                            <Select
                              value={draft.rol}
                              onValueChange={(v) => {
                                handleEditParticipanteRolChange(
                                  v as typeof draft.rol
                                );
                                setEditPersonaIsManual(false);
                              }}
                            >
                              <SelectTrigger className={SELECT_TRIGGER}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span
                              className={`inline-flex items-center rounded border px-1 py-0.5 text-[10px] font-medium whitespace-normal break-words leading-tight ${colorClass}`}
                            >
                              {p.rol}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className={cn(CELL_BASE, COL_W.nombre)}>
                          {isEditing && draft ? (
                            isSyncableParticipanteRol(draft.rol) ? (
                              <div className="flex flex-col gap-1 min-w-0">
                                <Select
                                  value={
                                    resolvePersonaSelectValue(
                                      draft.rol,
                                      draft.email,
                                      draft.nombre,
                                      editPersonaIsManual
                                    ) || SELECT_NONE_VALUE
                                  }
                                  onValueChange={(v) => {
                                    if (v === SELECT_NONE_VALUE) {
                                      setEditPersonaIsManual(false);
                                      clearPersonaFormFields('edit');
                                      return;
                                    }
                                    if (v === NEW_PERSONA_VALUE) {
                                      setEditPersonaIsManual(true);
                                      clearPersonaFormFields('edit');
                                      return;
                                    }
                                    setEditPersonaIsManual(false);
                                    applyPersonaUserToForm(
                                      v,
                                      'edit',
                                      draft.rol
                                    );
                                  }}
                                >
                                  <SelectTrigger className={SELECT_TRIGGER}>
                                    <SelectValue
                                      placeholder={`Seleccionar ${draft.rol.toLowerCase()} *`}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={SELECT_NONE_VALUE}>
                                      Seleccionar {draft.rol.toLowerCase()} *
                                    </SelectItem>
                                    <SelectItem value={NEW_PERSONA_VALUE}>
                                      Nueva persona…
                                    </SelectItem>
                                    {getPersonaOptions(draft.rol, p.id).map(
                                      (u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                          {u.name?.trim()
                                            ? `${u.name.trim()} (${u.email})`
                                            : u.email}
                                          {!u.hasAccount
                                            ? ' · sin cuenta'
                                            : ''}
                                        </SelectItem>
                                      )
                                    )}
                                  </SelectContent>
                                </Select>
                                {editPersonaIsManual && (
                                  <Input
                                    value={draft.nombre}
                                    onChange={(e) =>
                                      setEditDraft((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              nombre: e.target.value,
                                            }
                                          : prev
                                      )
                                    }
                                    placeholder="Nombre *"
                                    className={INPUT_CELL}
                                  />
                                )}
                              </div>
                            ) : (
                              <Input
                                value={draft.nombre}
                                onChange={(e) =>
                                  setEditDraft((prev) =>
                                    prev
                                      ? { ...prev, nombre: e.target.value }
                                      : prev
                                  )
                                }
                                className={INPUT_CELL}
                              />
                            )
                          ) : (
                            <div className="flex items-start gap-1.5 min-w-0">
                              <Avatar className="h-6 w-6 shrink-0 rounded-full ring-1 ring-gray-200">
                                {avatarImage ? (
                                  <AvatarImage
                                    src={avatarImage}
                                    alt={nombre}
                                  />
                                ) : null}
                                <AvatarFallback className="bg-gray-50 text-gray-500">
                                  <Users className="h-3 w-3" />
                                </AvatarFallback>
                              </Avatar>
                              <span className={`${CELL_TEXT} font-medium text-gray-900 whitespace-normal break-words leading-snug`}>
                                {nombre}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className={cn(CELL_BASE, COL_W.rut)}>
                          {isEditing && draft ? (
                            <Input
                              value={draft.rut}
                              onChange={(e) =>
                                setEditDraft((prev) =>
                                  prev
                                    ? { ...prev, rut: e.target.value }
                                    : prev
                                )
                              }
                              placeholder={rutRequired ? 'Rut *' : 'Rut'}
                              className={INPUT_CELL}
                            />
                          ) : (
                            rut || '—'
                          )}
                        </TableCell>
                        <TableCell
                          className={cn(CELL_BASE, COL_W.correo, 'text-gray-500')}
                        >
                          {isEditing && draft ? (
                            <Input
                              value={draft.email}
                              onChange={(e) =>
                                setEditDraft((prev) =>
                                  prev
                                    ? { ...prev, email: e.target.value }
                                    : prev
                                )
                              }
                              placeholder="Correo *"
                              className={INPUT_CELL}
                              readOnly={isPersonaFromList(
                                draft.rol,
                                draft.email
                              )}
                              title={
                                isPersonaFromList(draft.rol, draft.email)
                                  ? 'Se completa al seleccionar la persona'
                                  : undefined
                              }
                            />
                          ) : (
                            email || '—'
                          )}
                        </TableCell>
                        <TableCell className={cn(CELL_BASE, COL_W.cargo)}>
                          {isEditing && draft ? (
                            <Input
                              value={draft.cargo}
                              onChange={(e) =>
                                setEditDraft((prev) =>
                                  prev
                                    ? { ...prev, cargo: e.target.value }
                                    : prev
                                )
                              }
                              className={INPUT_CELL}
                            />
                          ) : (
                            cargo || '—'
                          )}
                        </TableCell>
                        <TableCell className={cn(CELL_BASE, COL_W.sede)}>
                          {isEditing && draft ? (
                            <Select
                              value={draft.sedeId || SELECT_NONE_VALUE}
                              onValueChange={(v) =>
                                setEditDraft((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        sedeId:
                                          v === SELECT_NONE_VALUE ? '' : v,
                                      }
                                    : prev
                                )
                              }
                            >
                              <SelectTrigger className={SELECT_TRIGGER}>
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
                          ) : (
                            sedeNombre
                          )}
                        </TableCell>
                        <TableCell className={cn(CELL_BASE, COL_W.escuela)}>
                          {isEditing && draft ? (
                            <Select
                              value={draft.escuelaId || SELECT_NONE_VALUE}
                              onValueChange={(v) =>
                                setEditDraft((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        escuelaId:
                                          v === SELECT_NONE_VALUE ? '' : v,
                                      }
                                    : prev
                                )
                              }
                            >
                              <SelectTrigger className={SELECT_TRIGGER}>
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
                          ) : (
                            escuelaNombre
                          )}
                        </TableCell>
                        <TableCell className={cn(CELL_BASE, COL_W.carrera)}>
                          {isEditing && draft ? (
                            <Select
                              value={draft.carreraId || SELECT_NONE_VALUE}
                              onValueChange={(v) =>
                                setEditDraft((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        carreraId:
                                          v === SELECT_NONE_VALUE ? '' : v,
                                      }
                                    : prev
                                )
                              }
                            >
                              <SelectTrigger className={SELECT_TRIGGER}>
                                <SelectValue
                                  placeholder={
                                    carreraAsignaturaRequired
                                      ? 'Carrera *'
                                      : 'Carrera'
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={SELECT_NONE_VALUE}>
                                  —
                                </SelectItem>
                                {carrerasParticipantes.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            carreraNombre
                          )}
                        </TableCell>
                        <TableCell className={cn(CELL_BASE, COL_W.asignatura)}>
                          {isEditing && draft ? (
                            <Select
                              value={draft.asignaturaId || SELECT_NONE_VALUE}
                              onValueChange={(v) =>
                                setEditDraft((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        asignaturaId:
                                          v === SELECT_NONE_VALUE ? '' : v,
                                      }
                                    : prev
                                )
                              }
                            >
                              <SelectTrigger className={SELECT_TRIGGER}>
                                <SelectValue
                                  placeholder={
                                    carreraAsignaturaRequired
                                      ? 'Asignatura *'
                                      : 'Asignatura'
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={SELECT_NONE_VALUE}>
                                  —
                                </SelectItem>
                                {asignaturasParticipantes.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            asignaturaNombre
                          )}
                        </TableCell>
                        <TableCell className={cn(CELL_BASE, COL_W.socio)}>
                          {isEditing && draft && draft.rol === 'Beneficiario' ? (
                            <Select
                              value={draft.socioComunitarioId}
                              onValueChange={(v) =>
                                setEditDraft((prev) =>
                                  prev
                                    ? { ...prev, socioComunitarioId: v }
                                    : prev
                                )
                              }
                            >
                              <SelectTrigger className={SELECT_TRIGGER}>
                                <SelectValue placeholder="Socio comunitario" />
                              </SelectTrigger>
                              <SelectContent>
                                {socioOptions.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            socioComunitario
                          )}
                        </TableCell>
                        <TableCell className={cn(CELL_BASE, COL_W.labor)}>
                          {isEditing && draft ? (
                            <Input
                              value={draft.laborEnProyecto}
                              onChange={(e) =>
                                setEditDraft((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        laborEnProyecto: e.target.value,
                                      }
                                    : prev
                                )
                              }
                              placeholder="Labor en el proyecto"
                              className={INPUT_CELL}
                            />
                          ) : (
                            laborEnProyecto || '—'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}

                {isAddingParticipante && (
                  <TableRow className="bg-blue-50 border-2 border-blue-200">
                    <TableCell className={ACCIONES_CELL}>
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          type="button"
                          onClick={handleSaveNewParticipante}
                          disabled={participanteSubmitting}
                          className="p-1.5 bg-gray-100 rounded-full hover:bg-green-100 transition-colors cursor-pointer disabled:opacity-50"
                          title={
                            participanteSubmitting
                              ? 'Guardando...'
                              : 'Guardar participante'
                          }
                        >
                          <Check className="h-3.5 w-3.5 text-gray-700" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelAddingParticipante}
                          disabled={participanteSubmitting}
                          className="p-1.5 bg-gray-100 rounded-full hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                          title="Cancelar"
                        >
                          <X className="h-3.5 w-3.5 text-gray-700" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className={cn(CELL_BASE_CENTER, COL_W.rol)}>
                      <Select
                        value={newParticipanteData.rol}
                        onValueChange={(v) => {
                          setNewPersonaIsManual(false);
                          handleNewParticipanteRolChange(
                            v as typeof newParticipanteData.rol
                          );
                        }}
                      >
                        <SelectTrigger className={SELECT_TRIGGER}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className={cn(CELL_BASE, COL_W.nombre)}>
                      {isSyncableParticipanteRol(newParticipanteData.rol) ? (
                        <div className="flex flex-col gap-1 min-w-0">
                          <Select
                            value={
                              resolvePersonaSelectValue(
                                newParticipanteData.rol,
                                newParticipanteData.email,
                                newParticipanteData.nombre,
                                newPersonaIsManual
                              ) || SELECT_NONE_VALUE
                            }
                            onValueChange={(v) => {
                              if (v === SELECT_NONE_VALUE) {
                                setNewPersonaIsManual(false);
                                clearPersonaFormFields('new');
                                return;
                              }
                              if (v === NEW_PERSONA_VALUE) {
                                setNewPersonaIsManual(true);
                                clearPersonaFormFields('new');
                                return;
                              }
                              setNewPersonaIsManual(false);
                              applyPersonaUserToForm(
                                v,
                                'new',
                                newParticipanteData.rol
                              );
                            }}
                          >
                            <SelectTrigger className={SELECT_TRIGGER}>
                              <SelectValue
                                placeholder={`Seleccionar ${newParticipanteData.rol.toLowerCase()} *`}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={SELECT_NONE_VALUE}>
                                Seleccionar{' '}
                                {newParticipanteData.rol.toLowerCase()} *
                              </SelectItem>
                              <SelectItem value={NEW_PERSONA_VALUE}>
                                Nueva persona…
                              </SelectItem>
                              {getPersonaOptions(newParticipanteData.rol).map(
                                (u) => (
                                  <SelectItem key={u.id} value={u.id}>
                                    {u.name?.trim()
                                      ? `${u.name.trim()} (${u.email})`
                                      : u.email}
                                    {!u.hasAccount ? ' · sin cuenta' : ''}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                          {newPersonaIsManual && (
                            <Input
                              value={newParticipanteData.nombre}
                              onChange={(e) =>
                                setNewParticipanteData((prev) => ({
                                  ...prev,
                                  nombre: e.target.value,
                                }))
                              }
                              placeholder="Nombre *"
                              className={INPUT_CELL}
                            />
                          )}
                        </div>
                      ) : (
                        <Input
                          value={newParticipanteData.nombre}
                          onChange={(e) =>
                            setNewParticipanteData((prev) => ({
                              ...prev,
                              nombre: e.target.value,
                            }))
                          }
                          placeholder="Nombre *"
                          className={INPUT_CELL}
                        />
                      )}
                    </TableCell>
                    <TableCell className={cn(CELL_BASE, COL_W.rut)}>
                      <Input
                        value={newParticipanteData.rut}
                        onChange={(e) =>
                          setNewParticipanteData((prev) => ({
                            ...prev,
                            rut: e.target.value,
                          }))
                        }
                        placeholder={
                          newParticipanteData.rol === 'Docente' ||
                          newParticipanteData.rol === 'Estudiante'
                            ? 'Rut *'
                            : 'Rut'
                        }
                        className={INPUT_CELL}
                      />
                    </TableCell>
                    <TableCell className={cn(CELL_BASE, COL_W.correo)}>
                      <Input
                        value={newParticipanteData.email}
                        onChange={(e) =>
                          setNewParticipanteData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        placeholder="Correo *"
                        className={INPUT_CELL}
                        readOnly={
                          !newPersonaIsManual &&
                          isPersonaFromList(
                            newParticipanteData.rol,
                            newParticipanteData.email
                          )
                        }
                        title={
                          !newPersonaIsManual &&
                          isPersonaFromList(
                            newParticipanteData.rol,
                            newParticipanteData.email
                          )
                            ? 'Se completa al seleccionar la persona'
                            : undefined
                        }
                      />
                    </TableCell>
                    <TableCell className={cn(CELL_BASE, COL_W.cargo)}>
                      <Input
                        value={newParticipanteData.cargo}
                        onChange={(e) =>
                          setNewParticipanteData((prev) => ({
                            ...prev,
                            cargo: e.target.value,
                          }))
                        }
                        placeholder="Cargo"
                        className={INPUT_CELL}
                      />
                    </TableCell>
                    <TableCell className={cn(CELL_BASE, COL_W.sede)}>
                      <Select
                        value={
                          newParticipanteData.sedeId || SELECT_NONE_VALUE
                        }
                        onValueChange={(v) =>
                          setNewParticipanteData((prev) => ({
                            ...prev,
                            sedeId: v === SELECT_NONE_VALUE ? '' : v,
                          }))
                        }
                      >
                        <SelectTrigger className={SELECT_TRIGGER}>
                          <SelectValue placeholder="Sede" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SELECT_NONE_VALUE}>—</SelectItem>
                          {sedesParticipantes.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className={cn(CELL_BASE, COL_W.escuela)}>
                      <Select
                        value={
                          newParticipanteData.escuelaId || SELECT_NONE_VALUE
                        }
                        onValueChange={(v) =>
                          setNewParticipanteData((prev) => ({
                            ...prev,
                            escuelaId: v === SELECT_NONE_VALUE ? '' : v,
                          }))
                        }
                      >
                        <SelectTrigger className={SELECT_TRIGGER}>
                          <SelectValue placeholder="Escuela" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SELECT_NONE_VALUE}>—</SelectItem>
                          {escuelasParticipantes.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className={cn(CELL_BASE, COL_W.carrera)}>
                      <Select
                        value={
                          newParticipanteData.carreraId || SELECT_NONE_VALUE
                        }
                        onValueChange={(v) =>
                          setNewParticipanteData((prev) => ({
                            ...prev,
                            carreraId: v === SELECT_NONE_VALUE ? '' : v,
                          }))
                        }
                      >
                        <SelectTrigger className={SELECT_TRIGGER}>
                          <SelectValue
                            placeholder={
                              newParticipanteData.rol === 'Estudiante'
                                ? 'Carrera *'
                                : 'Carrera'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SELECT_NONE_VALUE}>—</SelectItem>
                          {carrerasParticipantes.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className={cn(CELL_BASE, COL_W.asignatura)}>
                      <Select
                        value={
                          newParticipanteData.asignaturaId || SELECT_NONE_VALUE
                        }
                        onValueChange={(v) =>
                          setNewParticipanteData((prev) => ({
                            ...prev,
                            asignaturaId: v === SELECT_NONE_VALUE ? '' : v,
                          }))
                        }
                      >
                        <SelectTrigger className={SELECT_TRIGGER}>
                          <SelectValue
                            placeholder={
                              newParticipanteData.rol === 'Estudiante'
                                ? 'Asignatura *'
                                : 'Asignatura'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SELECT_NONE_VALUE}>—</SelectItem>
                          {asignaturasParticipantes.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className={cn(CELL_BASE, COL_W.socio)}>
                      {newParticipanteData.rol === 'Beneficiario' ? (
                        <Select
                          value={newParticipanteData.socioComunitarioId}
                          onValueChange={(v) =>
                            setNewParticipanteData((prev) => ({
                              ...prev,
                              socioComunitarioId: v,
                            }))
                          }
                        >
                          <SelectTrigger className={SELECT_TRIGGER}>
                            <SelectValue placeholder="Socio comunitario *" />
                          </SelectTrigger>
                          <SelectContent>
                            {socioOptions.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className={cn(CELL_BASE, COL_W.labor)}>
                      <Input
                        value={newParticipanteData.laborEnProyecto}
                        onChange={(e) =>
                          setNewParticipanteData((prev) => ({
                            ...prev,
                            laborEnProyecto: e.target.value,
                          }))
                        }
                        placeholder="Labor en el proyecto"
                        className={INPUT_CELL}
                      />
                    </TableCell>
                  </TableRow>
                )}

                {!isAddingParticipante && (
                  <TableRow
                    className="hover:bg-green-50/70 transition-colors cursor-pointer border-t-2 border-dashed border-gray-200"
                    onClick={startAddingParticipante}
                  >
                    <TableCell colSpan={COL_COUNT} className="text-center py-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startAddingParticipante();
                        }}
                        className="p-3 bg-gray-100 rounded-full hover:bg-green-100 transition-colors cursor-pointer inline-flex items-center justify-center"
                        title="Agregar participante"
                      >
                        <Plus className="h-5 w-5 text-gray-700" />
                      </button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <EditarSociosComunitariosDialog
        isEditarSociosOpen={isEditarSociosOpen}
        setIsEditarSociosOpen={setIsEditarSociosOpen}
        editarSociosIds={editarSociosIds}
        setEditarSociosIds={setEditarSociosIds}
        editarSociosCatalog={editarSociosCatalog}
        nuevoSocioNombre={nuevoSocioNombre}
        setNuevoSocioNombre={setNuevoSocioNombre}
        nuevoSocioDescripcion={nuevoSocioDescripcion}
        setNuevoSocioDescripcion={setNuevoSocioDescripcion}
        nuevoSocioSaving={nuevoSocioSaving}
        editarSociosSaving={editarSociosSaving}
        handleCreateNuevoSocio={handleCreateNuevoSocio}
        handleSaveEditarSocios={handleSaveEditarSocios}
      />
    </>
  );
}

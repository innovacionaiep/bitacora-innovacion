'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  addParticipanteProyecto,
  deleteParticipanteProyecto,
  updateParticipanteProyecto,
} from '@/lib/actions/proyectos-participantes';
import { getProyectoParticipantes } from '@/lib/actions/proyectos';
import {
  getSedes,
  getEscuelas as getEscuelasConfig,
  getCarreras as getCarrerasConfig,
  getAsignaturas as getAsignaturasConfig,
} from '@/lib/actions/configuracion';
import {
  listUsersByAppRole,
  type UserByRoleOption,
} from '@/lib/actions/usuarios';
import type { ProyectoWithRelations } from '@/types/proyecto';
import {
  sedesKey,
  escuelasConfigKey,
  carrerasConfigKey,
  asignaturasConfigKey,
  usersByAppRoleKey,
  proyectoParticipantesKey,
  catalogosGeneralKey,
} from '@/lib/query-keys';
import type { CatalogosGeneral } from './general-tab-utils';
import {
  emptyNewParticipanteData,
  validateParticipanteForm,
  type NewParticipanteForm,
  isSyncableParticipanteRol,
} from './participantes-tab-utils';
import type { Role } from '@/lib/auth-utils';
import { useEditarSociosComunitarios } from './useEditarSociosComunitarios';

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

export function useParticipantesTab({
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
  const queryClient = useQueryClient();
  const [filterParticipantesRol, setFilterParticipantesRol] = useState('');
  const [filterParticipantesCargo, setFilterParticipantesCargo] = useState('');
  const [filterParticipantesSocio, setFilterParticipantesSocio] = useState('');
  const [filterParticipantesSede, setFilterParticipantesSede] = useState('');
  const [filterParticipantesEscuela, setFilterParticipantesEscuela] =
    useState('');

  const [isAddingParticipante, setIsAddingParticipante] = useState(false);
  const [editingParticipanteId, setEditingParticipanteId] = useState<
    string | null
  >(null);
  const [editDraft, setEditDraft] = useState<NewParticipanteForm | null>(null);
  const [newParticipanteData, setNewParticipanteData] =
    useState<NewParticipanteForm>(emptyNewParticipanteData());
  const [sedesParticipantes, setSedesParticipantes] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [escuelasParticipantes, setEscuelasParticipantes] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [carrerasParticipantes, setCarrerasParticipantes] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [asignaturasParticipantes, setAsignaturasParticipantes] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [usuariosPorRolApp, setUsuariosPorRolApp] = useState<
    Record<string, UserByRoleOption[]>
  >({});
  const [participanteSubmitting, setParticipanteSubmitting] = useState(false);

  const {
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
    openEditarSociosDialog,
    handleCreateNuevoSocio,
    handleSaveEditarSocios,
  } = useEditarSociosComunitarios({
    project,
    setProject,
    onSaveSuccess,
  });

  /** Carga usuarios del rol solo cuando hace falta el selector de persona (add/edit). */
  const ensureUsuariosPorRol = (rol: string) => {
    if (!isSyncableParticipanteRol(rol)) return;
    void queryClient
      .fetchQuery({
        queryKey: usersByAppRoleKey(rol),
        queryFn: () => listUsersByAppRole(rol as Role),
        staleTime: 5 * 60_000,
      })
      .then((res) => {
        if (res?.success && res.data) {
          setUsuariosPorRolApp((prev) =>
            prev[rol] === res.data ? prev : { ...prev, [rol]: res.data! }
          );
        }
      });
  };

  const startAddingParticipante = () => {
    setEditingParticipanteId(null);
    setEditDraft(null);
    setIsAddingParticipante(true);
    ensureUsuariosPorRol(newParticipanteData.rol);
  };

  const cancelAddingParticipante = () => {
    setIsAddingParticipante(false);
    setNewParticipanteData(emptyNewParticipanteData());
  };

  /** Al elegir una persona existente, precarga perfil centralizado. */
  const applyPersonaUserToForm = (
    userId: string,
    target: 'new' | 'edit',
    rol: string
  ) => {
    const pool = usuariosPorRolApp[rol] ?? [];
    const user = pool.find((u) => u.id === userId);
    if (!user) return;
    const patch: Partial<NewParticipanteForm> = {
      nombre: user.name?.trim() || user.email,
      email: user.email,
      rut: user.rut ?? '',
      cargo: user.cargo ?? '',
      sedeId: user.sedeId ?? '',
      escuelaId: user.escuelaId ?? '',
    };
    if (target === 'new') {
      setNewParticipanteData((prev) => ({ ...prev, ...patch }));
    } else {
      setEditDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    }
  };

  const clearPersonaFormFields = (target: 'new' | 'edit') => {
    const patch = {
      nombre: '',
      email: '',
      rut: '',
      cargo: '',
      sedeId: '',
      escuelaId: '',
    };
    if (target === 'new') {
      setNewParticipanteData((prev) => ({ ...prev, ...patch }));
    } else {
      setEditDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    }
  };

  const handleNewParticipanteRolChange = (rol: NewParticipanteForm['rol']) => {
    setNewParticipanteData((prev) => {
      if (isSyncableParticipanteRol(rol) && prev.rol !== rol) {
        return {
          ...prev,
          rol,
          nombre: '',
          email: '',
          rut: '',
          cargo: '',
          sedeId: '',
          escuelaId: '',
        };
      }
      return { ...prev, rol };
    });
    if (isSyncableParticipanteRol(rol)) {
      ensureUsuariosPorRol(rol);
    }
  };

  const handleEditParticipanteRolChange = (rol: NewParticipanteForm['rol']) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      if (prev.rol === rol) return prev;
      // Solo cambia el rol: conserva nombre/email/rut/cargo/sede/escuela.
      // Vaciar al cambiar de Coordinador↔Encargado (etc.) borraba datos
      // cuando el usuario solo quería ajustar el rol en el proyecto.
      return { ...prev, rol };
    });
    if (isSyncableParticipanteRol(rol)) {
      ensureUsuariosPorRol(rol);
    }
  };

  const startEditParticipante = (participanteId: string) => {
    const existing = project.participantes_rel?.find(
      (p) => p.id === participanteId
    );
    if (!existing) return;
    const rol =
      (existing.rol as NewParticipanteForm['rol']) || 'Colaborador';
    setIsAddingParticipante(false);
    setEditingParticipanteId(participanteId);
    setEditDraft({
      rol,
      nombre:
        existing.displayName ??
        existing.user?.name ??
        existing.nombre ??
        '',
      rut: existing.rut ?? '',
      email: existing.user?.email ?? existing.email ?? '',
      cargo: existing.cargo ?? '',
      laborEnProyecto: existing.laborEnProyecto ?? '',
      socioComunitarioId: existing.socioComunitario?.id ?? '',
      sedeId: existing.sede?.id ?? '',
      escuelaId: existing.escuela?.id ?? '',
      carreraId: existing.carrera?.id ?? '',
      asignaturaId: existing.asignatura?.id ?? '',
    });
    ensureUsuariosPorRol(rol);
  };

  const cancelEditParticipante = () => {
    setEditingParticipanteId(null);
    setEditDraft(null);
  };

  const handleSaveNewParticipante = async () => {
    const {
      rol,
      nombre,
      rut,
      email,
      cargo,
      laborEnProyecto,
      socioComunitarioId,
      sedeId,
      escuelaId,
      carreraId,
      asignaturaId,
    } = newParticipanteData;
    const validationError = validateParticipanteForm({
      rol,
      nombre,
      email,
      rut,
      socioComunitarioId,
      carreraId,
      asignaturaId,
    });
    if (validationError) {
      alert(validationError);
      return;
    }

    const tempId = `temp-part-${Date.now()}`;
    const sede = sedeId
      ? sedesParticipantes.find((s) => s.id === sedeId) ?? null
      : null;
    const escuela = escuelaId
      ? escuelasParticipantes.find((e) => e.id === escuelaId) ?? null
      : null;
    const carrera = carreraId
      ? carrerasParticipantes.find((c) => c.id === carreraId) ?? null
      : null;
    const asignatura = asignaturaId
      ? asignaturasParticipantes.find((a) => a.id === asignaturaId) ?? null
      : null;
    const socio =
      rol === 'Beneficiario' && socioComunitarioId
        ? editarSociosCatalog.find((s) => s.id === socioComunitarioId) ??
          project.sociosComunitarios?.find(
            (s) => s.socioComunitarioId === socioComunitarioId
          )?.socioComunitario ??
          null
        : null;

    const optimisticRow = {
      id: tempId,
      proyectoId: project.id,
      userId: null,
      rol,
      nombre: nombre.trim(),
      rut: rut.trim() || null,
      email: email.trim(),
      cargo: cargo.trim() || null,
      laborEnProyecto: laborEnProyecto.trim() || null,
      socioComunitarioId:
        rol === 'Beneficiario' ? socioComunitarioId || null : null,
      sedeId: sedeId || null,
      escuelaId: escuelaId || null,
      carreraId: carreraId || null,
      asignaturaId: asignaturaId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: null,
      socioComunitario: socio,
      sede,
      escuela,
      carrera,
      asignatura,
      displayName: nombre.trim(),
      displayImage: null,
    };

    const nextAfterAdd = [
      ...(project.participantes_rel ?? []),
      optimisticRow,
    ];
    setProject((prev) => {
      if (!prev || prev.id !== project.id) return prev;
      const base = prev.participantes_rel ?? project.participantes_rel ?? [];
      // Si hubo deletes concurrentes, partimos del estado más reciente.
      const withoutDup = base.filter((p) => p.id !== tempId);
      const merged = [...withoutDup, optimisticRow];
      queryClient.setQueryData(
        proyectoParticipantesKey(project.id),
        merged
      );
      return {
        ...prev,
        participantes_rel: merged,
        participantes: merged.length,
      } as ProyectoWithRelations;
    });
    setIsAddingParticipante(false);
    setNewParticipanteData(emptyNewParticipanteData());

    setParticipanteSubmitting(true);
    const result = await addParticipanteProyecto(project.id, {
      rol,
      nombre: nombre.trim(),
      rut: rut.trim() || undefined,
      email: email.trim(),
      cargo: cargo.trim() || undefined,
      laborEnProyecto: laborEnProyecto.trim() || undefined,
      socioComunitarioId:
        rol === 'Beneficiario' ? socioComunitarioId || undefined : undefined,
      sedeId: sedeId || undefined,
      escuelaId: escuelaId || undefined,
      carreraId: carreraId || undefined,
      asignaturaId: asignaturaId || undefined,
    });
    setParticipanteSubmitting(false);

    if (result.success && result.data) {
      const serverParts =
        (result.data as ProyectoWithRelations).participantes_rel ?? [];
      const emailNorm = email.trim().toLowerCase();
      const created =
        serverParts.find(
          (p) =>
            (p.email ?? p.user?.email ?? '').toLowerCase() === emailNorm &&
            p.rol === rol
        ) ??
        serverParts.find(
          (p) => !nextAfterAdd.some((l) => l.id === p.id && l.id !== tempId)
        );

      setProject((prev) => {
        if (!prev) return prev;
        // Preservar deletes/edits concurrentes: solo sustituir la fila temp.
        const local = prev.participantes_rel ?? [];
        const merged = created
          ? local.map((p) =>
              p.id === tempId ? ({ ...created } as (typeof local)[number]) : p
            )
          : local.filter((p) => p.id !== tempId);
        queryClient.setQueryData(
          proyectoParticipantesKey(project.id),
          merged
        );
        return {
          ...prev,
          participantes_rel: merged,
          participantes: merged.length,
          sociosComunitarios:
            (result.data as ProyectoWithRelations).sociosComunitarios ??
            prev.sociosComunitarios,
        } as ProyectoWithRelations;
      });
      onSaveSuccess();
      if (isSyncableParticipanteRol(rol)) {
        void queryClient.invalidateQueries({
          queryKey: usersByAppRoleKey(rol),
        });
        void listUsersByAppRole(rol as Role).then((res) => {
          if (res.success && res.data) {
            setUsuariosPorRolApp((prev) => ({ ...prev, [rol]: res.data! }));
          }
        });
      }
    } else {
      // Rollback concurrente-safe: solo quitar la fila temp (no revivir deletes).
      setProject((prev) => {
        if (!prev) return prev;
        const local = (prev.participantes_rel ?? []).filter(
          (p) => p.id !== tempId
        );
        queryClient.setQueryData(
          proyectoParticipantesKey(project.id),
          local
        );
        return {
          ...prev,
          participantes_rel: local,
          participantes: local.length,
        } as ProyectoWithRelations;
      });
      alert(result.error ?? 'Error al agregar participante');
    }
  };

  const handleSaveEditParticipante = async () => {
    if (!editingParticipanteId || !editDraft) return;
    const {
      rol,
      nombre,
      rut,
      email,
      cargo,
      laborEnProyecto,
      socioComunitarioId,
      sedeId,
      escuelaId,
      carreraId,
      asignaturaId,
    } = editDraft;
    const validationError = validateParticipanteForm({
      rol,
      nombre,
      email,
      rut,
      socioComunitarioId,
      carreraId,
      asignaturaId,
    });
    if (validationError) {
      alert(validationError);
      return;
    }

    const participanteId = editingParticipanteId;
    const previousProject = project;
    const existing = project.participantes_rel?.find(
      (p) => p.id === participanteId
    );
    if (!existing) return;

    const nextSedeId = sedeId || null;
    const nextEscuelaId = escuelaId || null;
    const nextCarreraId = carreraId || null;
    const nextAsignaturaId = asignaturaId || null;
    const nextSocioId =
      rol === 'Beneficiario' ? socioComunitarioId || null : null;

    const patched = {
      ...existing,
      rol,
      nombre: nombre.trim(),
      displayName: nombre.trim(),
      rut: rut.trim() || null,
      email: email.trim(),
      cargo: cargo.trim() || null,
      laborEnProyecto: laborEnProyecto.trim() || null,
      socioComunitarioId: nextSocioId,
      socioComunitario:
        nextSocioId == null
          ? null
          : editarSociosCatalog.find((s) => s.id === nextSocioId) ??
            project.sociosComunitarios?.find(
              (s) => s.socioComunitarioId === nextSocioId
            )?.socioComunitario ??
            existing.socioComunitario,
      sedeId: nextSedeId,
      sede:
        nextSedeId == null
          ? null
          : sedesParticipantes.find((s) => s.id === nextSedeId) ??
            existing.sede,
      escuelaId: nextEscuelaId,
      escuela:
        nextEscuelaId == null
          ? null
          : escuelasParticipantes.find((e) => e.id === nextEscuelaId) ??
            existing.escuela,
      carreraId: nextCarreraId,
      carrera:
        nextCarreraId == null
          ? null
          : carrerasParticipantes.find((c) => c.id === nextCarreraId) ??
            existing.carrera,
      asignaturaId: nextAsignaturaId,
      asignatura:
        nextAsignaturaId == null
          ? null
          : asignaturasParticipantes.find((a) => a.id === nextAsignaturaId) ??
            existing.asignatura,
    };

    const nextAfterEdit = (project.participantes_rel ?? []).map((p) =>
      p.id === participanteId ? patched : p
    );
    setProject({
      ...project,
      participantes_rel: nextAfterEdit,
    } as ProyectoWithRelations);
    setEditingParticipanteId(null);
    setEditDraft(null);
    setParticipanteSubmitting(true);
    queryClient.setQueryData(
      proyectoParticipantesKey(project.id),
      nextAfterEdit
    );

    const result = await updateParticipanteProyecto(participanteId, {
      rol,
      nombre: nombre.trim(),
      rut: rut.trim() || '',
      email: email.trim(),
      cargo: cargo.trim() || '',
      laborEnProyecto: laborEnProyecto.trim() || '',
      socioComunitarioId:
        rol === 'Beneficiario' ? socioComunitarioId || '' : '',
      sedeId: nextSedeId ?? '',
      escuelaId: nextEscuelaId ?? '',
      carreraId: nextCarreraId ?? '',
      asignaturaId: nextAsignaturaId ?? '',
    });
    setParticipanteSubmitting(false);

    if (result.success && result.data) {
      const serverRow = (
        result.data as ProyectoWithRelations
      ).participantes_rel?.find((p) => p.id === participanteId);
      // No reemplazar la lista completa: preserva deletes/adds concurrentes.
      setProject((prev) => {
        if (!prev) return prev;
        const local = prev.participantes_rel ?? [];
        return {
          ...prev,
          participantes_rel: serverRow
            ? local.map((p) => (p.id === participanteId ? serverRow : p))
            : local,
          sociosComunitarios:
            (result.data as ProyectoWithRelations).sociosComunitarios ??
            prev.sociosComunitarios,
        } as ProyectoWithRelations;
      });
      onSaveSuccess();
      if (serverRow) {
        queryClient.setQueryData(
          proyectoParticipantesKey(project.id),
          (prev: unknown) => {
            const local = Array.isArray(prev)
              ? prev
              : nextAfterEdit;
            return local.map((p: { id?: string }) =>
              p.id === participanteId ? serverRow : p
            );
          }
        );
      }
    } else {
      setProject(previousProject);
      queryClient.setQueryData(
        proyectoParticipantesKey(project.id),
        previousProject.participantes_rel
      );
      alert(result.error ?? 'Error al actualizar participante');
    }
  };

  const handleDeleteParticipante = async (participanteId: string) => {
    if (!confirm('¿Eliminar este participante?')) return;

    type ParticipanteRow = NonNullable<
      ProyectoWithRelations['participantes_rel']
    >[number];
    let removedRow: ParticipanteRow | null = null;

    setEditingParticipanteId((current) =>
      current === participanteId ? null : current
    );
    setEditDraft((draft) =>
      editingParticipanteId === participanteId ? null : draft
    );

    // UI optimista inmediata: la fila desaparece sin esperar al server.
    setProject((prev) => {
      if (!prev) return prev;
      const list = prev.participantes_rel ?? [];
      removedRow = list.find((p) => p.id === participanteId) ?? null;
      const nextRel = list.filter((p) => p.id !== participanteId);
      queryClient.setQueryData(
        proyectoParticipantesKey(prev.id),
        nextRel
      );
      return {
        ...prev,
        participantes_rel: nextRel,
        participantes: nextRel.length,
      } as ProyectoWithRelations;
    });

    const result = await deleteParticipanteProyecto(participanteId);
    if (result.success) {
      // Mantener lista local; el conteo sigue el largo local (evita rebote
      // si hay varios deletes en vuelo y el server aún no refleja todos).
      setProject((prev) => {
        if (!prev) return prev;
        const local = (prev.participantes_rel ?? []).filter(
          (p) => p.id !== participanteId
        );
        return {
          ...prev,
          participantes_rel: local,
          participantes: local.length,
        } as ProyectoWithRelations;
      });
      onSaveSuccess();
    } else {
      // Reinsertar solo la fila fallida; no restaurar snapshot completo.
      setProject((prev) => {
        if (!prev || !removedRow) return prev;
        const list = prev.participantes_rel ?? [];
        if (list.some((p) => p.id === participanteId)) return prev;
        const nextRel = [...list, removedRow];
        queryClient.setQueryData(
          proyectoParticipantesKey(prev.id),
          nextRel
        );
        return {
          ...prev,
          participantes_rel: nextRel,
          participantes: nextRel.length,
        } as ProyectoWithRelations;
      });
      alert(result.error ?? 'Error al eliminar participante');
    }
  };

  // 1) Tabla: solo participantes (no espera catálogos ni listas de usuarios).
  useEffect(() => {
    if (selectedTab !== 'Participantes') return;
    let cancelled = false;
    (async () => {
      try {
        const participantes = await queryClient.fetchQuery({
          queryKey: proyectoParticipantesKey(project.id),
          queryFn: async () => {
            const result = await getProyectoParticipantes(project.id);
            if (!result.success) {
              throw new Error(result.error ?? 'Error al cargar participantes');
            }
            return result.data ?? [];
          },
          staleTime: 60_000,
        });
        if (cancelled) return;
        setProject((prev) => {
          if (!prev || prev.id !== project.id) return prev;
          if (prev.participantes_rel) return prev;
          return {
            ...prev,
            participantes_rel: participantes ?? [],
            participantes: (participantes ?? []).length,
          } as ProyectoWithRelations;
        });
      } catch (error) {
        console.error('Error cargando participantes:', error);
        if (!cancelled) {
          setProject((prev) => {
            if (!prev || prev.id !== project.id) return prev;
            if (prev.participantes_rel) return prev;
            return {
              ...prev,
              participantes_rel: [],
              participantes: 0,
            } as ProyectoWithRelations;
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTab, project.id, queryClient, setProject]);

  // 2) Catálogos en background (formularios add/edit); no bloquean la tabla.
  useEffect(() => {
    if (selectedTab !== 'Participantes') return;
    let cancelled = false;
    (async () => {
      const catalogosCached =
        queryClient.getQueryData<CatalogosGeneral>(catalogosGeneralKey);

      const [sedes, escuelas, carreras, asignaturas] = await Promise.all([
        catalogosCached
          ? Promise.resolve(catalogosCached.sedes)
          : queryClient.fetchQuery({
              queryKey: sedesKey,
              queryFn: getSedes,
              staleTime: 10 * 60_000,
            }),
        catalogosCached
          ? Promise.resolve(catalogosCached.escuelas)
          : queryClient.fetchQuery({
              queryKey: escuelasConfigKey,
              queryFn: getEscuelasConfig,
              staleTime: 10 * 60_000,
            }),
        catalogosCached
          ? Promise.resolve(catalogosCached.carreras)
          : queryClient.fetchQuery({
              queryKey: carrerasConfigKey,
              queryFn: getCarrerasConfig,
              staleTime: 10 * 60_000,
            }),
        catalogosCached
          ? Promise.resolve(catalogosCached.asignaturas)
          : queryClient.fetchQuery({
              queryKey: asignaturasConfigKey,
              queryFn: getAsignaturasConfig,
              staleTime: 10 * 60_000,
            }),
      ]);

      if (catalogosCached) {
        queryClient.setQueryData(sedesKey, sedes);
        queryClient.setQueryData(escuelasConfigKey, escuelas);
        queryClient.setQueryData(carrerasConfigKey, carreras);
        queryClient.setQueryData(asignaturasConfigKey, asignaturas);
      }

      if (!cancelled) {
        setSedesParticipantes(
          sedes.map((s) => ({ id: s.id, nombre: s.nombre }))
        );
        setEscuelasParticipantes(
          escuelas.map((e) => ({ id: e.id, nombre: e.nombre }))
        );
        setCarrerasParticipantes(
          carreras.map((c) => ({ id: c.id, nombre: c.nombre }))
        );
        setAsignaturasParticipantes(
          asignaturas.map((a) => ({ id: a.id, nombre: a.nombre }))
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTab, queryClient]);

  return {
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
    setIsAddingParticipante,
    startAddingParticipante,
    cancelAddingParticipante,
    startEditParticipante,
    cancelEditParticipante,
    editDraft,
    setEditDraft,
    editingParticipanteId,
    setEditingParticipanteId,
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
  };
}

export type UseParticipantesTabReturn = ReturnType<typeof useParticipantesTab>;

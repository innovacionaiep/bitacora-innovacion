'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  addParticipanteProyecto,
  deleteParticipanteProyecto,
  updateParticipanteProyecto,
} from '@/lib/actions/proyectos';
import {
  getSedes,
  getEscuelas as getEscuelasConfig,
  getCarreras as getCarrerasConfig,
  getAsignaturas as getAsignaturasConfig,
} from '@/lib/actions/configuracion';
import type { ProyectoWithRelations } from '@/types/proyecto';
import {
  sedesKey,
  escuelasConfigKey,
  carrerasConfigKey,
  asignaturasConfigKey,
} from '@/lib/query-keys';
import {
  emptyNewParticipanteData,
  validateParticipanteForm,
  type NewParticipanteForm,
} from './participantes-tab-utils';
import { useEditarSociosComunitarios } from './useEditarSociosComunitarios';

type ProyectoTabName =
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
    fetchProyectos,
    onSaveSuccess,
  });

  const startAddingParticipante = () => {
    setEditingParticipanteId(null);
    setEditDraft(null);
    setIsAddingParticipante(true);
  };

  const cancelAddingParticipante = () => {
    setIsAddingParticipante(false);
    setNewParticipanteData(emptyNewParticipanteData());
  };

  const startEditParticipante = (participanteId: string) => {
    const existing = project.participantes_rel?.find(
      (p) => p.id === participanteId
    );
    if (!existing) return;
    setIsAddingParticipante(false);
    setEditingParticipanteId(participanteId);
    setEditDraft({
      rol: (existing.rol as NewParticipanteForm['rol']) || 'Colaborador',
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

    const previousProject = project;
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

    setProject({
      ...project,
      participantes_rel: [...(project.participantes_rel ?? []), optimisticRow],
    } as ProyectoWithRelations);
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
      setProject((prev) =>
        ({
          ...prev,
          ...result.data,
          activities: prev?.activities ?? (result.data as ProyectoWithRelations).activities,
          escuelas: prev?.escuelas ?? (result.data as ProyectoWithRelations).escuelas,
          carreras: prev?.carreras ?? (result.data as ProyectoWithRelations).carreras,
          asignaturas:
            prev?.asignaturas ??
            (result.data as ProyectoWithRelations).asignaturas,
          comunas: prev?.comunas ?? (result.data as ProyectoWithRelations).comunas,
          gruposInteres:
            prev?.gruposInteres ??
            (result.data as ProyectoWithRelations).gruposInteres,
          objetivos_rel:
            prev?.objetivos_rel ??
            (result.data as ProyectoWithRelations).objetivos_rel,
          desarrolloTecnico:
            prev?.desarrolloTecnico ??
            (result.data as ProyectoWithRelations).desarrolloTecnico,
          participantes_rel:
            (result.data as ProyectoWithRelations).participantes_rel ??
            prev?.participantes_rel,
          sociosComunitarios:
            (result.data as ProyectoWithRelations).sociosComunitarios ??
            prev?.sociosComunitarios,
        }) as ProyectoWithRelations
      );
      onSaveSuccess();
      fetchProyectos({ silent: true });
    } else {
      setProject(previousProject);
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

    setProject({
      ...project,
      participantes_rel: (project.participantes_rel ?? []).map((p) =>
        p.id === participanteId ? patched : p
      ),
    } as ProyectoWithRelations);
    setEditingParticipanteId(null);
    setEditDraft(null);
    setParticipanteSubmitting(true);

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
      setProject((prev) =>
        ({
          ...prev,
          participantes_rel:
            (result.data as ProyectoWithRelations).participantes_rel ??
            prev?.participantes_rel,
          sociosComunitarios:
            (result.data as ProyectoWithRelations).sociosComunitarios ??
            prev?.sociosComunitarios,
          activities: prev?.activities,
        }) as ProyectoWithRelations
      );
      onSaveSuccess();
      fetchProyectos({ silent: true });
    } else {
      setProject(previousProject);
      alert(result.error ?? 'Error al actualizar participante');
    }
  };

  const handleDeleteParticipante = async (participanteId: string) => {
    if (!confirm('¿Eliminar este participante?')) return;
    const previousProject = project;

    setEditingParticipanteId((current) =>
      current === participanteId ? null : current
    );
    if (editingParticipanteId === participanteId) {
      setEditDraft(null);
    }
    setProject({
      ...project,
      participantes_rel: (project.participantes_rel ?? []).filter(
        (p) => p.id !== participanteId
      ),
    } as ProyectoWithRelations);

    const result = await deleteParticipanteProyecto(participanteId);
    if (result.success && result.data) {
      setProject((prev) =>
        ({
          ...prev,
          participantes_rel:
            (result.data as ProyectoWithRelations).participantes_rel ??
            prev?.participantes_rel,
          sociosComunitarios:
            (result.data as ProyectoWithRelations).sociosComunitarios ??
            prev?.sociosComunitarios,
          activities: prev?.activities,
        }) as ProyectoWithRelations
      );
      onSaveSuccess();
      fetchProyectos({ silent: true });
    } else {
      setProject(previousProject);
      alert(result.error ?? 'Error al eliminar participante');
    }
  };

  useEffect(() => {
    if (selectedTab !== 'Participantes') return;
    let cancelled = false;
    (async () => {
      const [sedes, escuelas, carreras, asignaturas] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: sedesKey,
          queryFn: getSedes,
          staleTime: 10 * 60_000,
        }),
        queryClient.fetchQuery({
          queryKey: escuelasConfigKey,
          queryFn: getEscuelasConfig,
          staleTime: 10 * 60_000,
        }),
        queryClient.fetchQuery({
          queryKey: carrerasConfigKey,
          queryFn: getCarrerasConfig,
          staleTime: 10 * 60_000,
        }),
        queryClient.fetchQuery({
          queryKey: asignaturasConfigKey,
          queryFn: getAsignaturasConfig,
          staleTime: 10 * 60_000,
        }),
      ]);
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
  }, [selectedTab, project.id, queryClient]);

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

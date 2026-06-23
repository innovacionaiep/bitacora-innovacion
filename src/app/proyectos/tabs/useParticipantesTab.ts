'use client';

import { useEffect, useState } from 'react';
import {
  addParticipanteProyecto,
  deleteParticipanteProyecto,
  getSociosComunitarios,
  updateParticipanteProyecto,
  updateProyectoGeneralTab,
  createSocioComunitario,
} from '@/lib/actions/proyectos';
import {
  getSedes,
  getEscuelas as getEscuelasConfig,
} from '@/lib/actions/configuracion';
import type { ProyectoWithRelations } from '@/types/proyecto';
import {
  emptyNewParticipanteData,
  type NewParticipanteForm,
} from './participantes-tab-utils';

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
  const [filterParticipantesNombre, setFilterParticipantesNombre] =
    useState('');
  const [filterParticipantesRol, setFilterParticipantesRol] = useState('');
  const [filterParticipantesCargo, setFilterParticipantesCargo] = useState('');
  const [filterParticipantesSocio, setFilterParticipantesSocio] = useState('');

  const [isAddingParticipante, setIsAddingParticipante] = useState(false);
  const [isEditModeParticipante, setIsEditModeParticipante] = useState(false);
  const [isDeleteModeParticipante, setIsDeleteModeParticipante] =
    useState(false);
  const [editingParticipanteId, setEditingParticipanteId] = useState<
    string | null
  >(null);
  const [newParticipanteData, setNewParticipanteData] =
    useState<NewParticipanteForm>(emptyNewParticipanteData());
  const [sedesParticipantes, setSedesParticipantes] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [escuelasParticipantes, setEscuelasParticipantes] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [participanteSubmitting, setParticipanteSubmitting] = useState(false);

  const [isEditarSociosOpen, setIsEditarSociosOpen] = useState(false);
  const [editarSociosIds, setEditarSociosIds] = useState<string[]>([]);
  const [editarSociosCatalog, setEditarSociosCatalog] = useState<
    { id: string; nombre: string; descripcion?: string | null }[]
  >([]);
  const [editarSociosSaving, setEditarSociosSaving] = useState(false);
  const [nuevoSocioNombre, setNuevoSocioNombre] = useState('');
  const [nuevoSocioDescripcion, setNuevoSocioDescripcion] = useState('');
  const [nuevoSocioSaving, setNuevoSocioSaving] = useState(false);

  const handleSaveNewParticipante = async () => {
    const { rol, nombre, email, cargo, socioComunitarioId, sedeId, escuelaId } =
      newParticipanteData;
    if (!nombre?.trim()) {
      alert('El nombre es obligatorio.');
      return;
    }
    if (rol === 'Beneficiario' && !socioComunitarioId) {
      alert('El socio comunitario es obligatorio para beneficiarios.');
      return;
    }
    setParticipanteSubmitting(true);
    const result = await addParticipanteProyecto(project.id, {
      rol,
      nombre: nombre.trim(),
      email: email.trim() || undefined,
      cargo: cargo.trim() || undefined,
      socioComunitarioId:
        rol === 'Beneficiario' ? socioComunitarioId || undefined : undefined,
      sedeId: sedeId || undefined,
      escuelaId: escuelaId || undefined,
    });
    setParticipanteSubmitting(false);
    if (result.success && result.data) {
      setProject(result.data);
      onSaveSuccess();
      fetchProyectos({ silent: true });
      setIsAddingParticipante(false);
      setNewParticipanteData(emptyNewParticipanteData());
    } else {
      alert(result.error ?? 'Error al agregar participante');
    }
  };

  const handleUpdateParticipante = async (
    participanteId: string,
    data: {
      rol?: string;
      nombre?: string;
      email?: string;
      cargo?: string;
      socioComunitarioId?: string;
      sedeId?: string;
      escuelaId?: string;
    }
  ) => {
    setParticipanteSubmitting(true);
    const result = await updateParticipanteProyecto(participanteId, data);
    setParticipanteSubmitting(false);
    if (result.success && result.data) {
      setProject(result.data);
      onSaveSuccess();
      fetchProyectos({ silent: true });
    } else {
      alert(result.error ?? 'Error al actualizar participante');
    }
  };

  const handleDeleteParticipante = async (participanteId: string) => {
    if (!confirm('¿Eliminar este participante?')) return;
    setParticipanteSubmitting(true);
    const result = await deleteParticipanteProyecto(participanteId);
    setParticipanteSubmitting(false);
    if (result.success && result.data) {
      setProject(result.data);
      onSaveSuccess();
      fetchProyectos({ silent: true });
    } else {
      alert(result.error ?? 'Error al eliminar participante');
    }
  };

  const openEditarSociosDialog = () => {
    setEditarSociosIds(
      project.sociosComunitarios?.map((sc) => sc.socioComunitarioId) ?? []
    );
    getSociosComunitarios().then((r) => {
      if (r.success && r.data) setEditarSociosCatalog(r.data);
    });
    setIsEditarSociosOpen(true);
  };

  const handleCreateNuevoSocio = async () => {
    const nombre = nuevoSocioNombre.trim();
    const descripcion = nuevoSocioDescripcion.trim();
    if (!nombre) return;
    setNuevoSocioSaving(true);
    const result = await createSocioComunitario(
      nombre,
      descripcion || undefined
    );
    setNuevoSocioSaving(false);
    if (result.success && result.data) {
      const socio = result.data;
      setEditarSociosCatalog((prev) => {
        if (prev.find((s) => s.id === socio.id)) return prev;
        return [...prev, socio];
      });
      setEditarSociosIds((prev) =>
        prev.includes(socio.id) ? prev : [...prev, socio.id]
      );
      setNuevoSocioNombre('');
      setNuevoSocioDescripcion('');
    } else {
      alert(result.error ?? 'Error al crear socio comunitario');
    }
  };

  const handleSaveEditarSocios = async () => {
    setEditarSociosSaving(true);
    const result = await updateProyectoGeneralTab({
      proyectoId: project.id,
      sociosComunitariosIds: editarSociosIds,
    });
    setEditarSociosSaving(false);
    if (result.success && result.data) {
      setProject(result.data);
      setIsEditarSociosOpen(false);
    } else {
      alert(result.error ?? 'Error al guardar socios comunitarios');
    }
  };

  useEffect(() => {
    if (selectedTab !== 'Participantes') return;
    let cancelled = false;
    (async () => {
      const [sedes, escuelas] = await Promise.all([
        getSedes(),
        getEscuelasConfig(),
      ]);
      if (!cancelled) {
        setSedesParticipantes(
          sedes.map((s) => ({ id: s.id, nombre: s.nombre }))
        );
        setEscuelasParticipantes(
          escuelas.map((e) => ({ id: e.id, nombre: e.nombre }))
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTab, project.id]);

  return {
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
  };
}

export type UseParticipantesTabReturn = ReturnType<typeof useParticipantesTab>;

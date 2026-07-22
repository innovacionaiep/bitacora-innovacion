'use client';

import { useState } from 'react';
import {
  createSocioComunitario,
  getSociosComunitarios,
  updateProyectoGeneralTab,
} from '@/lib/actions/proyectos';
import type { ProyectoWithRelations } from '@/types/proyecto';
import { buildOptimisticRelationRows } from './general-tab-utils';

type SocioCatalogItem = {
  id: string;
  nombre: string;
  descripcion?: string | null;
};

export function useEditarSociosComunitarios({
  project,
  setProject,
  fetchProyectos,
  onSaveSuccess,
  onSocioCreated,
}: {
  project: ProyectoWithRelations;
  setProject: React.Dispatch<React.SetStateAction<ProyectoWithRelations | null>>;
  fetchProyectos: (opts?: { silent?: boolean; activeRole?: string }) => void;
  onSaveSuccess: () => void;
  onSocioCreated?: (socio: SocioCatalogItem) => void;
}) {
  const [isEditarSociosOpen, setIsEditarSociosOpen] = useState(false);
  const [editarSociosIds, setEditarSociosIds] = useState<string[]>([]);
  const [editarSociosCatalog, setEditarSociosCatalog] = useState<
    SocioCatalogItem[]
  >([]);
  const [editarSociosSaving, setEditarSociosSaving] = useState(false);
  const [nuevoSocioNombre, setNuevoSocioNombre] = useState('');
  const [nuevoSocioDescripcion, setNuevoSocioDescripcion] = useState('');
  const [nuevoSocioSaving, setNuevoSocioSaving] = useState(false);

  const openEditarSociosDialog = () => {
    setEditarSociosIds(
      project.sociosComunitarios?.map((sc) => sc.socioComunitarioId) ?? []
    );
    setNuevoSocioNombre('');
    setNuevoSocioDescripcion('');
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
      onSocioCreated?.(socio);
    } else {
      alert(result.error ?? 'Error al crear socio comunitario');
    }
  };

  const handleSaveEditarSocios = async () => {
    const previousProject = project;
    const catalog = editarSociosCatalog.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      descripcion: s.descripcion ?? null,
    }));

    const optimisticSocios = buildOptimisticRelationRows(
      project.id,
      editarSociosIds,
      catalog,
      'socioComunitarioId',
      'socioComunitario'
    );

    setEditarSociosSaving(true);
    setProject({
      ...project,
      sociosComunitarios: optimisticSocios,
    } as ProyectoWithRelations);
    setIsEditarSociosOpen(false);
    onSaveSuccess();

    const result = await updateProyectoGeneralTab({
      proyectoId: project.id,
      sociosComunitariosIds: editarSociosIds,
    });
    setEditarSociosSaving(false);

    if (result.success && result.data) {
      setProject((prev) =>
        ({
          ...result.data,
          activities:
            prev?.activities ??
            (result.data as ProyectoWithRelations).activities,
        }) as ProyectoWithRelations
      );
      fetchProyectos({ silent: true });
    } else {
      setProject(previousProject);
      setIsEditarSociosOpen(true);
      alert(result.error ?? 'Error al guardar socios comunitarios');
    }
  };

  return {
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
  };
}

export type UseEditarSociosComunitariosReturn = ReturnType<
  typeof useEditarSociosComunitarios
>;

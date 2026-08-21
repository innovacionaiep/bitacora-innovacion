'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useActiveRolePermissions } from '@/components/permissions/ActiveRolePermissionsProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProyectoFormPayload } from '@/types/proyecto';
import { getProyectoBorrador, saveProyectoBorrador } from '@/lib/actions/borradores';
import { createProyectoCompleto } from '@/lib/actions/proyectos';
import { getEscuelas } from '@/lib/actions/proyectos';
import { getFondos, getSedes } from '@/lib/actions/configuracion';
import { ArrowLeft, Save, Check } from 'lucide-react';
import {
  MultiSelectOptions,
  MULTI_SELECT_SEP,
  type OptionItem,
} from '@/components/ui/multi-select-options';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';

function parseMultiValue(value: string): string[] {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(MULTI_SELECT_SEP)
    .map((s) => s.trim())
    .filter(Boolean);
}

function defaultPayload(): ProyectoFormPayload {
  return {
    proyecto: '',
    fondo: '',
    sede: '',
    sedesIds: [],
    objetivoGeneral: '',
    objetivosEspecificos: [],
    avanceGantt: 0,
    objetivos: 0,
    presupuestoUsado: 0,
    presupuestoTotal: 0,
    participantes: 0,
    escuelasIds: [],
    carrerasIds: [],
    asignaturasIds: [],
    comunasIds: [],
    gruposInteresIds: [],
    sociosComunitariosIds: [],
    participantes_rel: [],
  };
}

type Catalogos = {
  sedes: { id: string; nombre: string; orden: number }[];
  escuelas: { id: string; nombre: string; codigo?: string }[];
  fondos: { id: string; nombre: string }[];
};

function canCreateProject(p: ProyectoFormPayload): boolean {
  const nombreOk = Boolean(p.proyecto?.trim());
  const fondoOk = Boolean(p.fondo?.trim());
  const objetivoOk = Boolean(p.objetivoGeneral?.trim());
  const sedesOk = Array.isArray(p.sedesIds) && p.sedesIds.length > 0;
  const escuelasOk = Array.isArray(p.escuelasIds) && p.escuelasIds.length > 0;
  return nombreOk && fondoOk && objetivoOk && sedesOk && escuelasOk;
}

function NuevoProyectoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status: sessionStatus } = useSession();
  const { can, loading: permsLoading } = useActiveRolePermissions();
  const hasCreatePermission = can('projects.create');
  const draftId = searchParams.get('borrador');

  const [payload, setPayload] = useState<ProyectoFormPayload>(defaultPayload);
  const [loadingDraft, setLoadingDraft] = useState(!!draftId);
  const [savingDraft, setSavingDraft] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [catalogos, setCatalogos] = useState<Catalogos>({
    sedes: [],
    escuelas: [],
    fondos: [],
  });
  const [catalogosLoaded, setCatalogosLoaded] = useState(false);

  const canCreate = canCreateProject(payload);

  usePageTopLoader(loadingDraft);

  useEffect(() => {
    if (sessionStatus === 'loading' || permsLoading) return;
    if (sessionStatus === 'authenticated' && !hasCreatePermission) {
      router.replace('/proyectos');
    }
  }, [sessionStatus, permsLoading, hasCreatePermission, router]);

  useEffect(() => {
    if (!draftId) {
      setLoadingDraft(false);
      return;
    }
    getProyectoBorrador(draftId).then((res) => {
      setLoadingDraft(false);
      if (res.success && res.data?.payload) {
        const merged = { ...defaultPayload(), ...res.data.payload };
        if (!Array.isArray(merged.sedesIds)) merged.sedesIds = [];
        if (!Array.isArray(merged.escuelasIds)) merged.escuelasIds = [];
        merged.participantes_rel = [];
        merged.miRolEnProyecto = undefined;
        setPayload(merged);
      }
    });
  }, [draftId]);

  useEffect(() => {
    if (catalogosLoaded) return;
    Promise.all([getEscuelas(), getSedes(), getFondos()]).then(
      ([e, sedes, fondos]) => {
        setCatalogos({
          escuelas: e.success ? (e.data ?? []) : [],
          sedes: sedes ?? [],
          fondos: fondos ?? [],
        });
        setCatalogosLoaded(true);
      }
    );
  }, [catalogosLoaded]);

  const update = useCallback(
    <K extends keyof ProyectoFormPayload>(key: K, value: ProyectoFormPayload[K]) => {
      setPayload((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    const nombre = payload.proyecto?.trim() || 'Sin nombre';
    const res = await saveProyectoBorrador({
      ...(draftId ? { id: draftId } : {}),
      nombre,
      payload: {
        ...payload,
        participantes_rel: [],
        miRolEnProyecto: undefined,
      },
    });
    setSavingDraft(false);
    if (res.success && res.data?.id && !draftId) {
      router.replace(`/proyectos/nuevo?borrador=${res.data.id}`);
    }
  };

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    const sedeNombres = catalogos.sedes
      .filter((s) => (payload.sedesIds ?? []).includes(s.id))
      .map((s) => s.nombre)
      .join(', ');
    const payloadToSend = {
      ...payload,
      sede: sedeNombres,
      participantes_rel: [],
      miRolEnProyecto: undefined,
    };
    const res = await createProyectoCompleto(payloadToSend);
    setCreating(false);
    if (res.success && res.data) {
      setShowSuccessMessage(true);
      setTimeout(() => {
        router.push(`/proyectos?id=${res.data!.id}`);
      }, 1800);
    } else {
      alert(res.error ?? 'Error al crear proyecto');
    }
  };

  const sedesOptions: OptionItem[] = catalogos.sedes.map((s) => ({
    value: s.id,
    label: s.nombre,
  }));
  const escuelasOptions: OptionItem[] = catalogos.escuelas.map((e) => ({
    value: e.id,
    label: e.nombre,
  }));

  if (loadingDraft) {
    return <div className="h-full min-h-[200px]" />;
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col overflow-hidden px-4">
      <div className="shrink-0 pt-6">
        {showSuccessMessage && (
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800">
            <Check className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">Proyecto creado con éxito. Redirigiendo...</span>
          </div>
        )}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/proyectos">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Crear proyecto</h1>
        </div>
      </div>

      <form
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4">
        <Card>
          <CardHeader>
            <CardTitle>Datos básicos del proyecto</CardTitle>
            <p className="text-sm text-gray-500 font-normal">
              Completa los campos obligatorios. Encargados y coordinadores se
              asignan después en la página del proyecto.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="proyecto">Nombre del proyecto *</Label>
              <Input
                id="proyecto"
                value={payload.proyecto}
                onChange={(e) => update('proyecto', e.target.value)}
                placeholder="Ej: Mi Proyecto"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fondo">Fondo *</Label>
              <Select
                value={payload.fondo || undefined}
                onValueChange={(value) => update('fondo', value)}
              >
                <SelectTrigger id="fondo" className="mt-1">
                  <SelectValue placeholder="Selecciona el fondo" />
                </SelectTrigger>
                <SelectContent>
                  {catalogos.fondos.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      {catalogosLoaded
                        ? 'No hay fondos configurados'
                        : 'Cargando opciones…'}
                    </SelectItem>
                  ) : (
                    catalogos.fondos.map((f) => (
                      <SelectItem key={f.id} value={f.nombre}>
                        {f.nombre}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="objetivoGeneral">Objetivo general *</Label>
              <Textarea
                id="objetivoGeneral"
                value={payload.objetivoGeneral}
                onChange={(e) => update('objetivoGeneral', e.target.value)}
                placeholder="Descripción del objetivo general"
                className="mt-1 min-h-[80px]"
              />
            </div>
            <div>
              <Label>Sedes *</Label>
              <MultiSelectOptions
                options={sedesOptions}
                value={(payload.sedesIds ?? []).join(MULTI_SELECT_SEP)}
                onChange={(v) => update('sedesIds', parseMultiValue(v))}
                placeholder="Selecciona una o más sedes"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Escuelas *</Label>
              <MultiSelectOptions
                options={escuelasOptions}
                value={(payload.escuelasIds ?? []).join(MULTI_SELECT_SEP)}
                onChange={(v) => update('escuelasIds', parseMultiValue(v))}
                placeholder="Selecciona una o más escuelas"
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
        </div>

        <div className="flex shrink-0 flex-wrap gap-4 border-t bg-background py-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={savingDraft}
          >
            <Save className="h-4 w-4 mr-2" />
            {savingDraft ? 'Guardando...' : 'Guardar borrador'}
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate || creating}
          >
            {creating ? 'Creando...' : 'Crear proyecto'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NuevoProyectoPage() {
  return (
    <Suspense fallback={<div className="flex h-full min-h-0 items-center justify-center"><span className="text-muted-foreground">Cargando...</span></div>}>
      <NuevoProyectoContent />
    </Suspense>
  );
}

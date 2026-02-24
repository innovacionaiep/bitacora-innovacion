'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProyectoFormPayload } from '@/types/proyecto';
import { getProyectoBorrador, saveProyectoBorrador } from '@/lib/actions/borradores';
import { createProyectoCompleto } from '@/lib/actions/proyectos';
import { getEscuelas } from '@/lib/actions/proyectos';
import { getSedes } from '@/lib/actions/configuracion';
import { ArrowLeft, Save, Plus, Trash2, Check } from 'lucide-react';
import {
  MultiSelectOptions,
  MULTI_SELECT_SEP,
  type OptionItem,
} from '@/components/ui/multi-select-options';

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
    reunionesHechas: 0,
    reunionesTotales: 0,
    participantes: 0,
    escuelasIds: [],
    carrerasIds: [],
    comunasIds: [],
    gruposInteresIds: [],
    sociosComunitariosIds: [],
    participantes_rel: [
      { rol: 'Encargado', nombre: '', email: '' },
      { rol: 'Coordinador', nombre: '', email: '' },
    ],
  };
}

type Catalogos = {
  sedes: { id: string; nombre: string; orden: number }[];
  escuelas: { id: string; nombre: string; codigo?: string }[];
};

function canCreateProject(p: ProyectoFormPayload): boolean {
  const nombreOk = Boolean(p.proyecto?.trim());
  const objetivoOk = Boolean(p.objetivoGeneral?.trim());
  const sedesOk = Array.isArray(p.sedesIds) && p.sedesIds.length > 0;
  const escuelasOk = Array.isArray(p.escuelasIds) && p.escuelasIds.length > 0;
  const encargados = p.participantes_rel?.filter((r) => r.rol === 'Encargado') ?? [];
  const encargadosOk =
    encargados.length > 0 &&
    encargados.every((e) => Boolean(e.nombre?.trim()) && Boolean(e.email?.trim()));
  const coordinadores = p.participantes_rel?.filter((r) => r.rol === 'Coordinador') ?? [];
  const coordinadoresOk =
    coordinadores.length > 0 &&
    coordinadores.every((c) => Boolean(c.nombre?.trim()) && Boolean(c.email?.trim()));
  return nombreOk && objetivoOk && sedesOk && escuelasOk && encargadosOk && coordinadoresOk;
}

export default function NuevoProyectoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const draftId = searchParams.get('borrador');

  const [payload, setPayload] = useState<ProyectoFormPayload>(defaultPayload);
  const [loadingDraft, setLoadingDraft] = useState(!!draftId);
  const [savingDraft, setSavingDraft] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [catalogos, setCatalogos] = useState<Catalogos>({
    sedes: [],
    escuelas: [],
  });
  const [catalogosLoaded, setCatalogosLoaded] = useState(false);
  const hasPrefilledEncargadoRef = useRef(false);
  const hasPrefilledCoordinatorRef = useRef(false);

  const canCreate = canCreateProject(payload);

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
        if (!merged.participantes_rel?.length)
          merged.participantes_rel = [
            { rol: 'Encargado', nombre: '', email: '' },
            { rol: 'Coordinador', nombre: '', email: '' },
          ];
        const hasCoordinator = merged.participantes_rel.some((r) => r.rol === 'Coordinador');
        if (!hasCoordinator)
          merged.participantes_rel = [...merged.participantes_rel, { rol: 'Coordinador', nombre: '', email: '' }];
        setPayload(merged);
      }
    });
  }, [draftId]);

  // Si el usuario tiene rol activo Encargado, pre-rellenar el primer encargado con su nombre y correo (solo una vez, tras cargar sesión y opcionalmente borrador)
  useEffect(() => {
    if (loadingDraft || sessionStatus !== 'authenticated' || !session?.user || hasPrefilledEncargadoRef.current) return;
    const activeRole = (session.user as { activeRole?: string }).activeRole;
    if (activeRole !== 'Encargado') return;
    const name = session.user.name ?? '';
    const email = session.user.email ?? '';
    if (!name && !email) return;
    hasPrefilledEncargadoRef.current = true;
    setPayload((prev) => {
      const rel = [...(prev.participantes_rel ?? [])];
      const firstEnc = rel.find((r) => r.rol === 'Encargado');
      if (!firstEnc || (firstEnc.nombre?.trim() && firstEnc.email?.trim())) return prev;
      const idx = rel.indexOf(firstEnc);
      rel[idx] = { ...firstEnc, nombre: firstEnc.nombre?.trim() || name, email: firstEnc.email?.trim() || email };
      return { ...prev, participantes_rel: rel };
    });
  }, [loadingDraft, sessionStatus, session]);

  // Si el usuario tiene rol activo Coordinador, pre-rellenar el primer coordinador con su nombre y correo (solo una vez)
  useEffect(() => {
    if (loadingDraft || sessionStatus !== 'authenticated' || !session?.user || hasPrefilledCoordinatorRef.current) return;
    const activeRole = (session.user as { activeRole?: string }).activeRole;
    if (activeRole !== 'Coordinador') return;
    const name = session.user.name ?? '';
    const email = session.user.email ?? '';
    if (!name && !email) return;
    hasPrefilledCoordinatorRef.current = true;
    setPayload((prev) => {
      const rel = [...(prev.participantes_rel ?? [])];
      const firstCoord = rel.find((r) => r.rol === 'Coordinador');
      if (!firstCoord || (firstCoord.nombre?.trim() && firstCoord.email?.trim())) return prev;
      const idx = rel.indexOf(firstCoord);
      rel[idx] = { ...firstCoord, nombre: firstCoord.nombre?.trim() || name, email: firstCoord.email?.trim() || email };
      return { ...prev, participantes_rel: rel };
    });
  }, [loadingDraft, sessionStatus, session]);

  useEffect(() => {
    if (catalogosLoaded) return;
    Promise.all([getEscuelas(), getSedes()]).then(([e, sedes]) => {
      setCatalogos({
        escuelas: e.success ? (e.data ?? []) : [],
        sedes: sedes ?? [],
      });
      setCatalogosLoaded(true);
    });
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
      payload,
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
    const payloadToSend = { ...payload, sede: sedeNombres };
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

  const encargados = payload.participantes_rel?.filter((r) => r.rol === 'Encargado') ?? [];
  const coordinadores = payload.participantes_rel?.filter((r) => r.rol === 'Coordinador') ?? [];

  const addEncargado = () => {
    update('participantes_rel', [
      ...(payload.participantes_rel ?? []),
      { rol: 'Encargado' as const, nombre: '', email: '' },
    ]);
  };

  const setEncargado = (index: number, field: 'nombre' | 'email', value: string) => {
    const rel = [...(payload.participantes_rel ?? [])];
    let encIdx = 0;
    for (let i = 0; i < rel.length; i++) {
      if (rel[i].rol === 'Encargado') {
        if (encIdx === index) {
          rel[i] = { ...rel[i], [field]: value };
          update('participantes_rel', rel);
          return;
        }
        encIdx++;
      }
    }
  };

  const removeEncargado = (index: number) => {
    const rel = (payload.participantes_rel ?? []).filter((r) => r.rol === 'Encargado');
    if (rel.length <= 1) return;
    const newRel = payload.participantes_rel!.filter((r, i) => {
      if (r.rol !== 'Encargado') return true;
      const encIdx = payload.participantes_rel!.slice(0, i).filter((x) => x.rol === 'Encargado').length;
      return encIdx !== index;
    });
    update('participantes_rel', newRel);
  };

  const addCoordinator = () => {
    update('participantes_rel', [
      ...(payload.participantes_rel ?? []),
      { rol: 'Coordinador' as const, nombre: '', email: '' },
    ]);
  };

  const setCoordinator = (index: number, field: 'nombre' | 'email', value: string) => {
    const rel = [...(payload.participantes_rel ?? [])];
    let coordIdx = 0;
    for (let i = 0; i < rel.length; i++) {
      if (rel[i].rol === 'Coordinador') {
        if (coordIdx === index) {
          rel[i] = { ...rel[i], [field]: value };
          update('participantes_rel', rel);
          return;
        }
        coordIdx++;
      }
    }
  };

  const removeCoordinator = (index: number) => {
    const rel = (payload.participantes_rel ?? []).filter((r) => r.rol === 'Coordinador');
    if (rel.length <= 1) return;
    const newRel = payload.participantes_rel!.filter((r, i) => {
      if (r.rol !== 'Coordinador') return true;
      const coordIdx = payload.participantes_rel!.slice(0, i).filter((x) => x.rol === 'Coordinador').length;
      return coordIdx !== index;
    });
    update('participantes_rel', newRel);
  };

  if (loadingDraft) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
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

      <form className="space-y-6 pb-24" onSubmit={(e) => e.preventDefault()}>
        <Card>
          <CardHeader>
            <CardTitle>Datos básicos del proyecto</CardTitle>
            <p className="text-sm text-gray-500 font-normal">
              Completa los campos obligatorios. El resto podrás agregarlo después en la página del proyecto.
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
            <div>
              <Label>Encargados * (al menos uno)</Label>
              <p className="text-sm text-gray-500 mb-2">
                Indica nombre y correo de cada persona encargada del proyecto.
              </p>
              <div className="space-y-3">
                {encargados.map((enc, idx) => (
                  <div key={idx} className="flex gap-2 items-start flex-wrap">
                    <Input
                      value={enc.nombre ?? ''}
                      onChange={(e) => setEncargado(idx, 'nombre', e.target.value)}
                      placeholder="Nombre"
                      className="flex-1 min-w-[140px]"
                    />
                    <Input
                      type="email"
                      value={enc.email ?? ''}
                      onChange={(e) => setEncargado(idx, 'email', e.target.value)}
                      placeholder="Correo electrónico"
                      className="flex-1 min-w-[180px]"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEncargado(idx)}
                      disabled={encargados.length <= 1}
                      title="Quitar encargado"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addEncargado}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar encargado
                </Button>
              </div>
            </div>
            <div>
              <Label>Coordinadores * (al menos uno)</Label>
              <p className="text-sm text-gray-500 mb-2">
                Indica nombre y correo de cada coordinador del proyecto. Si creas el proyecto con rol de coordinador, aparecerás asignado por defecto.
              </p>
              <div className="space-y-3">
                {coordinadores.map((coord, idx) => (
                  <div key={`coord-${idx}`} className="flex gap-2 items-start flex-wrap">
                    <Input
                      value={coord.nombre ?? ''}
                      onChange={(e) => setCoordinator(idx, 'nombre', e.target.value)}
                      placeholder="Nombre"
                      className="flex-1 min-w-[140px]"
                    />
                    <Input
                      type="email"
                      value={coord.email ?? ''}
                      onChange={(e) => setCoordinator(idx, 'email', e.target.value)}
                      placeholder="Correo electrónico"
                      className="flex-1 min-w-[180px]"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCoordinator(idx)}
                      disabled={coordinadores.length <= 1}
                      title="Quitar coordinador"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addCoordinator}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar coordinador
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-4 pt-4 border-t">
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

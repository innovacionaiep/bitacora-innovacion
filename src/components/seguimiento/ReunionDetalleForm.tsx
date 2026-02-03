'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  addPuntoReunion,
  addCompromiso,
  addPuntoFODA,
  addTemaPresupuesto,
  marcarTareaEnReunion,
  actualizarIndicadorEnReunion,
} from '@/lib/actions/seguimiento';
import { getActivities } from '@/lib/actions/gantt';
import { getIndicadoresByProyecto } from '@/lib/actions/indicadores';
import { ChevronDown, ChevronRight, Plus, Loader2 } from 'lucide-react';

interface ReunionDetalleFormProps {
  reunionId: string;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void | Promise<void>;
  reunionData?: {
    tareasMarcadas?: { taskId: string }[];
    indicadoresActualizados?: { indicadorId: string }[];
  };
}

type SectionKey =
  | 'puntos'
  | 'tareas'
  | 'indicadores'
  | 'foda'
  | 'presupuesto'
  | 'compromisos';

export function ReunionDetalleForm({
  reunionId,
  projectId,
  open,
  onOpenChange,
  onSuccess,
  reunionData,
}: ReunionDetalleFormProps) {
  const [expandedSections, setExpandedSections] = useState<
    Record<SectionKey, boolean>
  >({
    puntos: true,
    tareas: true,
    indicadores: true,
    foda: true,
    presupuesto: true,
    compromisos: true,
  });
  const [activities, setActivities] = useState<
    {
      id: string;
      name: string;
      tasks: { id: string; name: string; completed: boolean }[];
    }[]
  >([]);
  const [indicadores, setIndicadores] = useState<
    { id: string; nombre: string; resultadoAlcanzado: string }[]
  >([]);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const [puntoTitulo, setPuntoTitulo] = useState('');
  const [puntoDesc, setPuntoDesc] = useState('');
  const [compromisoDesc, setCompromisoDesc] = useState('');
  const [fodaTipo, setFodaTipo] = useState<'Oportunidad' | 'Amenaza'>(
    'Oportunidad'
  );
  const [fodaDesc, setFodaDesc] = useState('');
  const [presupuestoTema, setPresupuestoTema] = useState('');
  const [presupuestoDesc, setPresupuestoDesc] = useState('');
  const [indicadorValores, setIndicadorValores] = useState<
    Record<string, string>
  >({});

  const tareasMarcadasIds = new Set(
    reunionData?.tareasMarcadas?.map((t) => t.taskId) || []
  );
  const indicadoresActualizadosIds = new Set(
    reunionData?.indicadoresActualizados?.map((i) => i.indicadorId) || []
  );

  useEffect(() => {
    if (open && projectId) {
      setLoadingData(true);
      Promise.all([
        getActivities(projectId),
        getIndicadoresByProyecto(projectId),
      ]).then(([actResult, indResult]) => {
        if (actResult.success && actResult.data) {
          setActivities(
            actResult.data.map((a) => ({
              id: a.id,
              name: a.name,
              tasks: a.tasks.map((t) => ({
                id: t.id,
                name: t.name,
                completed: t.completed,
              })),
            }))
          );
        }
        if (indResult.success && indResult.data) {
          const flatIndicadores: {
            id: string;
            nombre: string;
            resultadoAlcanzado: string;
          }[] = [];
          for (const og of indResult.data.objetivosGenerales) {
            for (const oe of og.objetivosEspecificos) {
              for (const ind of oe.indicadores) {
                flatIndicadores.push({
                  id: ind.id,
                  nombre: ind.nombre,
                  resultadoAlcanzado: ind.resultadoAlcanzado,
                });
              }
            }
          }
          setIndicadores(flatIndicadores);
          const initial: Record<string, string> = {};
          flatIndicadores.forEach((i) => {
            initial[i.id] = i.resultadoAlcanzado;
          });
          setIndicadorValores(initial);
        }
        setLoadingData(false);
      });
    }
  }, [open, projectId]);

  const toggleSection = (key: SectionKey) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddPunto = async () => {
    if (!puntoTitulo.trim()) return;
    setSubmitting('punto');
    const result = await addPuntoReunion(
      reunionId,
      puntoTitulo.trim(),
      puntoDesc.trim() || undefined
    );
    setSubmitting(null);
    if (result.success) {
      setPuntoTitulo('');
      setPuntoDesc('');
      await onSuccess();
    }
  };

  const handleAddCompromiso = async () => {
    if (!compromisoDesc.trim()) return;
    setSubmitting('compromiso');
    const result = await addCompromiso(projectId, compromisoDesc.trim(), {
      reunionId,
    });
    setSubmitting(null);
    if (result.success) {
      setCompromisoDesc('');
      await onSuccess();
    }
  };

  const handleAddFODA = async () => {
    if (!fodaDesc.trim()) return;
    setSubmitting('foda');
    const result = await addPuntoFODA(reunionId, fodaTipo, fodaDesc.trim());
    setSubmitting(null);
    if (result.success) {
      setFodaDesc('');
      await onSuccess();
    }
  };

  const handleAddPresupuesto = async () => {
    if (!presupuestoTema.trim()) return;
    setSubmitting('presupuesto');
    const result = await addTemaPresupuesto(
      reunionId,
      presupuestoTema.trim(),
      presupuestoDesc.trim() || undefined
    );
    setSubmitting(null);
    if (result.success) {
      setPresupuestoTema('');
      setPresupuestoDesc('');
      await onSuccess();
    }
  };

  const handleMarcarTarea = async (taskId: string) => {
    setSubmitting(`tarea-${taskId}`);
    const result = await marcarTareaEnReunion(reunionId, taskId);
    setSubmitting(null);
    if (result.success) await onSuccess();
  };

  const handleActualizarIndicador = async (indicadorId: string) => {
    const valor = indicadorValores[indicadorId];
    if (valor === undefined) return;
    setSubmitting(`ind-${indicadorId}`);
    const result = await actualizarIndicadorEnReunion(
      reunionId,
      indicadorId,
      valor
    );
    setSubmitting(null);
    if (result.success) await onSuccess();
  };

  const Section = ({
    id,
    title,
    children,
  }: {
    id: SectionKey;
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left font-medium"
        onClick={() => toggleSection(id)}
      >
        {title}
        {expandedSections[id] ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      {expandedSections[id] && <div className="p-4 border-t">{children}</div>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Completar reunión</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 -mt-2">
          Agrega puntos tratados, marca tareas completadas, actualiza
          indicadores y registra compromisos.
        </p>

        {loadingData ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            <Section id="puntos" title="Puntos tratados">
              <div className="space-y-2">
                <Input
                  placeholder="Título del punto"
                  value={puntoTitulo}
                  onChange={(e) => setPuntoTitulo(e.target.value)}
                />
                <Textarea
                  placeholder="Descripción (opcional)"
                  value={puntoDesc}
                  onChange={(e) => setPuntoDesc(e.target.value)}
                  rows={2}
                />
                <Button
                  size="sm"
                  onClick={handleAddPunto}
                  disabled={!puntoTitulo.trim() || submitting === 'punto'}
                >
                  {submitting === 'punto' && (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  )}
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar punto
                </Button>
              </div>
            </Section>

            <Section id="tareas" title="Tareas completadas (Gantt)">
              <p className="text-xs text-gray-500 mb-2">
                Marca las tareas que se completaron durante la reunión.
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activities.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No hay tareas en el proyecto
                  </p>
                ) : (
                  activities.map((act) =>
                    act.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between py-1.5 border-b last:border-0"
                      >
                        <span className="text-sm">
                          {task.name}
                          <span className="text-gray-400 text-xs ml-1">
                            · {act.name}
                          </span>
                        </span>
                        <Button
                          size="sm"
                          variant={
                            tareasMarcadasIds.has(task.id)
                              ? 'default'
                              : 'outline'
                          }
                          disabled={submitting === `tarea-${task.id}`}
                          onClick={() => handleMarcarTarea(task.id)}
                        >
                          {submitting === `tarea-${task.id}` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : tareasMarcadasIds.has(task.id) ? (
                            'Registrada'
                          ) : (
                            'Marcar'
                          )}
                        </Button>
                      </div>
                    ))
                  )
                )}
              </div>
            </Section>

            <Section id="indicadores" title="Indicadores actualizados">
              <p className="text-xs text-gray-500 mb-2">
                Actualiza el valor alcanzado de los indicadores.
              </p>
              <div className="space-y-3">
                {indicadores.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay indicadores</p>
                ) : (
                  indicadores.map((ind) => (
                    <div
                      key={ind.id}
                      className="flex items-center gap-3 flex-wrap"
                    >
                      <Label className="w-40 text-sm shrink-0 truncate">
                        {ind.nombre}
                      </Label>
                      <Input
                        className="w-24"
                        value={
                          indicadorValores[ind.id] ?? ind.resultadoAlcanzado
                        }
                        onChange={(e) =>
                          setIndicadorValores((prev) => ({
                            ...prev,
                            [ind.id]: e.target.value,
                          }))
                        }
                        placeholder="Valor"
                      />
                      <Button
                        size="sm"
                        disabled={
                          submitting === `ind-${ind.id}` ||
                          (indicadorValores[ind.id] ??
                            ind.resultadoAlcanzado) === ind.resultadoAlcanzado
                        }
                        onClick={() => handleActualizarIndicador(ind.id)}
                      >
                        {submitting === `ind-${ind.id}` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : indicadoresActualizadosIds.has(ind.id) ? (
                          'Actualizado'
                        ) : (
                          'Actualizar'
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Section>

            <Section id="foda" title="Oportunidades y amenazas">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={fodaTipo === 'Oportunidad' ? 'default' : 'outline'}
                    onClick={() => setFodaTipo('Oportunidad')}
                  >
                    Oportunidad
                  </Button>
                  <Button
                    size="sm"
                    variant={fodaTipo === 'Amenaza' ? 'default' : 'outline'}
                    onClick={() => setFodaTipo('Amenaza')}
                  >
                    Amenaza
                  </Button>
                </div>
                <Textarea
                  placeholder="Descripción"
                  value={fodaDesc}
                  onChange={(e) => setFodaDesc(e.target.value)}
                  rows={2}
                />
                <Button
                  size="sm"
                  onClick={handleAddFODA}
                  disabled={!fodaDesc.trim() || submitting === 'foda'}
                >
                  {submitting === 'foda' && (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  )}
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar
                </Button>
              </div>
            </Section>

            <Section id="presupuesto" title="Temas de presupuesto">
              <div className="space-y-2">
                <Input
                  placeholder="Tema"
                  value={presupuestoTema}
                  onChange={(e) => setPresupuestoTema(e.target.value)}
                />
                <Textarea
                  placeholder="Descripción (opcional)"
                  value={presupuestoDesc}
                  onChange={(e) => setPresupuestoDesc(e.target.value)}
                  rows={2}
                />
                <Button
                  size="sm"
                  onClick={handleAddPresupuesto}
                  disabled={
                    !presupuestoTema.trim() || submitting === 'presupuesto'
                  }
                >
                  {submitting === 'presupuesto' && (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  )}
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar tema
                </Button>
              </div>
            </Section>

            <Section
              id="compromisos"
              title="Compromisos (tareas para proyecto)"
            >
              <div className="space-y-2">
                <Textarea
                  placeholder="Descripción del compromiso"
                  value={compromisoDesc}
                  onChange={(e) => setCompromisoDesc(e.target.value)}
                  rows={2}
                />
                <Button
                  size="sm"
                  onClick={handleAddCompromiso}
                  disabled={
                    !compromisoDesc.trim() || submitting === 'compromiso'
                  }
                >
                  {submitting === 'compromiso' && (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  )}
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar compromiso
                </Button>
              </div>
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

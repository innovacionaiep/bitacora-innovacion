'use client';

import { useState, useEffect } from 'react';
import { preloadVoskModel } from '@/lib/vosk-model-loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  getProyectosParaSeguimiento,
  getReunionesMultiplesProyectos,
  createReunion,
} from '@/lib/actions/seguimiento';
import { ReunionModal } from '@/components/seguimiento/ReunionModal';
import {
  ClipboardCheck,
  Plus,
  Calendar,
  User,
  Clock,
  FolderKanban,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

const ROLES_CON_ACCESO_SEGUIMIENTO = ['Admin', 'Coordinador'];

export default function SeguimientoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const proyectoIdFromUrl = searchParams.get('proyectoId');
  const [proyectos, setProyectos] = useState<
    { id: string; proyecto: string; sede: string }[]
  >([]);
  const [reuniones, setReuniones] = useState<
    Awaited<ReturnType<typeof getReunionesMultiplesProyectos>>['data']
  >([]);
  const [selectedProyectoIds, setSelectedProyectoIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNuevaReunion, setShowNuevaReunion] = useState(false);
  const [selectedReunionId, setSelectedReunionId] = useState<string | null>(
    null
  );
  const [reunionModalOpen, setReunionModalOpen] = useState(false);
  const [reunionProjectId, setReunionProjectId] = useState<string | null>(null);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [nuevaReunionProjectId, setNuevaReunionProjectId] = useState('');
  const [nuevaReunionFecha, setNuevaReunionFecha] = useState(() =>
    new Date().toISOString().slice(0, 16)
  );
  const [nuevaReunionDuracion, setNuevaReunionDuracion] = useState('');
  const [nuevaReunionResumen, setNuevaReunionResumen] = useState('');
  const [nuevaReunionNotas, setNuevaReunionNotas] = useState('');
  const [submittingNueva, setSubmittingNueva] = useState(false);

  useEffect(() => {
    preloadVoskModel();
  }, []);

  useEffect(() => {
    if (status === 'loading') return;

    const activeRole = session?.user?.activeRole ?? null;
    if (activeRole !== 'Admin' && activeRole !== 'Coordinador') {
      setLoading(false);
      router.replace('/proyectos');
      return;
    }

    getProyectosParaSeguimiento().then((result) => {
      if (result.success && result.data) {
        setProyectos(result.data);
        if (result.data.length > 0) {
          if (proyectoIdFromUrl && result.data.some((p) => p.id === proyectoIdFromUrl)) {
            setSelectedProyectoIds([proyectoIdFromUrl]);
          } else if (selectedProyectoIds.length === 0) {
            setSelectedProyectoIds(result.data.map((p) => p.id));
          }
        }
      }
      setLoading(false);
    });
  }, [session?.user?.activeRole, status, proyectoIdFromUrl]);

  useEffect(() => {
    if (selectedProyectoIds.length === 0) {
      setReuniones([]);
      return;
    }
    setLoading(true);
    const filtros: { fechaDesde?: Date; fechaHasta?: Date } = {};
    if (fechaDesde) filtros.fechaDesde = new Date(fechaDesde);
    if (fechaHasta) filtros.fechaHasta = new Date(fechaHasta);

    getReunionesMultiplesProyectos(selectedProyectoIds, filtros).then(
      (result) => {
        if (result.success && result.data) {
          setReuniones(result.data);
        }
        setLoading(false);
      }
    );
  }, [selectedProyectoIds.join(','), fechaDesde, fechaHasta]);

  const handleSuccess = async () => {
    if (selectedProyectoIds.length > 0) {
      const result = await getReunionesMultiplesProyectos(selectedProyectoIds, {
        fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
        fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
      });
      if (result.success && result.data) {
        setReuniones(result.data);
      }
    }
  };

  const handleVerReunion = (reunionId: string, projectId: string) => {
    setSelectedReunionId(reunionId);
    setReunionProjectId(projectId);
    setReunionModalOpen(true);
  };

  const handleCrearReunion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaReunionProjectId) return;
    setSubmittingNueva(true);
    const result = await createReunion({
      proyectoId: nuevaReunionProjectId,
      fecha: new Date(nuevaReunionFecha),
      duracionMinutos: nuevaReunionDuracion
        ? parseInt(nuevaReunionDuracion, 10)
        : undefined,
      resumen: nuevaReunionResumen || undefined,
      notas: nuevaReunionNotas || undefined,
    });
    setSubmittingNueva(false);
    if (result.success) {
      setShowNuevaReunion(false);
      setNuevaReunionProjectId('');
      setNuevaReunionResumen('');
      setNuevaReunionNotas('');
      await handleSuccess();
    }
  };

  const formatFecha = (fecha: Date | string) => {
    const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return d.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleProyecto = (id: string) => {
    setSelectedProyectoIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const selectAllProyectos = () => {
    setSelectedProyectoIds(proyectos.map((p) => p.id));
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardCheck className="h-7 w-7 text-emerald-600" />
          Seguimiento de Proyectos
        </h1>
        <Button
          onClick={() => setShowNuevaReunion(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={proyectos.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva reunión
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Proyectos</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllProyectos}
                className="text-xs"
              >
                Todos
              </Button>
              {proyectos.map((p) => (
                <Button
                  key={p.id}
                  variant={
                    selectedProyectoIds.includes(p.id) ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() => toggleProyecto(p.id)}
                  className="text-xs"
                >
                  {p.proyecto}
                </Button>
              ))}
              {proyectos.length === 0 && !loading && (
                <p className="text-sm text-gray-500">
                  No hay proyectos registrados
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <Label htmlFor="fechaDesde" className="text-xs">
                Desde
              </Label>
              <Input
                id="fechaDesde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="mt-1 w-40"
              />
            </div>
            <div>
              <Label htmlFor="fechaHasta" className="text-xs">
                Hasta
              </Label>
              <Input
                id="fechaHasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="mt-1 w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reuniones recientes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : reuniones.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No hay reuniones en los proyectos seleccionados</p>
              <p className="text-sm mt-1">
                Selecciona proyectos para filtrar o crea una nueva reunión
              </p>
              <Link href="/proyectos">
                <Button variant="outline" className="mt-4">
                  Ir a Proyectos
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {reuniones.map((reunion) => (
                <div
                  key={reunion.id}
                  className="border rounded-lg p-4 hover:border-emerald-300 transition-colors cursor-pointer"
                  onClick={() =>
                    handleVerReunion(reunion.id, reunion.proyecto.id)
                  }
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <FolderKanban className="h-4 w-4" />
                        <span className="font-medium text-gray-900">
                          {reunion.proyecto?.proyecto}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900">
                        {formatFecha(reunion.fecha)}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3" />
                          {reunion.coordinador?.name ||
                            reunion.coordinador?.email}
                        </span>
                        {reunion.duracionMinutos && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3" />
                            {reunion.duracionMinutos} min
                          </span>
                        )}
                      </div>
                      {reunion.resumen && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {reunion.resumen}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-emerald-600 font-medium shrink-0">
                      Ver detalle
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showNuevaReunion} onOpenChange={setShowNuevaReunion}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva reunión de seguimiento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrearReunion} className="space-y-4">
            <div>
              <Label htmlFor="proyecto">Proyecto</Label>
              <Select
                value={nuevaReunionProjectId}
                onValueChange={setNuevaReunionProjectId}
                required
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona un proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {proyectos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.proyecto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fecha">Fecha y hora</Label>
              <Input
                id="fecha"
                type="datetime-local"
                value={nuevaReunionFecha}
                onChange={(e) => setNuevaReunionFecha(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="duracion">Duración (minutos)</Label>
              <Input
                id="duracion"
                type="number"
                min="0"
                placeholder="45"
                value={nuevaReunionDuracion}
                onChange={(e) => setNuevaReunionDuracion(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="resumen">Resumen</Label>
              <Textarea
                id="resumen"
                placeholder="Breve resumen..."
                value={nuevaReunionResumen}
                onChange={(e) => setNuevaReunionResumen(e.target.value)}
                className="mt-1 min-h-[80px]"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                placeholder="Notas adicionales..."
                value={nuevaReunionNotas}
                onChange={(e) => setNuevaReunionNotas(e.target.value)}
                className="mt-1 min-h-[60px]"
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNuevaReunion(false)}
                disabled={submittingNueva}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingNueva}>
                {submittingNueva && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crear reunión
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {reunionProjectId && (
        <ReunionModal
          reunionId={selectedReunionId}
          projectId={reunionProjectId}
          open={reunionModalOpen}
          onOpenChange={setReunionModalOpen}
          onUpdated={handleSuccess}
        />
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getProyectos } from '@/lib/actions/proyectos';
import { sendReporteProyecto } from '@/lib/actions/reporte-proyecto';
import { Loader2, FileText } from 'lucide-react';
import type { ProyectoConVariaciones } from '@/types/proyecto';

export default function ReportesPage() {
  const [proyectos, setProyectos] = useState<ProyectoConVariaciones[]>([]);
  const [proyectosLoading, setProyectosLoading] = useState(true);
  const [reporteProyectoId, setReporteProyectoId] = useState<string>('');
  const [reporteTo, setReporteTo] = useState('');
  const [reporteSubject, setReporteSubject] = useState('');
  const [reporteLoading, setReporteLoading] = useState(false);
  const [reporteMessage, setReporteMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    async function loadProyectos() {
      setProyectosLoading(true);
      const result = await getProyectos();
      if (result.success && result.data) {
        setProyectos(result.data);
      }
      setProyectosLoading(false);
    }
    loadProyectos();
  }, []);

  async function handleSendReporte(e: React.FormEvent) {
    e.preventDefault();
    setReporteMessage(null);
    if (!reporteProyectoId) {
      setReporteMessage({ type: 'error', text: 'Selecciona un proyecto.' });
      return;
    }
    const trimmedTo = reporteTo.trim();
    if (!trimmedTo) {
      setReporteMessage({
        type: 'error',
        text: 'Indica al menos un destinatario.',
      });
      return;
    }
    setReporteLoading(true);
    try {
      const result = await sendReporteProyecto(
        reporteProyectoId,
        trimmedTo,
        reporteSubject.trim() || undefined
      );
      if (result.success) {
        setReporteMessage({
          type: 'success',
          text: 'Reporte enviado correctamente.',
        });
      } else {
        setReporteMessage({
          type: 'error',
          text: result.error ?? 'Error al enviar el reporte.',
        });
      }
    } catch {
      setReporteMessage({
        type: 'error',
        text: 'Error inesperado al enviar el reporte.',
      });
    } finally {
      setReporteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reportes</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reporte de estado de un proyecto
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Envía por correo el contenido del tab &quot;Resumen&quot; del
            proyecto: información general, avances, presupuesto, indicadores,
            actividades, seguimiento e historial.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendReporte} className="space-y-4">
            <div className="space-y-2">
              <Label>Proyecto</Label>
              <Select
                value={reporteProyectoId}
                onValueChange={setReporteProyectoId}
                disabled={reporteLoading || proyectosLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      proyectosLoading ? 'Cargando...' : 'Seleccionar proyecto'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {proyectos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.proyecto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!proyectosLoading && proyectos.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay proyectos disponibles.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reporte-to">Destinatarios</Label>
              <Input
                id="reporte-to"
                type="text"
                placeholder="correo1@ejemplo.com, correo2@ejemplo.com"
                value={reporteTo}
                onChange={(e) => setReporteTo(e.target.value)}
                disabled={reporteLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reporte-subject">Asunto (opcional)</Label>
              <Input
                id="reporte-subject"
                type="text"
                placeholder="Por defecto: Reporte: [nombre del proyecto]"
                value={reporteSubject}
                onChange={(e) => setReporteSubject(e.target.value)}
                disabled={reporteLoading}
              />
            </div>

            {reporteMessage && (
              <p
                className={
                  reporteMessage.type === 'success'
                    ? 'text-sm text-emerald-600'
                    : 'text-sm text-destructive'
                }
              >
                {reporteMessage.text}
              </p>
            )}

            <Button
              type="submit"
              disabled={
                reporteLoading || proyectosLoading || !reporteProyectoId
              }
            >
              {reporteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando y enviando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generar y enviar reporte
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

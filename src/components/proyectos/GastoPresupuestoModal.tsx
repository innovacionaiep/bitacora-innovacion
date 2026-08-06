'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Send, MessageSquare } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import {
  getComentariosItemPresupuesto,
  createComentarioItemPresupuesto,
  type ComentarioItemPresupuestoData,
} from '@/lib/actions/comentarios-item-presupuesto';
import { useSession } from 'next-auth/react';
import type { ItemPresupuestoItem } from '@/types/presupuesto';
import { EstadoBadge } from './PresupuestoCard';
import { DEFAULT_AVATAR } from '@/lib/avatars';

interface GastoPresupuestoModalProps {
  gasto: ItemPresupuestoItem;
  onClose: () => void;
  onUpdate?: () => Promise<void>;
}

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function GastoPresupuestoModal({
  gasto,
  onClose,
  onUpdate,
}: GastoPresupuestoModalProps) {
  const { data: session } = useSession();
  const [comentarios, setComentarios] = useState<
    ComentarioItemPresupuestoData[]
  >([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [isLoadingComentarios, setIsLoadingComentarios] = useState(false);
  const [isEnviandoComentario, setIsEnviandoComentario] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const comentariosContainerRef = useRef<HTMLDivElement>(null);
  const comentariosListRef = useRef<HTMLDivElement>(null);

  // Cargar comentarios cuando se abre el modal o cambia el gasto
  useEffect(() => {
    const cargarComentarios = async () => {
      setIsLoadingComentarios(true);
      const result = await getComentariosItemPresupuesto(gasto.id);

      if (result.success && result.data) {
        setComentarios(result.data);
      }
      setIsLoadingComentarios(false);
    };

    cargarComentarios();
  }, [gasto.id]);

  const handleEnviarComentario = async () => {
    if (!nuevoComentario.trim() || !session?.user) return;

    setIsEnviandoComentario(true);
    const result = await createComentarioItemPresupuesto(
      gasto.id,
      nuevoComentario.trim()
    );

    if (result.success && result.data) {
      setComentarios([result.data, ...comentarios]);
      setNuevoComentario('');

      // Llamar a onUpdate para actualizar el conteo de comentarios en la tabla
      if (onUpdate) {
        await onUpdate();
      }
    } else {
      alert(result.error || 'Error al enviar comentario');
    }
    setIsEnviandoComentario(false);
  };

  // Formatear meses de ejecución
  const mesesEjecucion = gasto.proyecciones
    .filter((p) => p.mes > 0)
    .map((p) => p.mes)
    .sort((a, b) => a - b);
  const mesesTexto =
    mesesEjecucion.length > 0
      ? mesesEjecucion.map((mes) => MONTHS[mes - 1]).join(', ')
      : 'No definido';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        ref={dialogContentRef}
        closeButtonPosition="outside-top-right"
        className="w-[65vw] max-w-[65vw] h-[85vh] gap-0 overflow-hidden flex flex-col border border-gray-200 bg-white p-0 shadow-md sm:rounded-lg"
      >
        {/* Header con título y nombre del gasto */}
        <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50/90 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="m-0 text-2xl font-semibold text-gray-900 truncate">
                {gasto.item}
              </DialogTitle>
            </div>
          </div>
        </div>

        {/* Layout de dos columnas con separador */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-6 px-5 py-4 flex-1 min-h-0">
          {/* COLUMNA IZQUIERDA: Información del gasto */}
          <div className="space-y-6 overflow-y-auto min-h-0 custom-scrollbar">
            {/* Sección: Información del gasto */}
            <div className="space-y-6">
              {/* Detalle */}
              <div>
                <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                  Detalle
                </h3>
                <p className="text-[15px] text-gray-800 leading-[1.75]">
                  {gasto.detalle || 'Sin detalle'}
                </p>
              </div>

              {/* Cuenta y Monto */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                    Cuenta
                  </h3>
                  <p className="text-[15px] leading-[1.75] text-gray-800">
                    {gasto.cuenta === 'RRHH'
                      ? 'RRHH'
                      : gasto.cuenta === 'OPERACION'
                        ? 'Operación'
                        : 'Inversión'}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                    Monto
                  </h3>
                  <p className="text-[15px] leading-[1.75] font-semibold tabular-nums text-gray-800">
                    <span className="text-emerald-700">$</span>
                    {gasto.monto.toLocaleString('es-CL')}
                  </p>
                </div>
              </div>

              {/* Estado */}
              <div>
                <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                  Estado
                </h3>
                <EstadoBadge estado={gasto.estado} />
              </div>

              {/* Mes de ejecución */}
              <div>
                <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                  Mes de ejecución
                </h3>
                <p className="text-[15px] leading-[1.75] text-gray-800">
                  {mesesTexto}
                </p>
              </div>

              {/* IDs administrativos */}
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                    N° Solicitud
                  </h3>
                  <p className="text-[15px] leading-[1.75] text-gray-800">
                    {gasto.idSolicitud || 'No definido'}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                    N° OC
                  </h3>
                  <p className="text-[15px] leading-[1.75] text-gray-800">
                    {gasto.idPedido || 'No definido'}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                    N° Recepción
                  </h3>
                  <p className="text-[15px] leading-[1.75] text-gray-800">
                    {gasto.idRecepcion || 'No definido'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SEPARADOR VERTICAL SUTIL */}
          <div className="w-px bg-gray-100"></div>

          {/* COLUMNA DERECHA: Comentarios */}
          <div
            ref={comentariosContainerRef}
            className="flex flex-col pb-2 h-full min-h-0 border-l border-gray-100 pl-6"
          >
            {/* Header de comentarios */}
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4 flex-shrink-0">
              <MessageSquare
                className="h-3.5 w-3.5 text-gray-500"
                strokeWidth={2}
              />
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900">
                Comentarios
              </h3>
            </div>

            {/* Lista de comentarios */}
            <div
              ref={comentariosListRef}
              className="space-y-3 flex-1 overflow-y-auto mb-4 min-h-0 custom-scrollbar"
              style={{ minHeight: 0, maxHeight: '100%' }}
            >
              {isLoadingComentarios ? (
                <p className="text-[13px] text-gray-400">
                  Cargando comentarios...
                </p>
              ) : comentarios.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/40 px-3 py-4">
                  <p className="text-[13px] text-gray-400">
                    No hay comentarios aún
                  </p>
                </div>
              ) : (
                comentarios.map((comentario) => (
                  <div
                    key={comentario.id}
                    className="flex gap-3 p-3 rounded-lg border border-gray-200 bg-white"
                  >
                    <div className="flex-shrink-0">
                      <img
                        src={DEFAULT_AVATAR}
                        alt={comentario.user.name || 'Usuario'}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-[13px] font-medium text-gray-800">
                          {comentario.user.name || 'Usuario'}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(comentario.createdAt).toLocaleDateString(
                            'es-ES',
                            {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-700 leading-snug whitespace-pre-wrap">
                        {comentario.contenido}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input para nuevo comentario */}
            {session?.user && (
              <div className="flex gap-3 pt-3 pb-1 border-t border-gray-100 flex-shrink-0">
                <div className="flex-shrink-0">
                  <img
                    src={DEFAULT_AVATAR}
                    alt={session.user.name || 'Usuario'}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="text-[12px] text-gray-400">
                    Comentas como {session.user.name || session.user.email}
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={nuevoComentario}
                      onChange={(e) => setNuevoComentario(e.target.value)}
                      placeholder="Escribe un comentario..."
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-white shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 resize-none text-[13px] text-gray-800"
                      rows={3}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          handleEnviarComentario();
                        }
                      }}
                    />
                    <button
                      onClick={handleEnviarComentario}
                      disabled={!nuevoComentario.trim() || isEnviandoComentario}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-gray-500 hover:text-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
                      title="Enviar comentario (Ctrl+Enter)"
                    >
                      <Send className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

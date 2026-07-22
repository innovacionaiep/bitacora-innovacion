'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText,
  Calculator,
  Hash,
  Edit2,
  Check,
  Calendar,
  Info,
  BarChart3,
  TrendingUp,
  Send,
  MessageSquare,
} from 'lucide-react';
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
        className="w-[65vw] max-w-[65vw] h-[85vh] p-10 overflow-hidden flex flex-col pb-4"
      >
        {/* Header con título y nombre del gasto */}
        <div className="mb-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <DialogTitle className="text-base font-semibold text-emerald-600 uppercase tracking-wide mb-3">
                GASTO DE PRESUPUESTO
              </DialogTitle>
              <h1 className="text-2xl font-bold text-emerald-600">
                {gasto.item}
              </h1>
            </div>
          </div>
          {/* Línea separadora verde esmeralda */}
          <div className="w-full h-px bg-emerald-600 mt-2"></div>
        </div>

        {/* Layout de dos columnas con separador */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-10 mt-0 flex-1 min-h-0">
          {/* COLUMNA IZQUIERDA: Información del gasto */}
          <div className="space-y-8 overflow-y-auto">
            {/* Sección: Información del gasto */}
            <div className="space-y-6">
              {/* Detalle */}
              <div>
                <h3 className="font-semibold text-gray-900 text-base mb-2">
                  Detalle
                </h3>
                <p className="text-gray-700 text-base">
                  {gasto.detalle || 'Sin detalle'}
                </p>
              </div>

              {/* Cuenta y Monto */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 text-base mb-2">
                    Cuenta
                  </h3>
                  <p className="text-gray-700 text-base">
                    {gasto.cuenta === 'RRHH'
                      ? 'RRHH'
                      : gasto.cuenta === 'OPERACION'
                        ? 'Operación'
                        : 'Inversión'}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-base mb-2">
                    Monto
                  </h3>
                  <p className="text-2xl font-bold text-blue-600">
                    ${gasto.monto.toLocaleString('es-CL')}
                  </p>
                </div>
              </div>

              {/* Estado */}
              <div>
                <h3 className="font-semibold text-gray-900 text-base mb-2">
                  Estado
                </h3>
                <EstadoBadge estado={gasto.estado} />
              </div>

              {/* Mes de ejecución */}
              <div>
                <h3 className="font-semibold text-gray-900 text-base mb-2">
                  Mes de ejecución
                </h3>
                <p className="text-gray-700 text-base">{mesesTexto}</p>
              </div>

              {/* IDs administrativos */}
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 text-base mb-2">
                    N° Solicitud
                  </h3>
                  <p className="text-gray-700 text-base">
                    {gasto.idSolicitud || 'No definido'}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-base mb-2">
                    N° OC
                  </h3>
                  <p className="text-gray-700 text-base">
                    {gasto.idPedido || 'No definido'}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-base mb-2">
                    N° Recepción
                  </h3>
                  <p className="text-gray-700 text-base">
                    {gasto.idRecepcion || 'No definido'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SEPARADOR VERTICAL SUTIL */}
          <div className="w-px bg-gray-200"></div>

          {/* COLUMNA DERECHA: Comentarios */}
          <div
            ref={comentariosContainerRef}
            className="flex flex-col pb-2 h-full min-h-0"
          >
            {/* Header de comentarios */}
            <div className="flex items-center space-x-2 pb-3 border-b border-gray-200 mb-6 flex-shrink-0">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Comentarios</h2>
            </div>

            {/* Lista de comentarios */}
            <div
              ref={comentariosListRef}
              className="space-y-4 flex-1 overflow-y-auto mb-6"
              style={{ minHeight: 0, maxHeight: '100%' }}
            >
              {isLoadingComentarios ? (
                <p className="text-base text-gray-500">
                  Cargando comentarios...
                </p>
              ) : comentarios.length === 0 ? (
                <p className="text-base text-gray-500">
                  No hay comentarios aún
                </p>
              ) : (
                comentarios.map((comentario) => (
                  <div
                    key={comentario.id}
                    className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      <img
                        src={DEFAULT_AVATAR}
                        alt={comentario.user.name || 'Usuario'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-base font-semibold text-gray-900">
                          {comentario.user.name || 'Usuario'}
                        </span>
                        <span className="text-sm text-gray-500">
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
                      <p className="text-base text-gray-700 whitespace-pre-wrap">
                        {comentario.contenido}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input para nuevo comentario */}
            {session?.user && (
              <div className="flex items-start space-x-4 pt-6 pb-4 border-t border-gray-200 flex-shrink-0">
                <div className="flex-shrink-0">
                  <img
                    src={DEFAULT_AVATAR}
                    alt={session.user.name || 'Usuario'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="text-sm text-gray-500 mb-2">
                    Comentas como {session.user.name || session.user.email}
                  </div>
                  <div className="flex items-center space-x-2">
                    <textarea
                      value={nuevoComentario}
                      onChange={(e) => setNuevoComentario(e.target.value)}
                      placeholder="Escribe un comentario..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-base"
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
                      className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Enviar comentario (Ctrl+Enter)"
                    >
                      <Send className="h-5 w-5" />
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

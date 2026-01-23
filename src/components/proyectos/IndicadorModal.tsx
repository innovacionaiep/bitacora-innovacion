'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { FileText, Calculator, Hash, Edit2, Check, Calendar, Info, BarChart3, TrendingUp, Send, MessageSquare } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { updateIndicador } from '@/lib/actions/indicadores';
import { getComentariosIndicador, createComentarioIndicador, type ComentarioIndicadorData } from '@/lib/actions/comentarios-indicador';
import { useSession } from 'next-auth/react';


interface IndicadorModalProps {
  indicador: {
    id: string;
    nombre: string;
    descripcion: string;
    formaCalculo: string;
    resultadoEsperado: string;
    resultadoAlcanzado: string;
    formatoNumero?: string | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
  };
  onClose: () => void;
  onUpdate?: () => Promise<void>;
}

export function IndicadorModal({ indicador, onClose, onUpdate }: IndicadorModalProps) {
  const { data: session } = useSession();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValues, setEditValues] = useState({
    nombre: indicador.nombre,
    descripcion: indicador.descripcion,
    formaCalculo: indicador.formaCalculo,
    formatoNumero: indicador.formatoNumero ?? 'Porcentaje',
    resultadoEsperado: indicador.resultadoEsperado,
    resultadoAlcanzado: indicador.resultadoAlcanzado,
    fechaInicio: indicador.fechaInicio ?? '',
    fechaFin: indicador.fechaFin ?? '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [comentarios, setComentarios] = useState<ComentarioIndicadorData[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [isLoadingComentarios, setIsLoadingComentarios] = useState(false);
  const [isEnviandoComentario, setIsEnviandoComentario] = useState(false);
  const lastIndicadorIdRef = useRef<string>(indicador.id);
  const justSavedRef = useRef<boolean>(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const comentariosContainerRef = useRef<HTMLDivElement>(null);
  const comentariosListRef = useRef<HTMLDivElement>(null);
  const loadingComentariosRef = useRef<{ indicadorId: string; timestamp: number } | null>(null);

  // Actualizar editValues solo cuando cambia el ID del indicador (nuevo indicador seleccionado)
  useEffect(() => {
    // Solo actualizar si cambió el ID del indicador (nuevo indicador seleccionado)
    if (indicador.id !== lastIndicadorIdRef.current) {
      lastIndicadorIdRef.current = indicador.id;
      setEditValues({
        nombre: indicador.nombre,
        descripcion: indicador.descripcion,
        formaCalculo: indicador.formaCalculo,
        formatoNumero: indicador.formatoNumero ?? 'Porcentaje',
        resultadoEsperado: indicador.resultadoEsperado,
        resultadoAlcanzado: indicador.resultadoAlcanzado,
        fechaInicio: indicador.fechaInicio ?? '',
        fechaFin: indicador.fechaFin ?? '',
      });
      setIsEditMode(false);
    }
  }, [indicador.id]); // Solo dependemos del ID para evitar re-renders durante la edición

  // Actualizar valores después de guardar (cuando no está en modo edición)
  useEffect(() => {
    // Solo actualizar si no está en modo edición y es el mismo indicador
    // Esto evita actualizaciones mientras el usuario está escribiendo
    if (!isEditMode && indicador.id === lastIndicadorIdRef.current) {
      const newValues = {
        nombre: indicador.nombre,
        descripcion: indicador.descripcion,
        formaCalculo: indicador.formaCalculo,
        formatoNumero: indicador.formatoNumero ?? 'Porcentaje',
        resultadoEsperado: indicador.resultadoEsperado,
        resultadoAlcanzado: indicador.resultadoAlcanzado,
        fechaInicio: indicador.fechaInicio ?? '',
        fechaFin: indicador.fechaFin ?? '',
      };
      
      // Si acabamos de guardar, verificar si el prop ya tiene los valores nuevos
      // Si los valores del prop coinciden con los valores locales, significa que el prop se actualizó
      if (justSavedRef.current) {
        const propMatchesLocal = 
          newValues.nombre === editValues.nombre &&
          newValues.descripcion === editValues.descripcion &&
          newValues.formaCalculo === editValues.formaCalculo &&
          newValues.formatoNumero === editValues.formatoNumero &&
          newValues.resultadoEsperado === editValues.resultadoEsperado &&
          newValues.resultadoAlcanzado === editValues.resultadoAlcanzado &&
          newValues.fechaInicio === editValues.fechaInicio &&
          newValues.fechaFin === editValues.fechaFin;
        
        if (propMatchesLocal) {
          // El prop se actualizó correctamente, resetear la bandera
          justSavedRef.current = false;
        } else {
          // El prop todavía tiene valores antiguos, no sobrescribir los valores locales
          return;
        }
      }
      
      // Solo actualizar si los valores han cambiado para evitar re-renders innecesarios
      if (
        editValues.nombre !== newValues.nombre ||
        editValues.descripcion !== newValues.descripcion ||
        editValues.formaCalculo !== newValues.formaCalculo ||
        editValues.formatoNumero !== newValues.formatoNumero ||
        editValues.resultadoEsperado !== newValues.resultadoEsperado ||
        editValues.resultadoAlcanzado !== newValues.resultadoAlcanzado ||
        editValues.fechaInicio !== newValues.fechaInicio ||
        editValues.fechaFin !== newValues.fechaFin
      ) {
        setEditValues(newValues);
      }
    }
  }, [isEditMode, indicador.nombre, indicador.resultadoAlcanzado, indicador.resultadoEsperado, indicador.descripcion, indicador.formaCalculo, indicador.formatoNumero]); // Depender también de los valores del prop para detectar actualizaciones

  // Ocultar toast después de 3 segundos
  useEffect(() => {
    if (showSuccessToast) {
      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessToast]);


  // Cargar comentarios cuando se abre el modal o cambia el indicador
  useEffect(() => {
    const currentIndicadorId = indicador.id;
    const requestTimestamp = Date.now();
    
    // Verificar si ya hay una llamada en progreso para este indicador (dentro de 2 segundos)
    if (loadingComentariosRef.current && 
        loadingComentariosRef.current.indicadorId === currentIndicadorId &&
        (requestTimestamp - loadingComentariosRef.current.timestamp) < 2000) {
      return;
    }
    
    let isCancelled = false;
    loadingComentariosRef.current = { indicadorId: currentIndicadorId, timestamp: requestTimestamp };
    
    const cargarComentarios = async () => {
      // Verificar si el indicador cambió o fue cancelado antes de hacer la llamada
      if (isCancelled || loadingComentariosRef.current?.indicadorId !== currentIndicadorId) {
        return;
      }
      
      setIsLoadingComentarios(true);
      const result = await getComentariosIndicador(currentIndicadorId);
      
      // Verificar si el efecto fue cancelado antes de actualizar el estado
      if (isCancelled || loadingComentariosRef.current?.indicadorId !== currentIndicadorId) {
        return;
      }
      
      if (result.success && result.data) {
        setComentarios(result.data);
      }
      setIsLoadingComentarios(false);
      loadingComentariosRef.current = null;
    };
    
    cargarComentarios();
    
    // Cleanup: marcar como cancelado y limpiar el ref si el componente se desmonta o cambia el indicador
    return () => {
      isCancelled = true;
      if (loadingComentariosRef.current?.indicadorId === currentIndicadorId) {
        loadingComentariosRef.current = null;
      }
    };
  }, [indicador.id]);

  const handleEnviarComentario = async () => {
    if (!nuevoComentario.trim() || !session?.user) return;

    setIsEnviandoComentario(true);
    const result = await createComentarioIndicador(indicador.id, nuevoComentario.trim());

    if (result.success && result.data) {
      setComentarios([result.data, ...comentarios]);
      setNuevoComentario('');
      
      // Llamar a onUpdate para actualizar el conteo de comentarios en las tarjetas
      if (onUpdate) {
        await onUpdate();
      }
    } else {
      alert(result.error || 'Error al enviar comentario');
    }
    setIsEnviandoComentario(false);
  };

  const toggleEditMode = () => {
    if (isEditMode) {
      // Si está saliendo del modo edición, restaurar valores originales
      setEditValues({
        nombre: indicador.nombre,
        descripcion: indicador.descripcion,
        formaCalculo: indicador.formaCalculo,
        formatoNumero: indicador.formatoNumero ?? 'Porcentaje',
        resultadoEsperado: indicador.resultadoEsperado,
        resultadoAlcanzado: indicador.resultadoAlcanzado,
        fechaInicio: indicador.fechaInicio ?? '',
        fechaFin: indicador.fechaFin ?? '',
      });
    }
    setIsEditMode(!isEditMode);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // Preparar los datos a actualizar (solo los campos que han sido editados)
      const updateData: any = {};
      
      // Verificar qué campos han cambiado
      if (editValues.nombre !== indicador.nombre) {
        updateData.nombre = editValues.nombre;
      }
      if (editValues.descripcion !== indicador.descripcion) {
        updateData.descripcion = editValues.descripcion;
      }
      if (editValues.formaCalculo !== indicador.formaCalculo) {
        updateData.formaCalculo = editValues.formaCalculo;
      }
      if (editValues.formatoNumero !== (indicador.formatoNumero ?? 'Porcentaje')) {
        updateData.formatoNumero = editValues.formatoNumero;
      }
      if (editValues.resultadoEsperado !== indicador.resultadoEsperado) {
        updateData.resultadoEsperado = editValues.resultadoEsperado;
      }
      if (editValues.resultadoAlcanzado !== indicador.resultadoAlcanzado) {
        updateData.resultadoAlcanzado = editValues.resultadoAlcanzado;
      }
      if (editValues.fechaInicio !== (indicador.fechaInicio ?? '')) {
        updateData.fechaInicio = editValues.fechaInicio || null;
      }
      if (editValues.fechaFin !== (indicador.fechaFin ?? '')) {
        updateData.fechaFin = editValues.fechaFin || null;
      }

      // Si no hay cambios, no hacer nada
      if (Object.keys(updateData).length === 0) {
        setIsSaving(false);
        setIsEditMode(false);
        return;
      }
      
      const result = await updateIndicador(indicador.id, updateData);
      
      if (result.success) {
        // Marcar que acabamos de guardar ANTES de cambiar cualquier estado
        // Esto evita que el useEffect sobrescriba los valores cuando se ejecute
        justSavedRef.current = true;
        
        // Actualizar el estado local inmediatamente con los valores guardados
        // Esto evita mostrar valores antiguos mientras se actualiza el estado del padre
        const newEditValues = {
          ...editValues,
          ...updateData
        };
        setEditValues(newEditValues);
        
        setIsEditMode(false);
        setShowSuccessToast(true);
        
        // Refrescar los datos después de guardar exitosamente
        if (onUpdate) {
          await onUpdate();
        }
        // Los valores se actualizarán automáticamente cuando el prop indicador cambie
        // gracias al useEffect que maneja las actualizaciones cuando no está en modo edición
      } else {
        alert(`Error al guardar: ${result.error}`);
      }
    } catch (error) {
      alert(`Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelAll = () => {
    setEditValues({
      nombre: indicador.nombre,
      descripcion: indicador.descripcion,
      formaCalculo: indicador.formaCalculo,
      formatoNumero: indicador.formatoNumero ?? 'Porcentaje',
      resultadoEsperado: indicador.resultadoEsperado,
      resultadoAlcanzado: indicador.resultadoAlcanzado,
      fechaInicio: indicador.fechaInicio ?? '',
      fechaFin: indicador.fechaFin ?? '',
    });
    setIsEditMode(false);
  };

  const hasChanges = () => {
    return editValues.nombre !== indicador.nombre ||
           editValues.descripcion !== indicador.descripcion ||
           editValues.formaCalculo !== indicador.formaCalculo ||
           editValues.formatoNumero !== (indicador.formatoNumero ?? 'Porcentaje') ||
           editValues.resultadoEsperado !== indicador.resultadoEsperado ||
           editValues.resultadoAlcanzado !== indicador.resultadoAlcanzado ||
           editValues.fechaInicio !== (indicador.fechaInicio ?? '') ||
           editValues.fechaFin !== (indicador.fechaFin ?? '');
  };

  // Funciones para cálculo y formateo (igual que en IndicadorCard)
  const parseValue = (value: string): number => {
    if (!value || value === '') return 0;
    const cleaned = value.toString().replace(/%/g, '').replace(/,/g, '.').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatResultado = (value: string, formato: string | null | undefined): string => {
    const numValue = parseValue(value);
    if (formato === 'Porcentaje') {
      return `${Math.round(numValue)}%`;
    } else if (formato === 'Número Entero') {
      return Math.round(numValue).toString();
    } else if (formato === 'Número Decimal') {
      return numValue.toFixed(2);
    }
    if (value.includes('%')) {
      return `${Math.round(numValue)}%`;
    }
    return Math.round(numValue).toString();
  };

  // Calcular porcentaje de cumplimiento
  const resultadoEsperadoNum = parseValue(editValues.resultadoEsperado);
  const resultadoAlcanzadoNum = parseValue(editValues.resultadoAlcanzado);
  
  let porcentajeCumplimiento = 0;
  if (resultadoEsperadoNum > 0) {
    porcentajeCumplimiento = (resultadoAlcanzadoNum / resultadoEsperadoNum) * 100;
  } else if (resultadoAlcanzadoNum > 0) {
    porcentajeCumplimiento = 100;
  }

  // Determinar color según porcentaje (igual que IndicadorCard)
  let colorEstado = '';
  let badgeColor = '';
  let badgeBg = '';
  if (porcentajeCumplimiento < 50) {
    colorEstado = 'text-red-600';
    badgeColor = 'text-red-700';
    badgeBg = 'bg-red-100';
  } else if (porcentajeCumplimiento >= 50 && porcentajeCumplimiento < 100) {
    colorEstado = 'text-yellow-600';
    badgeColor = 'text-yellow-700';
    badgeBg = 'bg-yellow-100';
  } else {
    colorEstado = 'text-emerald-600';
    badgeColor = 'text-emerald-700';
    badgeBg = 'bg-emerald-100';
  }

  const resultadoEsperadoFormateado = formatResultado(editValues.resultadoEsperado, editValues.formatoNumero);
  const resultadoAlcanzadoFormateado = formatResultado(editValues.resultadoAlcanzado, editValues.formatoNumero);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent ref={dialogContentRef} className="w-[65vw] max-w-[65vw] h-[85vh] p-10 overflow-hidden flex flex-col pb-4">
        {/* Header con título, nombre e indicador de cumplimiento */}
        <div className="mb-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <DialogTitle className="text-base font-semibold text-emerald-600 uppercase tracking-wide mb-3">
                INDICADOR
              </DialogTitle>
              {isEditMode ? (
                <input
                  type="text"
                  value={editValues.nombre}
                  onChange={(e) => setEditValues({ ...editValues, nombre: e.target.value })}
                  className="text-2xl font-bold text-emerald-600 w-full px-3 py-2 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              ) : (
                <h1 className="text-2xl font-bold text-emerald-600">
                  {editValues.nombre}
                </h1>
              )}
            </div>
            <div className="flex items-center space-x-4 ml-4">
              <span className="text-base font-medium text-gray-700">Cumplimiento</span>
              <div className="w-64 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    porcentajeCumplimiento < 50
                      ? 'bg-red-500'
                      : porcentajeCumplimiento < 100
                      ? 'bg-yellow-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(porcentajeCumplimiento, 100)}%` }}
                />
              </div>
              <span className={`text-2xl font-bold ${colorEstado} min-w-[4rem]`}>
                {Math.round(porcentajeCumplimiento)}%
              </span>
            </div>
          </div>
          {/* Línea separadora verde esmeralda */}
          <div className="w-full h-px bg-emerald-600 mt-2"></div>
        </div>
        
        {/* Layout de dos columnas con separador */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-10 mt-0 flex-1 min-h-0">
          {/* COLUMNA IZQUIERDA: Fechas primero, luego información sin tarjetas */}
          <div 
            className={`space-y-8 overflow-y-auto ${isEditMode ? 'max-h-[calc(100%-140px)]' : 'h-full'}`}
          >
            {/* FECHAS (Primero) - Horizontal */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <span className="text-base font-medium text-gray-700">Inicio</span>
                {isEditMode ? (
                  <input
                    type="date"
                    value={editValues.fechaInicio}
                    onChange={(e) => setEditValues({ ...editValues, fechaInicio: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  />
                ) : (
                  <span className="text-gray-700 text-base">
                    {editValues.fechaInicio 
                      ? (() => {
                          try {
                            const date = new Date(editValues.fechaInicio);
                            const day = String(date.getDate()).padStart(2, '0');
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const year = String(date.getFullYear()).slice(-2);
                            return `${day}.${month}.${year}`;
                          } catch {
                            return 'No definida';
                          }
                        })()
                      : 'No definida'}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <span className="text-base font-medium text-gray-700">Finalización</span>
                {isEditMode ? (
                  <input
                    type="date"
                    value={editValues.fechaFin}
                    onChange={(e) => setEditValues({ ...editValues, fechaFin: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  />
                ) : (
                  <span className="text-gray-700 text-base">
                    {editValues.fechaFin 
                      ? (() => {
                          try {
                            const date = new Date(editValues.fechaFin);
                            const day = String(date.getDate()).padStart(2, '0');
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const year = String(date.getFullYear()).slice(-2);
                            return `${day}.${month}.${year}`;
                          } catch {
                            return 'No definida';
                          }
                        })()
                      : 'No definida'}
                  </span>
                )}
              </div>
            </div>

            {/* SECCIÓN: Descripción, Forma de Cálculo, Formato del número - SIN TARJETAS */}
            <div className="space-y-6">
              {/* Descripción */}
              <div>
                <h3 className="font-semibold text-gray-900 text-base mb-2">Descripción</h3>
                {isEditMode ? (
                  <textarea
                    value={editValues.descripcion}
                    onChange={(e) => setEditValues({ ...editValues, descripcion: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[110px] resize-y text-base"
                    rows={3}
                  />
                ) : (
                  <p className="text-gray-700 text-base">{editValues.descripcion}</p>
                )}
              </div>

              {/* Forma de Cálculo */}
              <div>
                <h3 className="font-semibold text-gray-900 text-base mb-2">Forma de Cálculo</h3>
                {isEditMode ? (
                  <textarea
                    value={editValues.formaCalculo}
                    onChange={(e) => setEditValues({ ...editValues, formaCalculo: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[110px] resize-y text-base"
                    rows={3}
                  />
                ) : (
                  <p className="text-gray-700 text-base">{editValues.formaCalculo}</p>
                )}
              </div>

              {/* Formato del Número */}
              <div>
                <h3 className="font-semibold text-gray-900 text-base mb-2">Formato del número</h3>
                {isEditMode ? (
                  <select
                    value={editValues.formatoNumero}
                    onChange={(e) => setEditValues({ ...editValues, formatoNumero: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  >
                    {['Porcentaje', 'Número Entero', 'Número Decimal'].map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-700 text-base">{editValues.formatoNumero}</p>
                )}
              </div>

              {/* Resultados */}
              <div className="mt-6">
                <div className="flex items-center space-x-2 pb-3 border-b border-gray-200 mb-3">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Resultados</h2>
                </div>
                
                {/* Esperado y Actual con línea separadora vertical */}
                <div className="flex items-center">
                  {/* Resultado Esperado */}
                  <div className="flex-1 flex flex-col items-center py-3">
                    <span className="text-base font-medium text-blue-600 mb-2">Esperado</span>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={editValues.resultadoEsperado}
                        onChange={(e) => setEditValues({ ...editValues, resultadoEsperado: e.target.value })}
                        className="w-full max-w-[160px] px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-2xl font-bold text-center"
                      />
                    ) : (
                      <p className="text-2xl font-bold text-blue-600">{resultadoEsperadoFormateado}</p>
                    )}
                  </div>

                  {/* Línea separadora vertical */}
                  <div className="w-px h-14 bg-gray-200 self-center"></div>

                  {/* Resultado Actual */}
                  <div className="flex-1 flex flex-col items-center py-3">
                    <span className={`text-base font-medium mb-2 ${colorEstado}`}>Actual</span>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={editValues.resultadoAlcanzado}
                        onChange={(e) => setEditValues({ ...editValues, resultadoAlcanzado: e.target.value })}
                        className="w-full max-w-[160px] px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-2xl font-bold text-center"
                      />
                    ) : (
                      <p className={`text-2xl font-bold ${colorEstado}`}>{resultadoAlcanzadoFormateado}</p>
                    )}
                  </div>
                </div>
                
                {/* Línea separadora horizontal debajo */}
                <div className="w-full h-px bg-gray-200 mt-2"></div>
              </div>
            </div>
          </div>

          {/* SEPARADOR VERTICAL SUTIL */}
          <div className="w-px bg-gray-200"></div>

          {/* COLUMNA DERECHA: Solo Comentarios */}
          <div ref={comentariosContainerRef} className="flex flex-col pb-2 h-full min-h-0">
            {/* Header de comentarios - movido más arriba */}
            <div className="flex items-center space-x-2 pb-3 border-b border-gray-200 mb-6 flex-shrink-0">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Comentarios</h2>
            </div>

            {/* Lista de comentarios - con flex-1 para ocupar espacio disponible */}
            <div ref={comentariosListRef} className="space-y-4 flex-1 overflow-y-auto mb-6" style={{ minHeight: 0, maxHeight: '100%' }}>
              {isLoadingComentarios ? (
                <p className="text-base text-gray-500">Cargando comentarios...</p>
              ) : comentarios.length === 0 ? (
                <p className="text-base text-gray-500">No hay comentarios aún</p>
              ) : (
                comentarios.map((comentario) => (
                  <div key={comentario.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      {comentario.user.image ? (
                        <img
                          src={comentario.user.image}
                          alt={comentario.user.name || 'Usuario'}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {(comentario.user.name || comentario.user.email)[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-base font-semibold text-gray-900">
                          {comentario.user.name || 'Usuario'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(comentario.createdAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-base text-gray-700 whitespace-pre-wrap">{comentario.contenido}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input para nuevo comentario - posicionado al final */}
            {session?.user && (
              <div className="flex items-start space-x-4 pt-6 pb-4 border-t border-gray-200 flex-shrink-0">
                  <div className="flex-shrink-0">
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || 'Usuario'}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {(session.user.name || session.user.email)[0].toUpperCase()}
                        </span>
                      </div>
                    )}
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

        {/* Toast de éxito */}
        {showSuccessToast && (
          <div className="fixed bottom-6 right-6 bg-emerald-500 text-white px-8 py-4 rounded-lg shadow-lg flex items-center space-x-2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Check className="h-6 w-6" />
            <span className="font-semibold text-base">Guardado con éxito</span>
          </div>
        )}

        {/* Footer con botones de guardar y cancelar */}
        {isEditMode ? (
          <div className="absolute bottom-6 left-6 flex items-center space-x-4 z-50">
            {/* Botón redondo de cancelar (X roja) */}
            <button
              onClick={handleCancelAll}
              className="w-14 h-14 rounded-full shadow-sm transition-all duration-300 flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-600 border border-red-200"
              title="Salir del modo edición"
              disabled={isSaving}
            >
              <span className="text-xl font-semibold">×</span>
            </button>
            
            {/* Botón Guardar */}
            <button
              onClick={handleSaveAll}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-base"
              disabled={isSaving || !hasChanges()}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  <span>Guardar cambios</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Botón redondo de edición en la parte inferior izquierda (solo cuando NO está en modo edición) */
          <button
            onClick={toggleEditMode}
            className="absolute bottom-6 left-6 w-14 h-14 rounded-full shadow-sm transition-all duration-300 flex items-center justify-center z-50 bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200"
            title="Modo edición"
          >
            <Edit2 className="h-6 w-6" />
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}

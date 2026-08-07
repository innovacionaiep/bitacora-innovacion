'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Check,
  Send,
  MessageSquare,
  Paperclip,
  Loader2,
  X,
} from 'lucide-react';
import { DEFAULT_AVATAR } from '@/lib/avatars';
import { useState, useEffect, useRef } from 'react';
import { updateIndicador } from '@/lib/actions/indicadores';
import {
  getComentariosIndicador,
  createComentarioIndicador,
  type ComentarioIndicadorData,
} from '@/lib/actions/comentarios-indicador';
import {
  getEvidenciasIndicador,
  createEvidenciaIndicador,
  deleteEvidenciaIndicador,
  type EvidenciaIndicadorData,
} from '@/lib/actions/evidencias-indicador';
import { uploadEvidenciaFile } from '@/lib/evidencias-upload';
import { Button } from '@/components/ui/button';
import { PeriodTimeline } from '@/components/ui/period-timeline';
import { useSession } from 'next-auth/react';
import {
  ActivityFieldSaveCancel,
  ActivityHoverEditButton,
} from '@/components/proyectos/gantt/ActivityFieldControls';

type IndicadorEditableField =
  | 'nombre'
  | 'fechas'
  | 'descripcion'
  | 'formaCalculo'
  | 'formatoNumero'
  | 'resultadoEsperado'
  | 'resultadoAlcanzado';

type IndicadorEditValues = {
  nombre: string;
  descripcion: string;
  formaCalculo: string;
  formatoNumero: string;
  resultadoEsperado: string;
  resultadoAlcanzado: string;
  fechaInicio: string;
  fechaFin: string;
};

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
  onUpdate?: (optimistic?: {
    id: string;
    patch: Partial<{
      nombre: string;
      descripcion: string;
      formaCalculo: string;
      formatoNumero: string | null;
      resultadoEsperado: string;
      resultadoAlcanzado: string;
      fechaInicio: string | null;
      fechaFin: string | null;
    }>;
  }) => Promise<void> | void;
  projectId?: string;
  /** Oculta los botones de edición por campo (ej. en el portal de inicio). El botón de cargar evidencias sigue visible. */
  hideEditButton?: boolean;
  /**
   * Si false, no monta Dialog/DialogContent (el padre ya los tiene).
   * Evita el parpadeo al cargar desde IndicadorDetalleModal.
   */
  wrapInDialog?: boolean;
}

function valuesFromIndicador(
  indicador: IndicadorModalProps['indicador']
): IndicadorEditValues {
  return {
    nombre: indicador.nombre,
    descripcion: indicador.descripcion,
    formaCalculo: indicador.formaCalculo,
    formatoNumero: indicador.formatoNumero ?? 'Porcentaje',
    resultadoEsperado: indicador.resultadoEsperado,
    resultadoAlcanzado: indicador.resultadoAlcanzado,
    fechaInicio: indicador.fechaInicio ?? '',
    fechaFin: indicador.fechaFin ?? '',
  };
}

export function IndicadorModal({
  indicador,
  onClose,
  onUpdate,
  hideEditButton = false,
  wrapInDialog = true,
}: IndicadorModalProps) {
  const { data: session } = useSession();
  const canEdit = !hideEditButton;
  const [editingField, setEditingField] =
    useState<IndicadorEditableField | null>(null);
  const [values, setValues] = useState<IndicadorEditValues>(() =>
    valuesFromIndicador(indicador)
  );
  const [fieldDraft, setFieldDraft] = useState<IndicadorEditValues>(() =>
    valuesFromIndicador(indicador)
  );
  const [isSavingField, setIsSavingField] = useState(false);
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
  const loadingComentariosRef = useRef<{
    indicadorId: string;
    timestamp: number;
  } | null>(null);

  const [evidenciasIndicador, setEvidenciasIndicador] = useState<
    EvidenciaIndicadorData[]
  >([]);
  const [isLoadingEvidencias, setIsLoadingEvidencias] = useState(false);
  const [isUploadingEvidencia, setIsUploadingEvidencia] = useState(false);
  const evidenciasFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (indicador.id !== lastIndicadorIdRef.current) {
      lastIndicadorIdRef.current = indicador.id;
      const next = valuesFromIndicador(indicador);
      setValues(next);
      setFieldDraft(next);
      setEditingField(null);
    }
  }, [indicador.id]);

  useEffect(() => {
    if (editingField !== null || indicador.id !== lastIndicadorIdRef.current) {
      return;
    }

    const newValues = valuesFromIndicador(indicador);

    setValues((prev) => {
      if (justSavedRef.current) {
        const propMatchesLocal =
          newValues.nombre === prev.nombre &&
          newValues.descripcion === prev.descripcion &&
          newValues.formaCalculo === prev.formaCalculo &&
          newValues.formatoNumero === prev.formatoNumero &&
          newValues.resultadoEsperado === prev.resultadoEsperado &&
          newValues.resultadoAlcanzado === prev.resultadoAlcanzado &&
          newValues.fechaInicio === prev.fechaInicio &&
          newValues.fechaFin === prev.fechaFin;

        if (propMatchesLocal) {
          justSavedRef.current = false;
        } else {
          return prev;
        }
      }

      if (
        prev.nombre === newValues.nombre &&
        prev.descripcion === newValues.descripcion &&
        prev.formaCalculo === newValues.formaCalculo &&
        prev.formatoNumero === newValues.formatoNumero &&
        prev.resultadoEsperado === newValues.resultadoEsperado &&
        prev.resultadoAlcanzado === newValues.resultadoAlcanzado &&
        prev.fechaInicio === newValues.fechaInicio &&
        prev.fechaFin === newValues.fechaFin
      ) {
        return prev;
      }
      return newValues;
    });
  }, [
    editingField,
    indicador.nombre,
    indicador.resultadoAlcanzado,
    indicador.resultadoEsperado,
    indicador.descripcion,
    indicador.formaCalculo,
    indicador.formatoNumero,
    indicador.fechaInicio,
    indicador.fechaFin,
    indicador.id,
  ]);

  useEffect(() => {
    if (showSuccessToast) {
      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessToast]);

  useEffect(() => {
    const currentIndicadorId = indicador.id;
    const requestTimestamp = Date.now();

    if (
      loadingComentariosRef.current &&
      loadingComentariosRef.current.indicadorId === currentIndicadorId &&
      requestTimestamp - loadingComentariosRef.current.timestamp < 2000
    ) {
      return;
    }

    let isCancelled = false;
    loadingComentariosRef.current = {
      indicadorId: currentIndicadorId,
      timestamp: requestTimestamp,
    };

    const cargarComentarios = async () => {
      if (
        isCancelled ||
        loadingComentariosRef.current?.indicadorId !== currentIndicadorId
      ) {
        return;
      }

      setIsLoadingComentarios(true);
      const result = await getComentariosIndicador(currentIndicadorId);

      if (
        isCancelled ||
        loadingComentariosRef.current?.indicadorId !== currentIndicadorId
      ) {
        return;
      }

      if (result.success && result.data) {
        setComentarios(result.data);
      }
      setIsLoadingComentarios(false);
      loadingComentariosRef.current = null;
    };

    cargarComentarios();

    return () => {
      isCancelled = true;
      if (loadingComentariosRef.current?.indicadorId === currentIndicadorId) {
        loadingComentariosRef.current = null;
      }
    };
  }, [indicador.id]);

  useEffect(() => {
    const currentIndicadorId = indicador.id;
    let isCancelled = false;
    const cargarEvidencias = async () => {
      setIsLoadingEvidencias(true);
      const result = await getEvidenciasIndicador(currentIndicadorId);
      if (!isCancelled && result.success && result.data) {
        setEvidenciasIndicador(result.data);
      }
      setIsLoadingEvidencias(false);
    };
    cargarEvidencias();
    return () => {
      isCancelled = true;
    };
  }, [indicador.id]);

  const handleEnviarComentario = async () => {
    if (!nuevoComentario.trim() || !session?.user) return;

    setIsEnviandoComentario(true);
    const result = await createComentarioIndicador(
      indicador.id,
      nuevoComentario.trim()
    );

    if (result.success && result.data) {
      setComentarios([result.data, ...comentarios]);
      setNuevoComentario('');

      if (onUpdate) {
        await onUpdate();
      }
    } else {
      alert(result.error || 'Error al enviar comentario');
    }
    setIsEnviandoComentario(false);
  };

  const handleStartFieldEdit = (field: IndicadorEditableField) => {
    setFieldDraft({ ...values });
    setEditingField(field);
  };

  const handleCancelFieldEdit = () => {
    setFieldDraft({ ...values });
    setEditingField(null);
  };

  const buildFieldUpdate = (
    field: IndicadorEditableField
  ): Parameters<typeof updateIndicador>[1] | null => {
    switch (field) {
      case 'nombre': {
        const nombre = fieldDraft.nombre.trim();
        if (!nombre) {
          alert('El nombre del indicador no puede estar vacío');
          return null;
        }
        if (nombre === values.nombre) return {};
        return { nombre };
      }
      case 'fechas': {
        const update: Parameters<typeof updateIndicador>[1] = {};
        if (fieldDraft.fechaInicio !== values.fechaInicio) {
          update.fechaInicio = fieldDraft.fechaInicio || null;
        }
        if (fieldDraft.fechaFin !== values.fechaFin) {
          update.fechaFin = fieldDraft.fechaFin || null;
        }
        return update;
      }
      case 'descripcion':
        if (fieldDraft.descripcion === values.descripcion) return {};
        return { descripcion: fieldDraft.descripcion };
      case 'formaCalculo':
        if (fieldDraft.formaCalculo === values.formaCalculo) return {};
        return { formaCalculo: fieldDraft.formaCalculo };
      case 'formatoNumero':
        if (fieldDraft.formatoNumero === values.formatoNumero) return {};
        return { formatoNumero: fieldDraft.formatoNumero };
      case 'resultadoEsperado':
        if (fieldDraft.resultadoEsperado === values.resultadoEsperado) return {};
        return { resultadoEsperado: fieldDraft.resultadoEsperado };
      case 'resultadoAlcanzado':
        if (fieldDraft.resultadoAlcanzado === values.resultadoAlcanzado)
          return {};
        return { resultadoAlcanzado: fieldDraft.resultadoAlcanzado };
      default:
        return {};
    }
  };

  const applyUpdateToValues = (
    updateData: Parameters<typeof updateIndicador>[1]
  ): IndicadorEditValues => ({
    ...values,
    ...(updateData.nombre !== undefined ? { nombre: updateData.nombre } : {}),
    ...(updateData.descripcion !== undefined
      ? { descripcion: updateData.descripcion }
      : {}),
    ...(updateData.formaCalculo !== undefined
      ? { formaCalculo: updateData.formaCalculo }
      : {}),
    ...(updateData.formatoNumero !== undefined
      ? { formatoNumero: updateData.formatoNumero ?? 'Porcentaje' }
      : {}),
    ...(updateData.resultadoEsperado !== undefined
      ? { resultadoEsperado: updateData.resultadoEsperado }
      : {}),
    ...(updateData.resultadoAlcanzado !== undefined
      ? { resultadoAlcanzado: updateData.resultadoAlcanzado }
      : {}),
    ...(updateData.fechaInicio !== undefined
      ? { fechaInicio: updateData.fechaInicio ?? '' }
      : {}),
    ...(updateData.fechaFin !== undefined
      ? { fechaFin: updateData.fechaFin ?? '' }
      : {}),
  });

  const handleSaveField = async () => {
    if (!editingField) return;

    const updateData = buildFieldUpdate(editingField);
    if (updateData === null) return;

    if (Object.keys(updateData).length === 0) {
      setEditingField(null);
      return;
    }

    const previousValues = { ...values };
    const nextValues = applyUpdateToValues(updateData);

    justSavedRef.current = true;
    setValues(nextValues);
    setFieldDraft(nextValues);
    setEditingField(null);
    setShowSuccessToast(true);
    setIsSavingField(true);

    if (onUpdate) {
      void onUpdate({
        id: indicador.id,
        patch: {
          ...updateData,
          formatoNumero:
            updateData.formatoNumero !== undefined
              ? updateData.formatoNumero
              : nextValues.formatoNumero,
          fechaInicio:
            updateData.fechaInicio !== undefined
              ? updateData.fechaInicio
              : nextValues.fechaInicio || null,
          fechaFin:
            updateData.fechaFin !== undefined
              ? updateData.fechaFin
              : nextValues.fechaFin || null,
        },
      });
    }

    try {
      const result = await updateIndicador(indicador.id, updateData);
      if (!result.success) {
        justSavedRef.current = false;
        setValues(previousValues);
        setFieldDraft(previousValues);
        setEditingField(editingField);
        setShowSuccessToast(false);
        alert(`Error al guardar: ${result.error}`);
      }
    } catch (error) {
      justSavedRef.current = false;
      setValues(previousValues);
      setFieldDraft(previousValues);
      setEditingField(editingField);
      setShowSuccessToast(false);
      alert(
        `Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    } finally {
      setIsSavingField(false);
    }
  };

  const parseValue = (value: string): number => {
    if (!value || value === '') return 0;
    const cleaned = value
      .toString()
      .replace(/%/g, '')
      .replace(/,/g, '.')
      .trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatResultado = (
    value: string,
    formato: string | null | undefined
  ): string => {
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

  const resultadoEsperadoNum = parseValue(values.resultadoEsperado);
  const resultadoAlcanzadoNum = parseValue(values.resultadoAlcanzado);

  let porcentajeCumplimiento = 0;
  if (resultadoEsperadoNum > 0) {
    porcentajeCumplimiento =
      (resultadoAlcanzadoNum / resultadoEsperadoNum) * 100;
  } else if (resultadoAlcanzadoNum > 0) {
    porcentajeCumplimiento = 100;
  }

  let colorEstado = '';
  if (porcentajeCumplimiento < 50) {
    colorEstado = 'text-red-600';
  } else if (porcentajeCumplimiento >= 50 && porcentajeCumplimiento < 100) {
    colorEstado = 'text-yellow-600';
  } else {
    colorEstado = 'text-emerald-600';
  }

  const resultadoEsperadoFormateado = formatResultado(
    values.resultadoEsperado,
    values.formatoNumero
  );
  const resultadoAlcanzadoFormateado = formatResultado(
    values.resultadoAlcanzado,
    values.formatoNumero
  );

  const body = (
    <>
        {/* Header con título e indicador de cumplimiento */}
        <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50/90 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-2 min-w-0">
              {editingField === 'nombre' ? (
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <input
                    type="text"
                    value={fieldDraft.nombre}
                    onChange={(e) =>
                      setFieldDraft({ ...fieldDraft, nombre: e.target.value })
                    }
                    className="h-auto border border-gray-200 bg-white py-1.5 text-2xl font-semibold text-gray-900 shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 rounded-md w-full min-w-0 px-3"
                    autoFocus
                  />
                  <ActivityFieldSaveCancel
                    isSaving={isSavingField}
                    onSave={handleSaveField}
                    onCancel={handleCancelFieldEdit}
                  />
                </div>
              ) : (
                <div className="group/field relative min-w-0 max-w-full pr-8">
                  <DialogTitle className="m-0 text-2xl font-semibold text-gray-900 truncate">
                    {values.nombre}
                  </DialogTitle>
                  {canEdit && (
                    <ActivityHoverEditButton
                      onClick={() => handleStartFieldEdit('nombre')}
                      tooltip="Editar nombre"
                    />
                  )}
                </div>
              )}
            </div>
            {editingField !== 'nombre' && (
              <div className="flex items-center space-x-4 flex-shrink-0 pr-2">
                <span className="text-base font-medium text-gray-700">
                  Cumplimiento
                </span>
                <div className="w-64 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      porcentajeCumplimiento < 50
                        ? 'bg-red-500'
                        : porcentajeCumplimiento < 100
                          ? 'bg-yellow-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(porcentajeCumplimiento, 100)}%`,
                    }}
                  />
                </div>
                <span
                  className={`text-2xl font-bold min-w-[4rem] tabular-nums ${colorEstado}`}
                >
                  {Math.round(porcentajeCumplimiento)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Layout de tres columnas (igual que actividad) */}
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-6 px-5 py-4 flex-1 min-h-0 overflow-hidden">
          {/* COLUMNA IZQUIERDA: Descripción, Período, Evidencias */}
          <div className="space-y-14 overflow-y-auto border-r border-gray-100 pr-6 min-h-0 custom-scrollbar">
            <div>
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                Descripción
              </h3>
              {editingField === 'descripcion' ? (
                <div className="min-w-0">
                  <textarea
                    value={fieldDraft.descripcion}
                    onChange={(e) =>
                      setFieldDraft({
                        ...fieldDraft,
                        descripcion: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 min-h-[110px] resize-y text-[13px] text-gray-800"
                    rows={3}
                    autoFocus
                  />
                  <ActivityFieldSaveCancel
                    isSaving={isSavingField}
                    onSave={handleSaveField}
                    onCancel={handleCancelFieldEdit}
                  />
                </div>
              ) : (
                <div className="group/field relative min-w-0 pr-8">
                  <p className="text-[15px] leading-[1.75] text-gray-800 break-words [overflow-wrap:anywhere]">
                    {values.descripcion || 'Sin descripción'}
                  </p>
                  {canEdit && (
                    <ActivityHoverEditButton
                      onClick={() => handleStartFieldEdit('descripcion')}
                      tooltip="Editar descripción"
                    />
                  )}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                Período
              </h3>
              {editingField === 'fechas' ? (
                <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50/40 p-4">
                  <div className="flex items-center space-x-6 flex-wrap gap-y-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900">
                        Inicio
                      </span>
                      <input
                        type="date"
                        value={fieldDraft.fechaInicio}
                        onChange={(e) =>
                          setFieldDraft({
                            ...fieldDraft,
                            fechaInicio: e.target.value,
                          })
                        }
                        className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 text-[13px] text-gray-800"
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900">
                        Finalización
                      </span>
                      <input
                        type="date"
                        value={fieldDraft.fechaFin}
                        onChange={(e) =>
                          setFieldDraft({
                            ...fieldDraft,
                            fechaFin: e.target.value,
                          })
                        }
                        className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 text-[13px] text-gray-800"
                      />
                    </div>
                  </div>
                  <ActivityFieldSaveCancel
                    isSaving={isSavingField}
                    onSave={handleSaveField}
                    onCancel={handleCancelFieldEdit}
                  />
                </div>
              ) : (
                <div className="group/field relative rounded-lg border border-gray-200 bg-gray-50/40 p-4 pr-10">
                  {values.fechaInicio || values.fechaFin ? (
                    <PeriodTimeline
                      startDate={values.fechaInicio || undefined}
                      endDate={values.fechaFin || undefined}
                    />
                  ) : (
                    <p className="text-[13px] text-gray-400">
                      Sin período definido
                    </p>
                  )}
                  {canEdit && (
                    <ActivityHoverEditButton
                      onClick={() => handleStartFieldEdit('fechas')}
                      tooltip="Editar fechas"
                    />
                  )}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                Evidencias
              </h3>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                {isLoadingEvidencias ? (
                  <p className="text-[13px] text-gray-400">
                    Cargando evidencias...
                  </p>
                ) : evidenciasIndicador.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/40 px-3 py-4">
                    <p className="text-[13px] text-gray-400">
                      No se han cargado evidencias
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {evidenciasIndicador.map((ev) => (
                      <div
                        key={ev.id}
                        className="relative group rounded-lg border border-gray-200 bg-white overflow-hidden shadow-none"
                      >
                        {ev.tipo === 'image' ? (
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block aspect-video"
                          >
                            <img
                              src={ev.url}
                              alt={ev.nombreArchivo ?? 'Evidencia'}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ) : (
                          <div className="flex flex-col items-center justify-center aspect-video p-4 text-red-600">
                            <a
                              href={ev.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-col items-center hover:bg-red-50 rounded transition-colors flex-1 w-full justify-center"
                              title="Abrir PDF en nueva pestaña"
                            >
                              <FileText className="h-10 w-10 mb-1" />
                              <span className="text-xs font-medium text-center truncate w-full">
                                {ev.nombreArchivo ?? 'Documento PDF'}
                              </span>
                            </a>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const filename =
                                  ev.nombreArchivo || 'documento.pdf';
                                const apiUrl = `/api/evidencia-download?url=${encodeURIComponent(ev.url)}&filename=${encodeURIComponent(filename)}`;
                                try {
                                  const res = await fetch(apiUrl);
                                  if (!res.ok) {
                                    const text = await res.text();
                                    alert(
                                      text || 'No se pudo descargar el PDF.'
                                    );
                                    return;
                                  }
                                  const blob = await res.blob();
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = filename
                                    .toLowerCase()
                                    .endsWith('.pdf')
                                    ? filename
                                    : `${filename}.pdf`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                } catch {
                                  alert(
                                    'Error de conexión al descargar el PDF.'
                                  );
                                }
                              }}
                              className="mt-2 text-xs underline hover:no-underline text-red-700"
                            >
                              Descargar
                            </button>
                          </div>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm('¿Eliminar esta evidencia?')) return;
                              const res = await deleteEvidenciaIndicador(ev.id);
                              if (res.success) {
                                setEvidenciasIndicador((prev) =>
                                  prev.filter((e) => e.id !== ev.id)
                                );
                              } else {
                                alert(res.error ?? 'Error al eliminar');
                              }
                            }}
                            className="absolute top-1 right-1 p-1 rounded-sm bg-white/90 border border-gray-200 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity"
                            title="Eliminar evidencia"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3">
                  <input
                    ref={evidenciasFileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsUploadingEvidencia(true);
                      const result = await uploadEvidenciaFile(file);
                      if ('error' in result) {
                        alert(result.error);
                        setIsUploadingEvidencia(false);
                        e.target.value = '';
                        return;
                      }
                      const createResult = await createEvidenciaIndicador(
                        indicador.id,
                        {
                          url: result.url,
                          publicId: result.publicId,
                          tipo: result.tipo,
                          nombreArchivo: result.nombreArchivo,
                        }
                      );
                      if (createResult.success && createResult.data) {
                        setEvidenciasIndicador((prev) => [
                          ...prev,
                          createResult.data!,
                        ]);
                      } else {
                        alert(
                          createResult.error ?? 'Error al guardar evidencia'
                        );
                      }
                      setIsUploadingEvidencia(false);
                      e.target.value = '';
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="inline-flex w-full items-center justify-center gap-1.5 text-[13px] font-normal text-gray-900 hover:text-emerald-700 hover:bg-transparent transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm border border-dashed border-gray-200 bg-gray-50/40 py-2.5 h-auto"
                    disabled={isUploadingEvidencia}
                    onClick={() => evidenciasFileInputRef.current?.click()}
                  >
                    {isUploadingEvidencia ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Paperclip className="h-3.5 w-3.5" strokeWidth={2} />
                        Agregar evidencia (JPG o PDF)
                      </>
                    )}
                  </Button>
                  <p className="text-[12px] text-gray-400 mt-1">
                    Imágenes máx. 250 KB (se comprimen automáticamente). PDF
                    máx. 2 MB.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA CENTRO: Forma de cálculo, formato, resultados */}
          <div className="flex flex-col min-h-0 overflow-y-auto space-y-14 custom-scrollbar">
            <div>
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                Forma de Cálculo
              </h3>
              {editingField === 'formaCalculo' ? (
                <div className="min-w-0">
                  <textarea
                    value={fieldDraft.formaCalculo}
                    onChange={(e) =>
                      setFieldDraft({
                        ...fieldDraft,
                        formaCalculo: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 min-h-[110px] resize-y text-[13px] text-gray-800"
                    rows={3}
                    autoFocus
                  />
                  <ActivityFieldSaveCancel
                    isSaving={isSavingField}
                    onSave={handleSaveField}
                    onCancel={handleCancelFieldEdit}
                  />
                </div>
              ) : (
                <div className="group/field relative min-w-0 pr-8">
                  <p className="text-[15px] leading-[1.75] text-gray-800 break-words [overflow-wrap:anywhere]">
                    {values.formaCalculo || 'Sin forma de cálculo'}
                  </p>
                  {canEdit && (
                    <ActivityHoverEditButton
                      onClick={() => handleStartFieldEdit('formaCalculo')}
                      tooltip="Editar forma de cálculo"
                    />
                  )}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                Formato del número
              </h3>
              {editingField === 'formatoNumero' ? (
                <div className="min-w-0">
                  <select
                    value={fieldDraft.formatoNumero}
                    onChange={(e) =>
                      setFieldDraft({
                        ...fieldDraft,
                        formatoNumero: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 text-[13px] text-gray-800"
                    autoFocus
                  >
                    {['Porcentaje', 'Número Entero', 'Número Decimal'].map(
                      (option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      )
                    )}
                  </select>
                  <ActivityFieldSaveCancel
                    isSaving={isSavingField}
                    onSave={handleSaveField}
                    onCancel={handleCancelFieldEdit}
                  />
                </div>
              ) : (
                <div className="group/field relative min-w-0 pr-8">
                  <p className="text-[15px] leading-[1.75] text-gray-800">
                    {values.formatoNumero}
                  </p>
                  {canEdit && (
                    <ActivityHoverEditButton
                      onClick={() => handleStartFieldEdit('formatoNumero')}
                      tooltip="Editar formato"
                    />
                  )}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                Resultados
              </h3>

              <div className="flex items-center rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex-1 flex flex-col items-center py-1.5">
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-1">
                    Esperado
                  </span>
                  {editingField === 'resultadoEsperado' ? (
                    <div className="w-full max-w-[200px] flex flex-col items-center">
                      <input
                        type="text"
                        value={fieldDraft.resultadoEsperado}
                        onChange={(e) =>
                          setFieldDraft({
                            ...fieldDraft,
                            resultadoEsperado: e.target.value,
                          })
                        }
                        className="w-full max-w-[160px] px-3 py-2 border border-gray-200 rounded-lg bg-white shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 text-[15px] font-semibold text-center text-gray-800"
                        autoFocus
                      />
                      <ActivityFieldSaveCancel
                        isSaving={isSavingField}
                        onSave={handleSaveField}
                        onCancel={handleCancelFieldEdit}
                      />
                    </div>
                  ) : (
                    <div className="group/field relative inline-flex items-center pr-8">
                      <p className="text-[15px] font-semibold text-gray-800">
                        {resultadoEsperadoFormateado}
                      </p>
                      {canEdit && (
                        <ActivityHoverEditButton
                          onClick={() =>
                            handleStartFieldEdit('resultadoEsperado')
                          }
                          tooltip="Editar resultado esperado"
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="w-px h-10 bg-gray-100 self-center"></div>

                <div className="flex-1 flex flex-col items-center py-1.5">
                  <span
                    className={`text-xs font-medium uppercase tracking-[0.14em] mb-1 ${colorEstado}`}
                  >
                    Actual
                  </span>
                  {editingField === 'resultadoAlcanzado' ? (
                    <div className="w-full max-w-[200px] flex flex-col items-center">
                      <input
                        type="text"
                        value={fieldDraft.resultadoAlcanzado}
                        onChange={(e) =>
                          setFieldDraft({
                            ...fieldDraft,
                            resultadoAlcanzado: e.target.value,
                          })
                        }
                        className="w-full max-w-[160px] px-3 py-2 border border-gray-200 rounded-lg bg-white shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 text-[15px] font-semibold text-center text-gray-800"
                        autoFocus
                      />
                      <ActivityFieldSaveCancel
                        isSaving={isSavingField}
                        onSave={handleSaveField}
                        onCancel={handleCancelFieldEdit}
                      />
                    </div>
                  ) : (
                    <div className="group/field relative inline-flex items-center pr-8">
                      <p className={`text-[15px] font-semibold ${colorEstado}`}>
                        {resultadoAlcanzadoFormateado}
                      </p>
                      {canEdit && (
                        <ActivityHoverEditButton
                          onClick={() =>
                            handleStartFieldEdit('resultadoAlcanzado')
                          }
                          tooltip="Editar resultado actual"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: Comentarios */}
          <div
            ref={comentariosContainerRef}
            className="flex flex-col min-h-0 border-l border-gray-100 pl-6"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4 flex-shrink-0">
              <MessageSquare
                className="h-3.5 w-3.5 text-gray-500"
                strokeWidth={2}
              />
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900">
                Comentarios
              </h3>
            </div>

            <div
              ref={comentariosListRef}
              className="space-y-3 flex-1 overflow-y-auto mb-4 min-h-0 custom-scrollbar"
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
                      <div className="flex items-center space-x-2 mb-2 flex-wrap">
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

        {showSuccessToast && (
          <div className="fixed bottom-6 right-6 border border-emerald-200 bg-white text-emerald-700 px-6 py-3 rounded-lg shadow-md flex items-center gap-2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Check className="h-4 w-4" />
            <span className="text-[13px] font-medium">Guardado con éxito</span>
          </div>
        )}
    </>
  );

  if (!wrapInDialog) {
    return body;
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        ref={dialogContentRef}
        closeButtonPosition="outside-top-right"
        className="w-[85vw] max-w-[85vw] h-[85vh] gap-0 overflow-hidden flex flex-col border border-gray-200 bg-white p-0 shadow-md sm:rounded-lg"
      >
        {body}
      </DialogContent>
    </Dialog>
  );
}

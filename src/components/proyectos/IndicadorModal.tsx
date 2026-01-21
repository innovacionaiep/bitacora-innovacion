'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { FileText, Calculator, Hash, Edit2, Check } from 'lucide-react';
import { useState, useEffect, useRef, memo } from 'react';
import { updateIndicador } from '@/lib/actions/indicadores';

// Componente EditableField movido fuera para evitar recreaciones
const EditableFieldComponent = memo(({ 
  label, 
  value, 
  field, 
  icon: Icon,
  type = 'text',
  options,
  isEditing,
  onEdit,
  onCancel,
  editValue,
  onValueChange
}: { 
  label: string; 
  value: string; 
  field: string; 
  icon: any;
  type?: 'text' | 'select' | 'textarea';
  options?: string[];
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  editValue: string;
  onValueChange: (value: string) => void;
}) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">{label}</h3>
        </div>
        {!isEditing ? (
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Editar"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={onCancel}
            className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
      {isEditing ? (
        type === 'select' ? (
          <select
            value={editValue}
            onChange={(e) => onValueChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          >
            {options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            value={editValue}
            onChange={(e) => onValueChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-y"
            autoFocus
            rows={4}
          />
        ) : (
          <input
            type="text"
            value={editValue}
            onChange={(e) => onValueChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        )
      ) : (
        <p className="text-gray-700 text-sm pl-7 whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
});

EditableFieldComponent.displayName = 'EditableFieldComponent';

interface IndicadorModalProps {
  indicador: {
    id: string;
    nombre: string;
    descripcion: string;
    formaCalculo: string;
    resultadoEsperado: string;
    resultadoAlcanzado: string;
    formatoNumero?: string | null;
  };
  onClose: () => void;
  onUpdate?: () => Promise<void>;
}

export function IndicadorModal({ indicador, onClose, onUpdate }: IndicadorModalProps) {
  const [editingFields, setEditingFields] = useState<Set<string>>(new Set());
  const [editValues, setEditValues] = useState({
    descripcion: indicador.descripcion,
    formaCalculo: indicador.formaCalculo,
    formatoNumero: indicador.formatoNumero ?? 'Porcentaje',
    resultadoEsperado: indicador.resultadoEsperado,
    resultadoAlcanzado: indicador.resultadoAlcanzado,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const lastIndicadorIdRef = useRef<string>(indicador.id);
  const justSavedRef = useRef<boolean>(false);

  // Actualizar editValues solo cuando cambia el ID del indicador (nuevo indicador seleccionado)
  useEffect(() => {
    // Solo actualizar si cambió el ID del indicador (nuevo indicador seleccionado)
    if (indicador.id !== lastIndicadorIdRef.current) {
      lastIndicadorIdRef.current = indicador.id;
      setEditValues({
        descripcion: indicador.descripcion,
        formaCalculo: indicador.formaCalculo,
        formatoNumero: indicador.formatoNumero ?? 'Porcentaje',
        resultadoEsperado: indicador.resultadoEsperado,
        resultadoAlcanzado: indicador.resultadoAlcanzado,
      });
      setEditingFields(new Set());
    }
  }, [indicador.id]); // Solo dependemos del ID para evitar re-renders durante la edición

  // Actualizar valores después de guardar (cuando no hay campos en edición)
  // Este efecto se ejecuta cuando editingFields.size cambia a 0 o cuando el prop indicador cambia
  useEffect(() => {
    // Solo actualizar si no hay campos en edición y es el mismo indicador
    // Esto evita actualizaciones mientras el usuario está escribiendo
    if (editingFields.size === 0 && indicador.id === lastIndicadorIdRef.current) {
      const newValues = {
        descripcion: indicador.descripcion,
        formaCalculo: indicador.formaCalculo,
        formatoNumero: indicador.formatoNumero ?? 'Porcentaje',
        resultadoEsperado: indicador.resultadoEsperado,
        resultadoAlcanzado: indicador.resultadoAlcanzado,
      };
      
      // Si acabamos de guardar, verificar si el prop ya tiene los valores nuevos
      // Si los valores del prop coinciden con los valores locales, significa que el prop se actualizó
      if (justSavedRef.current) {
        const propMatchesLocal = 
          newValues.descripcion === editValues.descripcion &&
          newValues.formaCalculo === editValues.formaCalculo &&
          newValues.formatoNumero === editValues.formatoNumero &&
          newValues.resultadoEsperado === editValues.resultadoEsperado &&
          newValues.resultadoAlcanzado === editValues.resultadoAlcanzado;
        
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
        editValues.descripcion !== newValues.descripcion ||
        editValues.formaCalculo !== newValues.formaCalculo ||
        editValues.formatoNumero !== newValues.formatoNumero ||
        editValues.resultadoEsperado !== newValues.resultadoEsperado ||
        editValues.resultadoAlcanzado !== newValues.resultadoAlcanzado
      ) {
        setEditValues(newValues);
      }
    }
  }, [editingFields.size, indicador.resultadoAlcanzado, indicador.resultadoEsperado, indicador.descripcion, indicador.formaCalculo, indicador.formatoNumero]); // Depender también de los valores del prop para detectar actualizaciones

  // Ocultar toast después de 3 segundos
  useEffect(() => {
    if (showSuccessToast) {
      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessToast]);

  const handleEdit = (field: string) => {
    setEditingFields(new Set(editingFields).add(field));
  };

  const handleCancelEdit = (field: string) => {
    const newEditingFields = new Set(editingFields);
    newEditingFields.delete(field);
    setEditingFields(newEditingFields);
    // Restaurar el valor original
    const originalValue = indicador[field as keyof typeof indicador] ?? 
      (field === 'formatoNumero' ? 'Porcentaje' : 
       field === 'descripcion' ? indicador.descripcion :
       field === 'formaCalculo' ? indicador.formaCalculo :
       '');
    setEditValues({
      ...editValues,
      [field]: originalValue,
    });
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // Preparar los datos a actualizar (solo los campos que han sido editados)
      const updateData: any = {};
      
      // Verificar qué campos han cambiado
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

      // Si no hay cambios, no hacer nada
      if (Object.keys(updateData).length === 0) {
        setIsSaving(false);
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
        
        setEditingFields(new Set());
        setShowSuccessToast(true);
        
        // Refrescar los datos después de guardar exitosamente
        if (onUpdate) {
          await onUpdate();
        }
        // Los valores se actualizarán automáticamente cuando el prop indicador cambie
        // gracias al useEffect que maneja las actualizaciones cuando no hay campos en edición
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
    setEditingFields(new Set());
    setEditValues({
      descripcion: indicador.descripcion,
      formaCalculo: indicador.formaCalculo,
      formatoNumero: indicador.formatoNumero ?? 'Porcentaje',
      resultadoEsperado: indicador.resultadoEsperado,
      resultadoAlcanzado: indicador.resultadoAlcanzado,
    });
  };

  const hasChanges = () => {
    return editValues.descripcion !== indicador.descripcion ||
           editValues.formaCalculo !== indicador.formaCalculo ||
           editValues.formatoNumero !== (indicador.formatoNumero ?? 'Porcentaje') ||
           editValues.resultadoEsperado !== indicador.resultadoEsperado ||
           editValues.resultadoAlcanzado !== indicador.resultadoAlcanzado;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {indicador.nombre}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Descripción */}
          <EditableFieldComponent
            label="Descripción"
            value={editValues.descripcion}
            field="descripcion"
            icon={FileText}
            type="textarea"
            isEditing={editingFields.has('descripcion')}
            onEdit={() => handleEdit('descripcion')}
            onCancel={() => handleCancelEdit('descripcion')}
            editValue={editValues.descripcion}
            onValueChange={(value) => setEditValues({ ...editValues, descripcion: value })}
          />

          {/* Forma de Cálculo */}
          <EditableFieldComponent
            label="Forma de Cálculo"
            value={editValues.formaCalculo}
            field="formaCalculo"
            icon={Calculator}
            type="textarea"
            isEditing={editingFields.has('formaCalculo')}
            onEdit={() => handleEdit('formaCalculo')}
            onCancel={() => handleCancelEdit('formaCalculo')}
            editValue={editValues.formaCalculo}
            onValueChange={(value) => setEditValues({ ...editValues, formaCalculo: value })}
          />

          {/* Formato del Número */}
          <EditableFieldComponent
            label="Formato del número"
            value={editValues.formatoNumero}
            field="formatoNumero"
            icon={Hash}
            type="select"
            options={['Porcentaje', 'Número Entero', 'Número Decimal']}
            isEditing={editingFields.has('formatoNumero')}
            onEdit={() => handleEdit('formatoNumero')}
            onCancel={() => handleCancelEdit('formatoNumero')}
            editValue={editValues.formatoNumero}
            onValueChange={(value) => setEditValues({ ...editValues, formatoNumero: value })}
          />

          {/* Resultado Esperado */}
          <EditableFieldComponent
            label="Resultado esperado"
            value={editValues.resultadoEsperado}
            field="resultadoEsperado"
            icon={Calculator}
            isEditing={editingFields.has('resultadoEsperado')}
            onEdit={() => handleEdit('resultadoEsperado')}
            onCancel={() => handleCancelEdit('resultadoEsperado')}
            editValue={editValues.resultadoEsperado}
            onValueChange={(value) => setEditValues({ ...editValues, resultadoEsperado: value })}
          />

          {/* Resultado Actual */}
          <EditableFieldComponent
            label="Resultado actual"
            value={editValues.resultadoAlcanzado}
            field="resultadoAlcanzado"
            icon={Calculator}
            isEditing={editingFields.has('resultadoAlcanzado')}
            onEdit={() => handleEdit('resultadoAlcanzado')}
            onCancel={() => handleCancelEdit('resultadoAlcanzado')}
            editValue={editValues.resultadoAlcanzado}
            onValueChange={(value) => setEditValues({ ...editValues, resultadoAlcanzado: value })}
          />
        </div>

        {/* Toast de éxito */}
        {showSuccessToast && (
          <div className="fixed bottom-4 right-4 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Check className="h-5 w-5" />
            <span className="font-semibold">Guardado con éxito</span>
          </div>
        )}

        {/* Footer con botones de guardar y cancelar */}
        {(editingFields.size > 0 || hasChanges()) && (
          <DialogFooter className="mt-6">
            <button
              onClick={handleCancelAll}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveAll}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              disabled={isSaving || !hasChanges()}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Guardar cambios</span>
                </>
              )}
            </button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

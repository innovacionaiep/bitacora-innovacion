'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FileText, Calculator } from 'lucide-react';

interface IndicadorModalProps {
  indicador: {
    nombre: string;
    descripcion: string;
    formaCalculo: string;
  };
  onClose: () => void;
}

export function IndicadorModal({ indicador, onClose }: IndicadorModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {indicador.nombre}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Descripción */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold text-gray-900">Descripción</h3>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed pl-7">
              {indicador.descripcion}
            </p>
          </div>

          {/* Forma de Cálculo */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Forma de Cálculo</h3>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed pl-7 bg-gray-50 p-3 rounded-lg border border-gray-200">
              {indicador.formaCalculo}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

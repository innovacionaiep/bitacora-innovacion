'use client';

import { Card, CardContent } from '@/components/ui/card';
import { FileText, Target } from 'lucide-react';

interface ObjetivoItem {
  id: string;
  tipo: 'General' | 'Especifico';
  descripcion: string;
  orden: number;
}

interface ObjetivosCardProps {
  objetivos?: ObjetivoItem[];
}

export function ObjetivosCard({ objetivos = [] }: ObjetivosCardProps) {
  const objetivoGeneral = objetivos.find(obj => obj.tipo === 'General');
  const objetivosEspecificos = objetivos
    .filter(obj => obj.tipo === 'Especifico')
    .sort((a, b) => a.orden - b.orden);

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-center space-x-2 mb-3">
          <FileText className="h-5 w-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            OBJETIVOS DEL PROYECTO
          </h3>
        </div>

        <div className="space-y-4 flex-1">
          {/* Objetivo General */}
          {objetivoGeneral && (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-4 w-4 text-blue-600" />
                <h4 className="font-semibold text-gray-900">OBJETIVO GENERAL</h4>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-gray-700 leading-relaxed text-sm">
                  {objetivoGeneral.descripcion}
                </p>
              </div>
            </div>
          )}

          {/* Objetivos Específicos */}
          {objetivosEspecificos.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-4 w-4 text-green-600" />
                <h4 className="font-semibold text-gray-900">OBJETIVOS ESPECÍFICOS</h4>
              </div>
              <div className="space-y-2">
                {objetivosEspecificos.map((objetivo, index) => (
                  <div key={objetivo.id} className="flex items-start space-x-2">
                    <div className="flex-shrink-0 w-5 h-5 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </div>
                    <p className="text-gray-700 leading-relaxed flex-1 text-sm">
                      {objetivo.descripcion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {objetivos.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No hay objetivos definidos para este proyecto</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

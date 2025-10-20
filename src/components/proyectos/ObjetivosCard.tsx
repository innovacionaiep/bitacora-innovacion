'use client';

import { Card, CardContent } from '@/components/ui/card';
import { FileText, Target, Crosshair, ListChecks } from 'lucide-react';

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
    <Card className="h-full flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
        <div className="bg-gray-100 px-4 py-3 rounded-t-lg">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-gray-600" />
            <h3 className="text-base font-semibold text-gray-600 uppercase tracking-wide">
              Objetivos del Proyecto
            </h3>
          </div>
        </div>

        <div className="p-6 space-y-12 flex-1 overflow-auto custom-scrollbar">
          {/* Objetivo General */}
          {objetivoGeneral && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2.5">
                <Crosshair className="h-5 w-5 text-emerald-600" />
                <h4 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                  Objetivo General
                </h4>
              </div>
              <div className="border-l-4 border-emerald-600 bg-gradient-to-r from-emerald-50 via-white to-gray-50 rounded-r-lg shadow-md hover:shadow-lg transition-shadow duration-200">
                <div className="py-6 px-6">
                  <p className="text-gray-800 leading-loose text-lg">
                    {objetivoGeneral.descripcion}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Objetivos Específicos */}
          {objetivosEspecificos.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2.5">
                <ListChecks className="h-5 w-5 text-emerald-600" />
                <h4 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                  Objetivos Específicos
                </h4>
              </div>
              <div className="ml-8 space-y-6">
                {objetivosEspecificos.map((objetivo, index) => (
                  <div 
                    key={objetivo.id} 
                    className="flex items-start space-x-4"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                      {index + 1}
                    </div>
                    <p className="text-gray-800 leading-relaxed flex-1 text-base pt-0.5">
                      {objetivo.descripcion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {objetivos.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-base">No hay objetivos definidos para este proyecto</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

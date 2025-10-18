'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, GraduationCap, Building, Target } from 'lucide-react';

interface ProjectInfoCardProps {
  sede: string;
  escuelas?: Array<{ escuela: { nombre: string } }>;
  carreras?: Array<{ carrera: { nombre: string } }>;
  comunas?: Array<{ comuna: { nombre: string; region: string } }>;
  focalizacion?: string | null;
}

export function ProjectInfoCard({
  sede,
  escuelas,
  carreras,
  comunas,
  focalizacion,
}: ProjectInfoCardProps) {
  const getFocalizacionColor = (focalizacion?: string | null) => {
    switch (focalizacion) {
      case 'Social':
        return 'bg-green-100 text-green-800';
      case 'Productiva':
        return 'bg-blue-100 text-blue-800';
      case 'Ambiental':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3 text-gray-900">
          INFORMACIÓN
        </h3>
        <div className="space-y-3">
          {/* Sede */}
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Sede:</span>
            <span className="text-sm text-gray-900">{sede}</span>
          </div>

          {/* Focalización */}
          {focalizacion && (
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Focalización:</span>
              <Badge className={getFocalizacionColor(focalizacion)}>
                {focalizacion}
              </Badge>
            </div>
          )}

          {/* Escuelas */}
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <GraduationCap className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Escuelas:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {escuelas?.map((item, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {item.escuela.nombre}
                </Badge>
              )) || (
                <p className="text-sm text-gray-500 italic">No hay escuelas asignadas</p>
              )}
            </div>
          </div>

          {/* Carreras */}
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Building className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Carreras:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {carreras?.map((item, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {item.carrera.nombre}
                </Badge>
              )) || (
                <p className="text-sm text-gray-500 italic">No hay carreras asignadas</p>
              )}
            </div>
          </div>

          {/* Comunas */}
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Comunas:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {comunas?.map((item, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {item.comuna.nombre}
                </Badge>
              )) || (
                <p className="text-sm text-gray-500 italic">No hay comunas asignadas</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, GraduationCap, Building, Users, Handshake, Info } from 'lucide-react';

interface ProjectInfoCardProps {
  sede: string;
  escuelas?: Array<{ escuela: { nombre: string } }>;
  carreras?: Array<{ carrera: { nombre: string } }>;
  comunas?: Array<{ comuna: { nombre: string; region: string } }>;
  gruposInteres?: Array<{ grupoInteres: { nombre: string } }>;
  sociosComunitarios?: Array<{ socioComunitario: { nombre: string } }>;
}

export function ProjectInfoCard({
  sede,
  escuelas,
  carreras,
  comunas,
  gruposInteres,
  sociosComunitarios,
}: ProjectInfoCardProps) {

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardContent className="p-0">
        <div className="bg-gray-100 px-4 py-3 rounded-t-lg">
          <div className="flex items-center space-x-2">
            <Info className="h-5 w-5 text-gray-700" />
            <h3 className="text-base font-bold text-gray-700 uppercase tracking-wide">
              Información General
            </h3>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {/* Sede */}
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Sede:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">
                {sede}
              </Badge>
            </div>
          </div>

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
                <Badge key={index} variant="secondary" className="text-xs">
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
                <Badge key={index} variant="secondary" className="text-xs">
                  {item.comuna.nombre}
                </Badge>
              )) || (
                <p className="text-sm text-gray-500 italic">No hay comunas asignadas</p>
              )}
            </div>
          </div>

          {/* Grupos de Interés */}
          {gruposInteres && gruposInteres.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Grupos de Interés:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {gruposInteres.map((item, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {item.grupoInteres.nombre}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Socios Comunitarios */}
          {sociosComunitarios && sociosComunitarios.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Handshake className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Socios Comunitarios:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {sociosComunitarios.map((item, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {item.socioComunitario.nombre}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Handshake } from 'lucide-react';

interface StakeholdersCardProps {
  gruposInteres?: Array<{
    grupoInteres: { nombre: string; descripcion?: string };
  }>;
  sociosComunitarios?: Array<{
    socioComunitario: { nombre: string; descripcion?: string };
  }>;
}

export function StakeholdersCard({
  gruposInteres,
  sociosComunitarios,
}: StakeholdersCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3 text-gray-900">
          GRUPOS DE INTERÉS Y SOCIOS
        </h3>

        <div className="space-y-4">
          {/* Grupos de Interés */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Users className="h-4 w-4 text-purple-600" />
              <h4 className="font-medium text-gray-900">Grupos de Interés</h4>
            </div>
            {gruposInteres && gruposInteres.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {gruposInteres.map((item, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-purple-100 text-purple-800 hover:bg-purple-200"
                  >
                    {item.grupoInteres.nombre}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No hay grupos de interés definidos
              </p>
            )}
          </div>

          {/* Socios Comunitarios */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Handshake className="h-4 w-4 text-orange-600" />
              <h4 className="font-medium text-gray-900">Socios Comunitarios</h4>
            </div>
            {sociosComunitarios && sociosComunitarios.length > 0 ? (
              <div className="space-y-2">
                {sociosComunitarios.map((item, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {item.socioComunitario.nombre}
                      </p>
                      {item.socioComunitario.descripcion && (
                        <p className="text-xs text-gray-500 mt-1">
                          {item.socioComunitario.descripcion}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No hay socios comunitarios definidos
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

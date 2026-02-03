'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mail, Plus, Edit, Trash2 } from 'lucide-react';

// Ver docs/SISTEMA-ROLES.md para documentación de roles
interface Participante {
  id: string;
  userId: string;
  rol:
    | 'Encargado'
    | 'Coordinador'
    | 'Colaborador'
    | 'Docente'
    | 'Estudiante'
    | 'Beneficiario';
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface EquipoCardProps {
  participantes?: Participante[];
  onAddParticipante?: () => void;
  onEditParticipante?: (participante: Participante) => void;
  onRemoveParticipante?: (participante: Participante) => void;
  canEdit?: boolean;
}

export function EquipoCard({
  participantes,
  onAddParticipante,
  onEditParticipante,
  onRemoveParticipante,
  canEdit = false,
}: EquipoCardProps) {
  // Colores según docs/SISTEMA-ROLES.md
  const getRolColor = (rol: string) => {
    switch (rol) {
      case 'Encargado':
        return 'bg-orange-100 text-orange-800';
      case 'Coordinador':
        return 'bg-blue-100 text-blue-800';
      case 'Colaborador':
        return 'bg-violet-100 text-violet-800';
      case 'Docente':
        return 'bg-green-100 text-green-800';
      case 'Estudiante':
        return 'bg-red-100 text-red-800';
      case 'Beneficiario':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRolIcon = (rol: string) => {
    switch (rol) {
      case 'Encargado':
        return '👑';
      case 'Coordinador':
        return '📋';
      case 'Colaborador':
        return '🤝';
      case 'Docente':
        return '👨‍🏫';
      case 'Estudiante':
        return '🎓';
      case 'Beneficiario':
        return '🎯';
      default:
        return '👤';
    }
  };

  const encargados = participantes?.filter((p) => p.rol === 'Encargado') || [];
  const coordinadores =
    participantes?.filter((p) => p.rol === 'Coordinador') || [];
  const colaboradores =
    participantes?.filter((p) => p.rol === 'Colaborador') || [];
  const docentes = participantes?.filter((p) => p.rol === 'Docente') || [];
  const estudiantes =
    participantes?.filter((p) => p.rol === 'Estudiante') || [];
  const beneficiarios =
    participantes?.filter((p) => p.rol === 'Beneficiario') || [];

  const renderParticipantes = (lista: Participante[], titulo: string) => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">{titulo}</h4>
        <span className="text-sm text-gray-500">({lista.length})</span>
      </div>
      {lista.length > 0 ? (
        <div className="space-y-2">
          {lista.map((participante) => (
            <div
              key={participante.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 bg-gray-300 rounded-full flex items-center justify-center text-sm">
                  {participante.user.image ? (
                    <img
                      src={participante.user.image}
                      alt={participante.user.name || 'Usuario'}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-3.5 w-3.5 text-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {participante.user.name || 'Sin nombre'}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-3 w-3 text-gray-400" />
                    <p className="text-xs text-gray-500 truncate">
                      {participante.user.email}
                    </p>
                  </div>
                </div>
                <Badge className={getRolColor(participante.rol)}>
                  {getRolIcon(participante.rol)} {participante.rol}
                </Badge>
              </div>
              {canEdit && (
                <div className="flex items-center space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEditParticipante?.(participante)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveParticipante?.(participante)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">
          No hay {titulo.toLowerCase()} asignados
        </p>
      )}
    </div>
  );

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">EQUIPO</h3>
          {canEdit && onAddParticipante && (
            <Button
              size="sm"
              onClick={onAddParticipante}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Agregar</span>
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {renderParticipantes(encargados, 'Encargados')}
          {renderParticipantes(coordinadores, 'Coordinadores')}
          {renderParticipantes(colaboradores, 'Colaboradores')}
          {renderParticipantes(docentes, 'Docentes')}
          {renderParticipantes(estudiantes, 'Estudiantes')}
          {renderParticipantes(beneficiarios, 'Beneficiarios')}
        </div>

        {(!participantes || participantes.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No hay miembros asignados al equipo</p>
            {canEdit && onAddParticipante && (
              <Button
                onClick={onAddParticipante}
                className="mt-4"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar primer miembro
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
